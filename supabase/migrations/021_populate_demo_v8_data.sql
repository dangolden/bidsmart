-- ============================================
-- Migration: Populate Demo Projects with v8 Data
-- Description: Adds electrical info, red flags, and positive indicators to demo bids
-- Date: 2026-01-31
-- ============================================

-- Update demo bids with electrical information
-- Assuming demo project has contractor_bids, we'll add electrical data to them

-- Find demo projects
DO $$
DECLARE
  demo_project_id UUID;
  bid_record RECORD;
BEGIN
  -- Get demo projects
  FOR demo_project_id IN 
    SELECT id FROM projects WHERE is_demo = true
  LOOP
    -- Update bids for this demo project with electrical info
    FOR bid_record IN 
      SELECT id FROM contractor_bids WHERE project_id = demo_project_id
    LOOP
      -- Add varied electrical data to make demo realistic
      UPDATE contractor_bids
      SET
        electrical_panel_assessment_included = (random() > 0.3),
        electrical_panel_upgrade_included = (random() > 0.7),
        electrical_panel_upgrade_cost = CASE WHEN random() > 0.7 THEN (1500 + random() * 2000)::numeric(10,2) ELSE NULL END,
        electrical_existing_panel_amps = CASE WHEN random() > 0.5 THEN (ARRAY[100, 150, 200])[floor(random() * 3 + 1)] ELSE NULL END,
        electrical_proposed_panel_amps = CASE WHEN random() > 0.7 THEN 200 ELSE NULL END,
        electrical_breaker_size_required = (ARRAY[30, 40, 50, 60])[floor(random() * 4 + 1)],
        electrical_dedicated_circuit_included = (random() > 0.2),
        electrical_permit_included = (random() > 0.4),
        electrical_load_calculation_included = (random() > 0.5),
        electrical_notes = CASE 
          WHEN random() > 0.7 THEN 'Existing 100A panel may need upgrade for heat pump load'
          WHEN random() > 0.5 THEN 'Dedicated 240V circuit required'
          ELSE NULL
        END,
        red_flags = CASE 
          WHEN random() > 0.6 THEN 
            jsonb_build_array(
              jsonb_build_object(
                'issue', 'No mention of electrical panel capacity assessment',
                'source', 'bid_document',
                'severity', 'high',
                'date', NULL
              )
            )
          ELSE '[]'::jsonb
        END,
        positive_indicators = CASE
          WHEN random() > 0.5 THEN
            jsonb_build_array(
              jsonb_build_object(
                'indicator', 'Includes comprehensive electrical assessment',
                'source', 'bid_document'
              ),
              jsonb_build_object(
                'indicator', 'Licensed electrician on staff',
                'source', 'contractor_website'
              )
            )
          ELSE 
            jsonb_build_array(
              jsonb_build_object(
                'indicator', 'Detailed scope of work provided',
                'source', 'bid_document'
              )
            )
        END
      WHERE id = bid_record.id;
    END LOOP;

    -- Add sample FAQs to demo project analysis
    UPDATE bid_analysis
    SET
      faqs = jsonb_build_object(
        'overall', jsonb_build_array(
          jsonb_build_object(
            'faq_key', 'price_difference',
            'question_text', 'Why is there such a big price difference between bids?',
            'answer_text', 'The price variation is primarily due to differences in equipment quality (SEER ratings), warranty coverage, and scope of work. Higher-priced bids typically include more comprehensive warranties and higher-efficiency equipment.',
            'answer_confidence', 'high',
            'evidence', jsonb_build_array(),
            'display_order', 1
          ),
          jsonb_build_object(
            'faq_key', 'electrical_requirements',
            'question_text', 'Do I need to upgrade my electrical panel?',
            'answer_text', 'Based on the bids, some contractors have assessed your electrical capacity. A heat pump typically requires a dedicated 240V circuit with 40-60 amp breaker. If your current panel is 100 amps or less, an upgrade may be necessary.',
            'answer_confidence', 'medium',
            'evidence', jsonb_build_array(),
            'display_order', 2
          ),
          jsonb_build_object(
            'faq_key', 'best_value',
            'question_text', 'Which bid offers the best value?',
            'answer_text', 'The mid-range bid appears to offer the best balance of quality equipment, comprehensive warranty, and competitive pricing. It includes all necessary components and proper electrical assessment.',
            'answer_confidence', 'high',
            'evidence', jsonb_build_array(),
            'display_order', 3
          )
        ),
        'by_bid', jsonb_build_array()
      ),
      clarification_questions = jsonb_build_array(
        jsonb_build_object(
          'bid_index', 0,
          'contractor_name', 'Demo Contractor A',
          'question_text', 'Does your bid include assessment of electrical panel capacity?',
          'question_category', 'electrical',
          'priority', 'high',
          'context', 'Electrical panel capacity not mentioned in bid',
          'triggered_by', 'missing_electrical_assessment',
          'missing_field', 'electrical_panel_assessment_included',
          'good_answer_looks_like', 'Yes, we will assess your panel and provide recommendations',
          'concerning_answer_looks_like', 'No assessment needed or panel upgrade not our responsibility',
          'display_order', 1
        ),
        jsonb_build_object(
          'bid_index', 0,
          'contractor_name', 'Demo Contractor A',
          'question_text', 'What is the total warranty coverage including labor?',
          'question_category', 'warranty',
          'priority', 'medium',
          'context', 'Labor warranty duration unclear',
          'triggered_by', 'unclear_warranty_terms',
          'missing_field', 'labor_warranty_years',
          'good_answer_looks_like', 'Specific number of years with clear terms',
          'concerning_answer_looks_like', 'Vague or conditional warranty terms',
          'display_order', 2
        )
      )
    WHERE project_id = demo_project_id;
  END LOOP;
END $$;

-- Add amperage data to demo equipment
UPDATE bid_equipment
SET
  amperage_draw = CASE 
    WHEN capacity_tons <= 2 THEN (ARRAY[15, 18, 20])[floor(random() * 3 + 1)]
    WHEN capacity_tons <= 3 THEN (ARRAY[25, 28, 30])[floor(random() * 3 + 1)]
    WHEN capacity_tons <= 4 THEN (ARRAY[35, 38, 40])[floor(random() * 3 + 1)]
    ELSE (ARRAY[45, 48, 50])[floor(random() * 3 + 1)]
  END,
  minimum_circuit_amperage = CASE 
    WHEN capacity_tons <= 2 THEN (ARRAY[20, 25, 30])[floor(random() * 3 + 1)]
    WHEN capacity_tons <= 3 THEN (ARRAY[30, 35, 40])[floor(random() * 3 + 1)]
    WHEN capacity_tons <= 4 THEN (ARRAY[40, 45, 50])[floor(random() * 3 + 1)]
    ELSE (ARRAY[50, 55, 60])[floor(random() * 3 + 1)]
  END
WHERE bid_id IN (
  SELECT cb.id 
  FROM contractor_bids cb
  JOIN projects p ON cb.project_id = p.id
  WHERE p.is_demo = true
);
