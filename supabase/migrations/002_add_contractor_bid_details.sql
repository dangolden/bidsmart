-- ============================================================================
-- Migration: Add Additional Contractor and Bid Details
-- Created: 2026-02-13
-- Description: Adds 20 columns to contractor_bids to store complete MindPal
--              extraction data including BBB/Yelp ratings, electrical details,
--              red flags, and positive indicators.
-- ============================================================================

-- Category 1: Additional Contractor Ratings (6 columns)
ALTER TABLE contractor_bids
  ADD COLUMN IF NOT EXISTS contractor_yelp_rating DECIMAL(3,2),
  ADD COLUMN IF NOT EXISTS contractor_yelp_review_count INTEGER,
  ADD COLUMN IF NOT EXISTS contractor_bbb_rating TEXT,
  ADD COLUMN IF NOT EXISTS contractor_bbb_accredited BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS contractor_bbb_complaints_3yr INTEGER,
  ADD COLUMN IF NOT EXISTS contractor_bonded BOOLEAN DEFAULT false;

-- Category 2: Contractor Contact Details (2 columns)
ALTER TABLE contractor_bids
  ADD COLUMN IF NOT EXISTS contractor_contact_name TEXT,
  ADD COLUMN IF NOT EXISTS contractor_address TEXT;

-- Category 3: Electrical Panel Details (9 columns)
-- Note: Some of these may already exist in TypeScript but not in DB
ALTER TABLE contractor_bids
  ADD COLUMN IF NOT EXISTS electrical_panel_assessment_included BOOLEAN,
  ADD COLUMN IF NOT EXISTS electrical_panel_upgrade_included BOOLEAN,
  ADD COLUMN IF NOT EXISTS electrical_panel_upgrade_cost DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS electrical_existing_panel_amps INTEGER,
  ADD COLUMN IF NOT EXISTS electrical_proposed_panel_amps INTEGER,
  ADD COLUMN IF NOT EXISTS electrical_breaker_size_required INTEGER,
  ADD COLUMN IF NOT EXISTS electrical_dedicated_circuit_included BOOLEAN,
  ADD COLUMN IF NOT EXISTS electrical_permit_included BOOLEAN,
  ADD COLUMN IF NOT EXISTS electrical_notes TEXT;

-- Category 4: Additional Bid Metadata (3 columns)
ALTER TABLE contractor_bids
  ADD COLUMN IF NOT EXISTS rebates_mentioned TEXT[],
  ADD COLUMN IF NOT EXISTS red_flags JSONB,
  ADD COLUMN IF NOT EXISTS positive_indicators JSONB;

-- Add comments for documentation
COMMENT ON COLUMN contractor_bids.contractor_yelp_rating IS 'Yelp rating (1-5 scale)';
COMMENT ON COLUMN contractor_bids.contractor_yelp_review_count IS 'Number of Yelp reviews';
COMMENT ON COLUMN contractor_bids.contractor_bbb_rating IS 'BBB rating (A+, A, B, etc.)';
COMMENT ON COLUMN contractor_bids.contractor_bbb_accredited IS 'Whether contractor is BBB accredited';
COMMENT ON COLUMN contractor_bids.contractor_bbb_complaints_3yr IS 'Number of BBB complaints in last 3 years';
COMMENT ON COLUMN contractor_bids.contractor_bonded IS 'Whether contractor is bonded';
COMMENT ON COLUMN contractor_bids.contractor_contact_name IS 'Primary contact person name';
COMMENT ON COLUMN contractor_bids.contractor_address IS 'Contractor business address';
COMMENT ON COLUMN contractor_bids.electrical_panel_assessment_included IS 'Whether electrical panel assessment is included in bid';
COMMENT ON COLUMN contractor_bids.electrical_panel_upgrade_included IS 'Whether electrical panel upgrade is included in bid';
COMMENT ON COLUMN contractor_bids.electrical_panel_upgrade_cost IS 'Cost of electrical panel upgrade if needed';
COMMENT ON COLUMN contractor_bids.electrical_existing_panel_amps IS 'Current electrical panel amperage';
COMMENT ON COLUMN contractor_bids.electrical_proposed_panel_amps IS 'Proposed electrical panel amperage';
COMMENT ON COLUMN contractor_bids.electrical_breaker_size_required IS 'Required breaker size for heat pump';
COMMENT ON COLUMN contractor_bids.electrical_dedicated_circuit_included IS 'Whether dedicated circuit installation is included';
COMMENT ON COLUMN contractor_bids.electrical_permit_included IS 'Whether electrical permit is included';
COMMENT ON COLUMN contractor_bids.electrical_notes IS 'Additional electrical work notes';
COMMENT ON COLUMN contractor_bids.rebates_mentioned IS 'Array of rebate programs mentioned in bid';
COMMENT ON COLUMN contractor_bids.red_flags IS 'JSON array of red flags identified in bid analysis';
COMMENT ON COLUMN contractor_bids.positive_indicators IS 'JSON array of positive indicators identified in bid analysis';
