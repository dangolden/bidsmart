-- ============================================
-- Migration: Enhance Demo Projects with Realistic v8 Data
-- Description: Adds more realistic electrical scenarios, red flags, positive indicators, and FAQs
-- Date: 2026-01-31
-- ============================================

-- Update demo bids with more realistic and varied electrical scenarios
DO $$
DECLARE
  demo_project_id UUID;
  bid_record RECORD;
  bid_counter INTEGER;
BEGIN
  -- Get demo projects
  FOR demo_project_id IN 
    SELECT id FROM projects WHERE is_demo = true OR is_public_demo = true
  LOOP
    bid_counter := 0;
    
    -- Update bids for this demo project with realistic electrical scenarios
    FOR bid_record IN 
      SELECT id FROM contractor_bids WHERE project_id = demo_project_id ORDER BY created_at
    LOOP
      bid_counter := bid_counter + 1;
      
      -- Scenario 1: Panel upgrade needed (first bid)
      IF bid_counter = 1 THEN
        UPDATE contractor_bids
        SET
          electrical_panel_assessment_included = true,
          electrical_panel_upgrade_included = true,
          electrical_panel_upgrade_cost = 2800.00,
          electrical_existing_panel_amps = 100,
          electrical_proposed_panel_amps = 200,
          electrical_breaker_size_required = 50,
          electrical_dedicated_circuit_included = true,
          electrical_permit_included = true,
          electrical_load_calculation_included = true,
          electrical_notes = 'Current 100A panel insufficient for heat pump load. Upgrade to 200A panel required. Includes load calculation, permit, and dedicated 50A circuit.',
          red_flags = jsonb_build_array(
            jsonb_build_object(
              'issue', 'Significant electrical upgrade required - adds $2,800 to total cost',
              'source', 'bid_document',
              'severity', 'medium',
              'date', NULL
            )
          ),
          positive_indicators = jsonb_build_array(
            jsonb_build_object(
              'indicator', 'Comprehensive electrical assessment included',
              'source', 'bid_document'
            ),
            jsonb_build_object(
              'indicator', 'Licensed electrician on staff',
              'source', 'contractor_website'
            ),
            jsonb_build_object(
              'indicator', 'Includes electrical permit and load calculation',
              'source', 'bid_document'
            )
          )
        WHERE id = bid_record.id;
      
      -- Scenario 2: Adequate panel, no upgrade (second bid)
      ELSIF bid_counter = 2 THEN
        UPDATE contractor_bids
        SET
          electrical_panel_assessment_included = true,
          electrical_panel_upgrade_included = false,
          electrical_panel_upgrade_cost = NULL,
          electrical_existing_panel_amps = 200,
          electrical_proposed_panel_amps = NULL,
          electrical_breaker_size_required = 40,
          electrical_dedicated_circuit_included = true,
          electrical_permit_included = true,
          electrical_load_calculation_included = true,
          electrical_notes = 'Existing 200A panel has adequate capacity. Will install dedicated 40A circuit for heat pump.',
          red_flags = '[]'::jsonb,
          positive_indicators = jsonb_build_array(
            jsonb_build_object(
              'indicator', 'No panel upgrade required - saves money',
              'source', 'bid_document'
            ),
            jsonb_build_object(
              'indicator', 'Detailed electrical assessment provided',
              'source', 'bid_document'
            ),
            jsonb_build_object(
              'indicator', 'Energy Star Most Efficient equipment specified',
              'source', 'bid_document'
            )
          )
        WHERE id = bid_record.id;
      
      -- Scenario 3: No electrical assessment mentioned (third bid - red flag)
      ELSIF bid_counter = 3 THEN
        UPDATE contractor_bids
        SET
          electrical_panel_assessment_included = false,
          electrical_panel_upgrade_included = NULL,
          electrical_panel_upgrade_cost = NULL,
          electrical_existing_panel_amps = NULL,
          electrical_proposed_panel_amps = NULL,
          electrical_breaker_size_required = NULL,
          electrical_dedicated_circuit_included = NULL,
          electrical_permit_included = false,
          electrical_load_calculation_included = false,
          electrical_notes = NULL,
          red_flags = jsonb_build_array(
            jsonb_build_object(
              'issue', 'No electrical panel capacity assessment mentioned',
              'source', 'bid_document',
              'severity', 'high',
              'date', NULL
            ),
            jsonb_build_object(
              'issue', 'Electrical permit not included in scope',
              'source', 'bid_document',
              'severity', 'medium',
              'date', NULL
            ),
            jsonb_build_object(
              'issue', 'No load calculation mentioned',
              'source', 'bid_document',
              'severity', 'medium',
              'date', NULL
            )
          ),
          positive_indicators = jsonb_build_array(
            jsonb_build_object(
              'indicator', 'Competitive pricing',
              'source', 'bid_comparison'
            )
          )
        WHERE id = bid_record.id;
      
      -- Additional bids get varied scenarios
      ELSE
        UPDATE contractor_bids
        SET
          electrical_panel_assessment_included = (random() > 0.3),
          electrical_panel_upgrade_included = (random() > 0.7),
          electrical_panel_upgrade_cost = CASE WHEN random() > 0.7 THEN (1500 + random() * 2000)::numeric(10,2) ELSE NULL END,
          electrical_existing_panel_amps = (ARRAY[100, 150, 200])[floor(random() * 3 + 1)],
          electrical_breaker_size_required = (ARRAY[30, 40, 50, 60])[floor(random() * 4 + 1)],
          electrical_dedicated_circuit_included = (random() > 0.2),
          electrical_permit_included = (random() > 0.4),
          electrical_load_calculation_included = (random() > 0.5)
        WHERE id = bid_record.id;
      END IF;
    END LOOP;

    -- Add comprehensive FAQs to demo project analysis
    UPDATE bid_analysis
    SET
      faqs = jsonb_build_object(
        'overall', jsonb_build_array(
          jsonb_build_object(
            'faq_key', 'price_difference',
            'question_text', 'Why is there such a big price difference between bids?',
            'answer_text', 'The price variation is primarily due to three factors: (1) Equipment quality - higher SEER ratings cost more but save on energy bills, (2) Electrical work - one bid includes a $2,800 panel upgrade while another doesn''t need it, and (3) Warranty coverage - longer warranties increase upfront cost but provide better protection.',
            'answer_confidence', 'high',
            'evidence', jsonb_build_array(
              jsonb_build_object(
                'source', 'bid',
                'bid_index', 0,
                'field', 'electrical_panel_upgrade_cost',
                'value', '$2,800',
                'notes', 'Panel upgrade significantly impacts total cost'
              )
            ),
            'display_order', 1
          ),
          jsonb_build_object(
            'faq_key', 'electrical_requirements',
            'question_text', 'Do I need to upgrade my electrical panel?',
            'answer_text', 'It depends on your current panel capacity. One contractor assessed your panel at 100 amps and recommends upgrading to 200 amps for $2,800. Another contractor found your existing 200 amp panel adequate. Heat pumps typically require a dedicated 40-60 amp circuit. We recommend getting a professional electrical assessment before proceeding.',
            'answer_confidence', 'high',
            'evidence', jsonb_build_array(
              jsonb_build_object(
                'source', 'bid',
                'bid_index', 0,
                'field', 'electrical_existing_panel_amps',
                'value', '100',
                'notes', 'Current panel capacity per Bid 1'
              ),
              jsonb_build_object(
                'source', 'bid',
                'bid_index', 1,
                'field', 'electrical_existing_panel_amps',
                'value', '200',
                'notes', 'Current panel capacity per Bid 2'
              )
            ),
            'display_order', 2
          ),
          jsonb_build_object(
            'faq_key', 'best_value',
            'question_text', 'Which bid offers the best value?',
            'answer_text', 'Bid 2 appears to offer the best value. It includes high-efficiency equipment (SEER 18+), comprehensive electrical assessment, and doesn''t require a costly panel upgrade. The contractor also has strong credentials and includes all necessary permits and load calculations.',
            'answer_confidence', 'high',
            'evidence', jsonb_build_array(),
            'display_order', 3
          ),
          jsonb_build_object(
            'faq_key', 'red_flags',
            'question_text', 'Are there any red flags I should be concerned about?',
            'answer_text', 'Yes, Bid 3 has several concerning omissions: no electrical panel assessment, no electrical permit included, and no load calculation mentioned. These are critical components of a proper heat pump installation. We recommend asking this contractor for clarification before proceeding.',
            'answer_confidence', 'high',
            'evidence', jsonb_build_array(),
            'display_order', 4
          ),
          jsonb_build_object(
            'faq_key', 'warranty_comparison',
            'question_text', 'How do the warranties compare?',
            'answer_text', 'Warranties vary significantly. Bid 1 offers 5 years labor and 10 years equipment. Bid 2 offers 10 years labor and 12 years equipment (best coverage). Bid 3 offers 2 years labor and 10 years equipment. Longer labor warranties are particularly valuable as labor costs can be substantial.',
            'answer_confidence', 'medium',
            'evidence', jsonb_build_array(),
            'display_order', 5
          )
        ),
        'by_bid', jsonb_build_array()
      ),
      clarification_questions = jsonb_build_array(
        jsonb_build_object(
          'bid_index', 2,
          'contractor_name', 'Budget HVAC Solutions',
          'question_text', 'Does your bid include assessment of electrical panel capacity and any necessary upgrades?',
          'question_category', 'electrical',
          'priority', 'high',
          'context', 'Electrical panel capacity not mentioned in bid. Heat pumps require dedicated circuits and adequate panel capacity.',
          'triggered_by', 'missing_electrical_assessment',
          'missing_field', 'electrical_panel_assessment_included',
          'good_answer_looks_like', 'Yes, we will assess your panel capacity and provide recommendations. If an upgrade is needed, we will provide a separate quote.',
          'concerning_answer_looks_like', 'Panel assessment is not our responsibility or We assume existing panel is adequate',
          'display_order', 1
        ),
        jsonb_build_object(
          'bid_index', 2,
          'contractor_name', 'Budget HVAC Solutions',
          'question_text', 'Will you obtain the necessary electrical permit for the installation?',
          'question_category', 'scope',
          'priority', 'high',
          'context', 'Electrical permit not mentioned in scope of work. Most jurisdictions require permits for electrical work.',
          'triggered_by', 'missing_electrical_permit',
          'missing_field', 'electrical_permit_included',
          'good_answer_looks_like', 'Yes, all necessary permits are included in our scope and pricing',
          'concerning_answer_looks_like', 'Permits are homeowner responsibility or We don''t usually get permits',
          'display_order', 2
        ),
        jsonb_build_object(
          'bid_index', 0,
          'contractor_name', 'Premium Comfort Systems',
          'question_text', 'Can you provide a breakdown of the $2,800 electrical panel upgrade cost?',
          'question_category', 'pricing',
          'priority', 'medium',
          'context', 'Panel upgrade is a significant cost. Understanding the breakdown helps evaluate if it''s necessary and fairly priced.',
          'triggered_by', 'high_electrical_cost',
          'missing_field', 'electrical_cost_breakdown',
          'good_answer_looks_like', 'Detailed breakdown including panel, labor, permit, inspection costs',
          'concerning_answer_looks_like', 'That''s our standard price or Vague response without details',
          'display_order', 3
        )
      )
    WHERE project_id = demo_project_id;
  END LOOP;
END $$;

-- Ensure all demo equipment has amperage data
UPDATE bid_equipment
SET
  amperage_draw = CASE 
    WHEN capacity_tons IS NULL OR capacity_tons <= 2 THEN 18
    WHEN capacity_tons <= 3 THEN 28
    WHEN capacity_tons <= 4 THEN 38
    ELSE 48
  END,
  minimum_circuit_amperage = CASE 
    WHEN capacity_tons IS NULL OR capacity_tons <= 2 THEN 25
    WHEN capacity_tons <= 3 THEN 35
    WHEN capacity_tons <= 4 THEN 45
    ELSE 55
  END
WHERE bid_id IN (
  SELECT cb.id 
  FROM contractor_bids cb
  JOIN projects p ON cb.project_id = p.id
  WHERE p.is_demo = true OR p.is_public_demo = true
)
AND (amperage_draw IS NULL OR minimum_circuit_amperage IS NULL);
