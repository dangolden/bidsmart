-- ============================================
-- Migration: Seed Test Account with Complete v8 Data
-- Description: Creates test user and project with complete v8 fields for frontend development
-- Date: 2026-01-31
-- Idempotent: Can be run multiple times
-- ============================================

-- Create or get test user
DO $$
DECLARE
  test_user_id UUID;
  test_project_id UUID;
  bid1_id UUID;
  bid2_id UUID;
  bid3_id UUID;
BEGIN
  -- V2 schema guard: skip if contractor_bids table doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'contractor_bids'
  ) THEN
    RAISE NOTICE 'Skipping V1 demo migration (023) - contractor_bids table does not exist (V2 schema)';
    RETURN;
  END IF;

  -- Create test user if doesn't exist
  INSERT INTO users_ext (email, full_name, property_city, property_state, property_zip)
  VALUES ('test@bidsmart.com', 'Test User', 'Austin', 'TX', '78701')
  ON CONFLICT (email) DO UPDATE SET updated_at = NOW()
  RETURNING id INTO test_user_id;

  -- Delete existing test project if exists (for clean re-seeding)
  DELETE FROM projects 
  WHERE user_id = test_user_id 
    AND project_name = 'Test Project - v8 Complete Data';

  -- Create test project
  INSERT INTO projects (
    user_id,
    project_name,
    status,
    heat_pump_type,
    system_size_tons,
    replace_air_handler,
    replace_ductwork,
    add_zones,
    requires_electrical_upgrade,
    electrical_panel_amps,
    financing_interested,
    data_sharing_consent,
    is_demo,
    notify_on_completion
  ) VALUES (
    test_user_id,
    'Test Project - v8 Complete Data',
    'comparing',
    'air_source',
    3.0,
    true,
    false,
    0,
    true,
    100,
    true,
    true,
    false,
    false
  ) RETURNING id INTO test_project_id;

  -- Create Bid 1: Premium bid with panel upgrade
  INSERT INTO contractor_bids (
    project_id,
    contractor_name,
    contractor_company,
    contractor_phone,
    contractor_email,
    contractor_license,
    contractor_license_state,
    contractor_website,
    contractor_years_in_business,
    contractor_google_rating,
    contractor_google_review_count,
    contractor_certifications,
    total_bid_amount,
    labor_cost,
    equipment_cost,
    materials_cost,
    permit_cost,
    estimated_days,
    labor_warranty_years,
    equipment_warranty_years,
    financing_offered,
    scope_summary,
    scope_permit_included,
    scope_disposal_included,
    scope_electrical_included,
    scope_ductwork_included,
    scope_thermostat_included,
    scope_manual_j_included,
    scope_commissioning_included,
    electrical_panel_assessment_included,
    electrical_panel_upgrade_included,
    electrical_panel_upgrade_cost,
    electrical_existing_panel_amps,
    electrical_proposed_panel_amps,
    electrical_breaker_size_required,
    electrical_dedicated_circuit_included,
    electrical_permit_included,
    electrical_load_calculation_included,
    electrical_notes,
    red_flags,
    positive_indicators,
    extraction_confidence,
    verified_by_user,
    is_favorite
  ) VALUES (
    test_project_id,
    'Premium Comfort Systems',
    'Premium Comfort Systems LLC',
    '512-555-0101',
    'info@premiumcomfort.com',
    'TACLA12345',
    'TX',
    'https://premiumcomfort.com',
    15,
    4.8,
    127,
    ARRAY['NATE Certified', 'Energy Star Partner', 'BBB A+ Rating'],
    18500.00,
    4500.00,
    11200.00,
    2000.00,
    800.00,
    3,
    5,
    10,
    true,
    'Complete heat pump installation with electrical panel upgrade',
    true,
    true,
    true,
    false,
    true,
    true,
    true,
    true,
    true,
    2800.00,
    100,
    200,
    50,
    true,
    true,
    true,
    'Current 100A panel insufficient for heat pump load. Upgrade to 200A panel required. Includes load calculation, permit, and dedicated 50A circuit.',
    '[{"issue": "Significant electrical upgrade required - adds $2,800 to total cost", "source": "bid_document", "severity": "medium", "date": null}]'::jsonb,
    '[{"indicator": "Comprehensive electrical assessment included", "source": "bid_document"}, {"indicator": "Licensed electrician on staff", "source": "contractor_website"}, {"indicator": "15 years in business with excellent reviews", "source": "contractor_research"}]'::jsonb,
    'high',
    false,
    false
  ) RETURNING id INTO bid1_id;

  -- Create Bid 2: Best value bid, no panel upgrade needed
  INSERT INTO contractor_bids (
    project_id,
    contractor_name,
    contractor_company,
    contractor_phone,
    contractor_email,
    contractor_license,
    contractor_license_state,
    contractor_website,
    contractor_years_in_business,
    contractor_google_rating,
    contractor_google_review_count,
    contractor_certifications,
    total_bid_amount,
    labor_cost,
    equipment_cost,
    materials_cost,
    permit_cost,
    estimated_days,
    labor_warranty_years,
    equipment_warranty_years,
    financing_offered,
    scope_summary,
    scope_permit_included,
    scope_disposal_included,
    scope_electrical_included,
    scope_ductwork_included,
    scope_thermostat_included,
    scope_manual_j_included,
    scope_commissioning_included,
    electrical_panel_assessment_included,
    electrical_panel_upgrade_included,
    electrical_panel_upgrade_cost,
    electrical_existing_panel_amps,
    electrical_proposed_panel_amps,
    electrical_breaker_size_required,
    electrical_dedicated_circuit_included,
    electrical_permit_included,
    electrical_load_calculation_included,
    electrical_notes,
    red_flags,
    positive_indicators,
    extraction_confidence,
    verified_by_user,
    is_favorite
  ) VALUES (
    test_project_id,
    'Reliable HVAC Pros',
    'Reliable HVAC Professionals Inc',
    '512-555-0202',
    'contact@reliablehvac.com',
    'TACLA67890',
    'TX',
    'https://reliablehvac.com',
    22,
    4.9,
    203,
    ARRAY['NATE Certified', 'Mitsubishi Diamond Contractor', 'Energy Star Most Efficient Partner'],
    15200.00,
    3800.00,
    9800.00,
    1200.00,
    400.00,
    2,
    10,
    12,
    true,
    'Complete 3-ton heat pump installation with high-efficiency equipment',
    true,
    true,
    true,
    false,
    true,
    true,
    true,
    true,
    false,
    NULL,
    200,
    NULL,
    40,
    true,
    true,
    true,
    'Existing 200A panel has adequate capacity. Will install dedicated 40A circuit for heat pump. No panel upgrade required.',
    '[]'::jsonb,
    '[{"indicator": "No panel upgrade required - saves money", "source": "bid_document"}, {"indicator": "Energy Star Most Efficient equipment", "source": "bid_document"}, {"indicator": "22 years in business with 4.9 star rating", "source": "contractor_research"}, {"indicator": "Best warranty coverage (10yr labor, 12yr equipment)", "source": "bid_document"}]'::jsonb,
    'high',
    false,
    false
  ) RETURNING id INTO bid2_id;

  -- Create Bid 3: Budget bid with red flags
  INSERT INTO contractor_bids (
    project_id,
    contractor_name,
    contractor_company,
    contractor_phone,
    contractor_email,
    contractor_license,
    contractor_license_state,
    contractor_website,
    contractor_years_in_business,
    contractor_google_rating,
    contractor_google_review_count,
    contractor_certifications,
    total_bid_amount,
    labor_cost,
    equipment_cost,
    materials_cost,
    permit_cost,
    estimated_days,
    labor_warranty_years,
    equipment_warranty_years,
    financing_offered,
    scope_summary,
    scope_permit_included,
    scope_disposal_included,
    scope_electrical_included,
    scope_ductwork_included,
    scope_thermostat_included,
    scope_manual_j_included,
    scope_commissioning_included,
    electrical_panel_assessment_included,
    electrical_panel_upgrade_included,
    electrical_panel_upgrade_cost,
    electrical_existing_panel_amps,
    electrical_proposed_panel_amps,
    electrical_breaker_size_required,
    electrical_dedicated_circuit_included,
    electrical_permit_included,
    electrical_load_calculation_included,
    electrical_notes,
    red_flags,
    positive_indicators,
    extraction_confidence,
    verified_by_user,
    is_favorite
  ) VALUES (
    test_project_id,
    'Budget HVAC Solutions',
    'Budget HVAC Solutions',
    '512-555-0303',
    'info@budgethvac.com',
    'TACLA11111',
    'TX',
    NULL,
    5,
    3.8,
    42,
    ARRAY['Licensed'],
    12800.00,
    2800.00,
    8500.00,
    1200.00,
    300.00,
    4,
    2,
    10,
    false,
    'Heat pump installation',
    false,
    true,
    false,
    false,
    false,
    false,
    false,
    false,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    false,
    false,
    NULL,
    '[{"issue": "No electrical panel capacity assessment mentioned", "source": "bid_document", "severity": "high", "date": null}, {"issue": "Electrical permit not included in scope", "source": "bid_document", "severity": "medium", "date": null}, {"issue": "No load calculation mentioned", "source": "bid_document", "severity": "medium", "date": null}, {"issue": "Very short labor warranty (2 years)", "source": "bid_document", "severity": "low", "date": null}]'::jsonb,
    '[{"indicator": "Lowest price option", "source": "bid_comparison"}]'::jsonb,
    'medium',
    false,
    false
  ) RETURNING id INTO bid3_id;

  -- Add equipment for Bid 1
  INSERT INTO bid_equipment (
    bid_id,
    equipment_type,
    brand,
    model_number,
    capacity_tons,
    capacity_btu,
    seer_rating,
    seer2_rating,
    hspf_rating,
    hspf2_rating,
    variable_speed,
    stages,
    refrigerant_type,
    voltage,
    amperage_draw,
    minimum_circuit_amperage,
    sound_level_db,
    energy_star_certified,
    energy_star_most_efficient,
    confidence
  ) VALUES (
    bid1_id,
    'outdoor_unit',
    'Carrier',
    'CA-HP-36-001',
    3.0,
    36000,
    18.0,
    17.5,
    9.5,
    9.0,
    true,
    99,
    'R-410A',
    240,
    28,
    35,
    58,
    true,
    false,
    'high'
  );

  -- Add equipment for Bid 2
  INSERT INTO bid_equipment (
    bid_id,
    equipment_type,
    brand,
    model_number,
    capacity_tons,
    capacity_btu,
    seer_rating,
    seer2_rating,
    hspf_rating,
    hspf2_rating,
    variable_speed,
    stages,
    refrigerant_type,
    voltage,
    amperage_draw,
    minimum_circuit_amperage,
    sound_level_db,
    energy_star_certified,
    energy_star_most_efficient,
    confidence
  ) VALUES (
    bid2_id,
    'outdoor_unit',
    'Mitsubishi',
    'MXZ-3C30NAHZ2',
    3.0,
    30600,
    20.0,
    19.5,
    10.0,
    9.5,
    true,
    99,
    'R-410A',
    240,
    26,
    35,
    52,
    true,
    true,
    'high'
  );

  -- Add equipment for Bid 3
  INSERT INTO bid_equipment (
    bid_id,
    equipment_type,
    brand,
    model_number,
    capacity_tons,
    capacity_btu,
    seer_rating,
    seer2_rating,
    hspf_rating,
    hspf2_rating,
    variable_speed,
    stages,
    refrigerant_type,
    voltage,
    amperage_draw,
    minimum_circuit_amperage,
    sound_level_db,
    energy_star_certified,
    energy_star_most_efficient,
    confidence
  ) VALUES (
    bid3_id,
    'outdoor_unit',
    'Goodman',
    'GSZ140361',
    3.0,
    36000,
    16.0,
    15.5,
    8.5,
    8.0,
    false,
    2,
    'R-410A',
    240,
    30,
    40,
    72,
    true,
    false,
    'medium'
  );

  -- Create bid_analysis with FAQs and clarification questions
  INSERT INTO bid_analysis (
    project_id,
    faqs,
    clarification_questions,
    analysis_version,
    analyzed_at,
    model_used
  ) VALUES (
    test_project_id,
    jsonb_build_object(
      'overall', jsonb_build_array(
        jsonb_build_object(
          'faq_key', 'price_difference',
          'question_text', 'Why is there a $5,700 price difference between the highest and lowest bids?',
          'answer_text', 'The price variation is due to: (1) Electrical work - Bid 1 includes a $2,800 panel upgrade, (2) Equipment quality - Bid 2 uses Energy Star Most Efficient equipment with higher SEER ratings, (3) Warranty - Bid 2 offers 10yr labor vs 2yr for Bid 3, (4) Scope completeness - Bid 3 excludes permits and electrical assessment.',
          'answer_confidence', 'high',
          'evidence', '[]'::jsonb,
          'display_order', 1
        ),
        jsonb_build_object(
          'faq_key', 'electrical_requirements',
          'question_text', 'Do I need to upgrade my electrical panel?',
          'answer_text', 'This is unclear and concerning. Bid 1 says you need a $2,800 upgrade from 100A to 200A. Bid 2 says your existing 200A panel is adequate. Bid 3 doesn''t mention electrical assessment at all. We strongly recommend getting an independent electrical assessment before proceeding.',
          'answer_confidence', 'medium',
          'evidence', '[]'::jsonb,
          'display_order', 2
        ),
        jsonb_build_object(
          'faq_key', 'best_value',
          'question_text', 'Which bid offers the best value?',
          'answer_text', 'Bid 2 (Reliable HVAC Pros) offers the best value: Energy Star Most Efficient equipment, no panel upgrade needed, excellent 10yr/12yr warranty, 22 years experience with 4.9 stars, and mid-range pricing. The $2,400 premium over Bid 3 is justified by superior equipment, warranty, and completeness.',
          'answer_confidence', 'high',
          'evidence', '[]'::jsonb,
          'display_order', 3
        ),
        jsonb_build_object(
          'faq_key', 'red_flags',
          'question_text', 'What are the main red flags?',
          'answer_text', 'Bid 3 has critical red flags: no electrical assessment, no permit included, no load calculation, and only 2-year labor warranty. Bid 1''s panel upgrade requirement conflicts with Bid 2''s assessment - one of them is wrong about your current panel capacity.',
          'answer_confidence', 'high',
          'evidence', '[]'::jsonb,
          'display_order', 4
        )
      ),
      'by_bid', '[]'::jsonb
    ),
    jsonb_build_array(
      jsonb_build_object(
        'bid_index', 2,
        'contractor_name', 'Budget HVAC Solutions',
        'question_text', 'Does your bid include assessment of electrical panel capacity and any necessary upgrades?',
        'question_category', 'electrical',
        'priority', 'high',
        'context', 'No electrical assessment mentioned. Heat pumps require dedicated circuits and adequate panel capacity.',
        'triggered_by', 'missing_electrical_assessment',
        'missing_field', 'electrical_panel_assessment_included',
        'good_answer_looks_like', 'Yes, we will assess your panel and provide recommendations with separate quote if upgrade needed',
        'concerning_answer_looks_like', 'Panel assessment not our responsibility or We assume existing panel is adequate',
        'display_order', 1
      ),
      jsonb_build_object(
        'bid_index', 2,
        'contractor_name', 'Budget HVAC Solutions',
        'question_text', 'Will you obtain the necessary electrical permit?',
        'question_category', 'scope',
        'priority', 'high',
        'context', 'Permit not included. Most jurisdictions require permits for electrical work.',
        'triggered_by', 'missing_electrical_permit',
        'missing_field', 'electrical_permit_included',
        'good_answer_looks_like', 'Yes, all permits included in our pricing',
        'concerning_answer_looks_like', 'Permits are homeowner responsibility',
        'display_order', 2
      ),
      jsonb_build_object(
        'bid_index', 0,
        'contractor_name', 'Premium Comfort Systems',
        'question_text', 'Can you explain why you assessed the panel at 100A when another contractor found 200A?',
        'question_category', 'electrical',
        'priority', 'high',
        'context', 'Conflicting electrical assessments between contractors',
        'triggered_by', 'conflicting_electrical_assessment',
        'missing_field', NULL,
        'good_answer_looks_like', 'Detailed explanation of assessment methodology and findings',
        'concerning_answer_looks_like', 'Defensive or vague response',
        'display_order', 3
      )
    ),
    'v8',
    NOW(),
    'mindpal_v8'
  );

  RAISE NOTICE 'Test account seeded successfully!';
  RAISE NOTICE 'User: test@bidsmart.com';
  RAISE NOTICE 'Project ID: %', test_project_id;
  RAISE NOTICE 'Bid 1 (Premium): %', bid1_id;
  RAISE NOTICE 'Bid 2 (Best Value): %', bid2_id;
  RAISE NOTICE 'Bid 3 (Budget): %', bid3_id;
END $$;
