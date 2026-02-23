-- ============================================================
-- Migration 011: calculate_bid_scores RPC
-- ============================================================
-- SQL function that reads from V2 tables (bids, bid_equipment,
-- bid_scope, bid_contractors) and populates bid_scores with
-- calculated scores.
--
-- Called by mindpal-callback after all bid data is inserted.
-- Can also be called manually to recalculate scores.
-- ============================================================

CREATE OR REPLACE FUNCTION calculate_bid_scores(p_bid_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_bid RECORD;
  v_equipment RECORD;
  v_scope RECORD;
  v_contractor RECORD;
  v_project_bids RECORD;
  v_value_score DECIMAL(5,2) := 50;
  v_quality_score DECIMAL(5,2) := 50;
  v_completeness_score DECIMAL(5,2) := 50;
  v_overall_score DECIMAL(5,2);
  v_score_confidence DECIMAL(5,2) := 50;
  v_red_flags JSONB := '[]'::jsonb;
  v_positive_indicators JSONB := '[]'::jsonb;
  v_scoring_notes TEXT := '';
  v_ranking TEXT := 'fair';
  -- Price context
  v_avg_price DECIMAL;
  v_min_price DECIMAL;
  v_max_price DECIMAL;
  v_bid_count INT;
  -- Completeness tracking
  v_total_fields INT := 0;
  v_filled_fields INT := 0;
BEGIN
  -- ── Fetch bid data ──
  SELECT * INTO v_bid FROM bids WHERE id = p_bid_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bid not found: %', p_bid_id;
  END IF;

  -- ── Fetch related data ──
  SELECT * INTO v_scope FROM bid_scope WHERE bid_id = p_bid_id;
  SELECT * INTO v_contractor FROM bid_contractors WHERE bid_id = p_bid_id;

  -- Get primary equipment (highest capacity)
  SELECT * INTO v_equipment
  FROM bid_equipment
  WHERE bid_id = p_bid_id
    AND system_role IN ('primary_both', 'primary_heating', 'primary_cooling')
  ORDER BY capacity_tons DESC NULLS LAST
  LIMIT 1;

  -- If no primary equipment found, get any equipment
  IF NOT FOUND THEN
    SELECT * INTO v_equipment
    FROM bid_equipment
    WHERE bid_id = p_bid_id
    ORDER BY capacity_tons DESC NULLS LAST
    LIMIT 1;
  END IF;

  -- ── Price context (for relative scoring) ──
  SELECT
    COUNT(*),
    AVG(total_bid_amount),
    MIN(total_bid_amount),
    MAX(total_bid_amount)
  INTO v_bid_count, v_avg_price, v_min_price, v_max_price
  FROM bids
  WHERE project_id = v_bid.project_id
    AND total_bid_amount > 0;

  -- ═══════════════════════════════════════════
  -- VALUE SCORE (price relative to peers + warranty)
  -- ═══════════════════════════════════════════
  IF v_bid.total_bid_amount > 0 AND v_avg_price > 0 AND v_bid_count >= 2 THEN
    -- Price ratio: 1.0 = average, <1 = cheaper, >1 = more expensive
    DECLARE
      v_price_ratio DECIMAL;
    BEGIN
      v_price_ratio := v_bid.total_bid_amount / v_avg_price;
      -- Map ratio to 0-100 score: 0.8x avg → 80, 1.0x → 60, 1.2x → 40
      v_value_score := GREATEST(0, LEAST(100,
        60 + (1.0 - v_price_ratio) * 100
      ));
    END;

    -- Bonus for warranty coverage
    IF COALESCE(v_bid.labor_warranty_years, 0) >= 5 THEN
      v_value_score := LEAST(100, v_value_score + 5);
    END IF;
    IF COALESCE(v_bid.equipment_warranty_years, 0) >= 10 THEN
      v_value_score := LEAST(100, v_value_score + 5);
    END IF;
  ELSIF v_bid.total_bid_amount > 0 AND v_bid_count < 2 THEN
    -- Single bid: base value score on warranty and financing
    v_value_score := 50;
    IF COALESCE(v_bid.labor_warranty_years, 0) >= 5 THEN
      v_value_score := v_value_score + 10;
    END IF;
    IF v_bid.financing_offered THEN
      v_value_score := v_value_score + 5;
    END IF;
  END IF;

  -- Red flag: no price
  IF COALESCE(v_bid.total_bid_amount, 0) = 0 THEN
    v_red_flags := v_red_flags || jsonb_build_object(
      'issue', 'No total price found in bid',
      'severity', 'high',
      'detail', 'Cannot calculate value without pricing'
    );
    v_value_score := 20;
  END IF;

  -- ═══════════════════════════════════════════
  -- QUALITY SCORE (equipment efficiency + brand)
  -- ═══════════════════════════════════════════
  IF v_equipment IS NOT NULL THEN
    v_quality_score := 40; -- base

    -- SEER2 rating scoring
    IF COALESCE(v_equipment.seer2_rating, 0) >= 20 THEN
      v_quality_score := v_quality_score + 25;
      v_positive_indicators := v_positive_indicators || jsonb_build_object(
        'indicator', 'Excellent efficiency (SEER2 >= 20)',
        'detail', format('SEER2 rating: %s', v_equipment.seer2_rating)
      );
    ELSIF COALESCE(v_equipment.seer2_rating, v_equipment.seer_rating, 0) >= 16 THEN
      v_quality_score := v_quality_score + 15;
    ELSIF COALESCE(v_equipment.seer2_rating, v_equipment.seer_rating, 0) >= 14 THEN
      v_quality_score := v_quality_score + 5;
    END IF;

    -- HSPF2 rating scoring (heating efficiency)
    IF COALESCE(v_equipment.hspf2_rating, v_equipment.hspf_rating, 0) >= 10 THEN
      v_quality_score := LEAST(100, v_quality_score + 10);
    ELSIF COALESCE(v_equipment.hspf2_rating, v_equipment.hspf_rating, 0) >= 8.5 THEN
      v_quality_score := LEAST(100, v_quality_score + 5);
    END IF;

    -- Variable speed bonus
    IF v_equipment.variable_speed = true THEN
      v_quality_score := LEAST(100, v_quality_score + 10);
      v_positive_indicators := v_positive_indicators || jsonb_build_object(
        'indicator', 'Variable speed compressor',
        'detail', 'Better comfort and efficiency vs single-stage'
      );
    END IF;

    -- Energy Star bonus
    IF v_equipment.energy_star_certified = true THEN
      v_quality_score := LEAST(100, v_quality_score + 5);
    END IF;
    IF v_equipment.energy_star_most_efficient = true THEN
      v_quality_score := LEAST(100, v_quality_score + 5);
      v_positive_indicators := v_positive_indicators || jsonb_build_object(
        'indicator', 'ENERGY STAR Most Efficient',
        'detail', 'Top-tier efficiency certification'
      );
    END IF;
  ELSE
    -- No equipment found
    v_quality_score := 30;
    v_red_flags := v_red_flags || jsonb_build_object(
      'issue', 'No equipment specifications found',
      'severity', 'high',
      'detail', 'Cannot evaluate equipment quality without specifications'
    );
  END IF;

  -- ═══════════════════════════════════════════
  -- COMPLETENESS SCORE (how much data was extracted)
  -- ═══════════════════════════════════════════

  -- Core pricing fields
  v_total_fields := v_total_fields + 5;
  IF v_bid.total_bid_amount > 0 THEN v_filled_fields := v_filled_fields + 1; END IF;
  IF v_bid.labor_cost IS NOT NULL THEN v_filled_fields := v_filled_fields + 1; END IF;
  IF v_bid.equipment_cost IS NOT NULL THEN v_filled_fields := v_filled_fields + 1; END IF;
  IF v_bid.materials_cost IS NOT NULL THEN v_filled_fields := v_filled_fields + 1; END IF;
  IF v_bid.permit_cost IS NOT NULL THEN v_filled_fields := v_filled_fields + 1; END IF;

  -- Warranty fields
  v_total_fields := v_total_fields + 3;
  IF v_bid.labor_warranty_years IS NOT NULL THEN v_filled_fields := v_filled_fields + 1; END IF;
  IF v_bid.equipment_warranty_years IS NOT NULL THEN v_filled_fields := v_filled_fields + 1; END IF;
  IF v_bid.compressor_warranty_years IS NOT NULL THEN v_filled_fields := v_filled_fields + 1; END IF;

  -- Timeline
  v_total_fields := v_total_fields + 1;
  IF v_bid.estimated_days IS NOT NULL THEN v_filled_fields := v_filled_fields + 1; END IF;

  -- Contractor info
  v_total_fields := v_total_fields + 3;
  IF v_contractor IS NOT NULL THEN
    IF v_contractor.license IS NOT NULL THEN v_filled_fields := v_filled_fields + 1; END IF;
    IF v_contractor.phone IS NOT NULL THEN v_filled_fields := v_filled_fields + 1; END IF;
    IF v_contractor.email IS NOT NULL THEN v_filled_fields := v_filled_fields + 1; END IF;
  END IF;

  -- Equipment specs
  v_total_fields := v_total_fields + 4;
  IF v_equipment IS NOT NULL THEN
    IF v_equipment.model_number IS NOT NULL THEN v_filled_fields := v_filled_fields + 1; END IF;
    IF COALESCE(v_equipment.seer2_rating, v_equipment.seer_rating) IS NOT NULL THEN v_filled_fields := v_filled_fields + 1; END IF;
    IF v_equipment.capacity_tons IS NOT NULL OR v_equipment.capacity_btu IS NOT NULL THEN v_filled_fields := v_filled_fields + 1; END IF;
    IF v_equipment.brand IS NOT NULL AND v_equipment.brand != '' THEN v_filled_fields := v_filled_fields + 1; END IF;
  END IF;

  -- Scope fields
  v_total_fields := v_total_fields + 4;
  IF v_scope IS NOT NULL THEN
    IF v_scope.summary IS NOT NULL THEN v_filled_fields := v_filled_fields + 1; END IF;
    IF v_scope.inclusions IS NOT NULL AND array_length(v_scope.inclusions, 1) > 0 THEN v_filled_fields := v_filled_fields + 1; END IF;
    IF v_scope.exclusions IS NOT NULL AND array_length(v_scope.exclusions, 1) > 0 THEN v_filled_fields := v_filled_fields + 1; END IF;
    IF v_scope.permit_included IS NOT NULL THEN v_filled_fields := v_filled_fields + 1; END IF;
  END IF;

  -- Calculate completeness as percentage
  IF v_total_fields > 0 THEN
    v_completeness_score := ROUND((v_filled_fields::DECIMAL / v_total_fields) * 100, 2);
  END IF;

  -- Red flags for critical missing data
  IF v_scope IS NOT NULL AND v_scope.electrical_included IS NULL AND
     v_scope.panel_assessment_included IS NULL THEN
    v_red_flags := v_red_flags || jsonb_build_object(
      'issue', 'No electrical assessment information',
      'severity', 'medium',
      'detail', 'Ask contractor about panel capacity and electrical requirements'
    );
  END IF;

  IF v_bid.labor_warranty_years IS NULL AND v_bid.equipment_warranty_years IS NULL THEN
    v_red_flags := v_red_flags || jsonb_build_object(
      'issue', 'No warranty information found',
      'severity', 'medium',
      'detail', 'Ask contractor to confirm warranty terms in writing'
    );
  END IF;

  -- Positive indicators
  IF v_scope IS NOT NULL AND v_scope.manual_j_included = true THEN
    v_positive_indicators := v_positive_indicators || jsonb_build_object(
      'indicator', 'Manual J load calculation included',
      'detail', 'Proper sizing ensures efficiency and comfort'
    );
  END IF;

  IF v_contractor IS NOT NULL AND v_contractor.license IS NOT NULL THEN
    v_positive_indicators := v_positive_indicators || jsonb_build_object(
      'indicator', 'Licensed contractor',
      'detail', format('License: %s', v_contractor.license)
    );
  END IF;

  -- ═══════════════════════════════════════════
  -- OVERALL SCORE (weighted average)
  -- ═══════════════════════════════════════════
  -- Weights: value 35%, quality 30%, completeness 35%
  v_overall_score := ROUND(
    (v_value_score * 0.35) + (v_quality_score * 0.30) + (v_completeness_score * 0.35),
    2
  );

  -- Score confidence based on data availability
  v_score_confidence := v_completeness_score; -- directly correlated

  -- Ranking recommendation
  IF v_overall_score >= 80 THEN
    v_ranking := 'excellent';
  ELSIF v_overall_score >= 65 THEN
    v_ranking := 'good';
  ELSIF v_overall_score >= 45 THEN
    v_ranking := 'fair';
  ELSE
    v_ranking := 'poor';
  END IF;

  -- Build scoring notes
  v_scoring_notes := format(
    'Scores: value=%s quality=%s completeness=%s (fields: %s/%s). %s red flags, %s positive indicators.',
    v_value_score, v_quality_score, v_completeness_score,
    v_filled_fields, v_total_fields,
    jsonb_array_length(v_red_flags), jsonb_array_length(v_positive_indicators)
  );

  -- ── Upsert bid_scores row ──
  INSERT INTO bid_scores (
    bid_id,
    overall_score,
    value_score,
    quality_score,
    completeness_score,
    score_confidence,
    scoring_notes,
    ranking_recommendation,
    red_flags,
    positive_indicators
  ) VALUES (
    p_bid_id,
    v_overall_score,
    v_value_score,
    v_quality_score,
    v_completeness_score,
    v_score_confidence,
    v_scoring_notes,
    v_ranking,
    v_red_flags,
    v_positive_indicators
  )
  ON CONFLICT (bid_id)
  DO UPDATE SET
    overall_score = EXCLUDED.overall_score,
    value_score = EXCLUDED.value_score,
    quality_score = EXCLUDED.quality_score,
    completeness_score = EXCLUDED.completeness_score,
    score_confidence = EXCLUDED.score_confidence,
    scoring_notes = EXCLUDED.scoring_notes,
    ranking_recommendation = EXCLUDED.ranking_recommendation,
    red_flags = EXCLUDED.red_flags,
    positive_indicators = EXCLUDED.positive_indicators,
    updated_at = NOW();
END;
$$;

-- Grant execute to authenticated users and service role
GRANT EXECUTE ON FUNCTION calculate_bid_scores(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_bid_scores(UUID) TO service_role;
