-- ============================================
-- Migration: Add MindPal v8 Fields
-- Description: Adds electrical info, FAQs, clarification questions, and red flags/positive indicators
-- Date: 2026-01-31
-- ============================================

-- Add electrical fields to contractor_bids table
ALTER TABLE contractor_bids ADD COLUMN IF NOT EXISTS
  electrical_panel_assessment_included BOOLEAN,
  electrical_panel_upgrade_included BOOLEAN,
  electrical_panel_upgrade_cost NUMERIC(10,2),
  electrical_existing_panel_amps INTEGER,
  electrical_proposed_panel_amps INTEGER,
  electrical_breaker_size_required INTEGER,
  electrical_dedicated_circuit_included BOOLEAN,
  electrical_permit_included BOOLEAN,
  electrical_load_calculation_included BOOLEAN,
  electrical_notes TEXT;

-- Add red flags and positive indicators to contractor_bids
ALTER TABLE contractor_bids ADD COLUMN IF NOT EXISTS
  red_flags JSONB DEFAULT '[]'::jsonb,
  positive_indicators JSONB DEFAULT '[]'::jsonb;

-- Add FAQ and clarification questions to bid_analysis
ALTER TABLE bid_analysis ADD COLUMN IF NOT EXISTS
  faqs JSONB,
  clarification_questions JSONB;

-- Add amperage fields to bid_equipment
ALTER TABLE bid_equipment ADD COLUMN IF NOT EXISTS
  amperage_draw INTEGER,
  minimum_circuit_amperage INTEGER;

-- Create indexes for new JSONB columns
CREATE INDEX IF NOT EXISTS idx_contractor_bids_red_flags ON contractor_bids USING GIN (red_flags);
CREATE INDEX IF NOT EXISTS idx_contractor_bids_positive_indicators ON contractor_bids USING GIN (positive_indicators);
CREATE INDEX IF NOT EXISTS idx_bid_analysis_faqs ON bid_analysis USING GIN (faqs);
CREATE INDEX IF NOT EXISTS idx_bid_analysis_questions ON bid_analysis USING GIN (clarification_questions);

-- Add indexes for electrical fields (for filtering/sorting)
CREATE INDEX IF NOT EXISTS idx_contractor_bids_electrical_upgrade ON contractor_bids(electrical_panel_upgrade_included) WHERE electrical_panel_upgrade_included IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contractor_bids_breaker_size ON contractor_bids(electrical_breaker_size_required) WHERE electrical_breaker_size_required IS NOT NULL;

-- Comment on new columns
COMMENT ON COLUMN contractor_bids.electrical_panel_assessment_included IS 'Whether contractor assessed electrical panel capacity';
COMMENT ON COLUMN contractor_bids.electrical_panel_upgrade_included IS 'Whether panel upgrade is included in bid';
COMMENT ON COLUMN contractor_bids.electrical_panel_upgrade_cost IS 'Cost of panel upgrade if included';
COMMENT ON COLUMN contractor_bids.electrical_breaker_size_required IS 'Required breaker size in amps';
COMMENT ON COLUMN contractor_bids.red_flags IS 'Array of red flag objects with issue, source, severity, date';
COMMENT ON COLUMN contractor_bids.positive_indicators IS 'Array of positive indicator objects with indicator, source';
COMMENT ON COLUMN bid_analysis.faqs IS 'Overall and per-bid FAQ data from MindPal v8';
COMMENT ON COLUMN bid_analysis.clarification_questions IS 'Array of clarification questions for homeowner';
COMMENT ON COLUMN bid_equipment.amperage_draw IS 'Equipment amperage draw';
COMMENT ON COLUMN bid_equipment.minimum_circuit_amperage IS 'Minimum circuit amperage required';
