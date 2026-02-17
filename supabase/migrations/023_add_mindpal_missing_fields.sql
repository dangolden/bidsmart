-- ============================================================================
-- Migration: Add Missing MindPal Fields
-- Created: 2026-02-14
-- Description: Adds fields from MindPal extraction that were not in Supabase
-- ============================================================================

-- Pricing fields
ALTER TABLE contractor_bids
  ADD COLUMN IF NOT EXISTS disposal_cost DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS electrical_cost DECIMAL(10,2);

-- Payment terms (boolean version - existing deposit_required is DECIMAL for amount)
ALTER TABLE contractor_bids
  ADD COLUMN IF NOT EXISTS deposit_required_flag BOOLEAN DEFAULT false;

-- Warranty (compressor warranty at bid level, not just equipment)
ALTER TABLE contractor_bids
  ADD COLUMN IF NOT EXISTS compressor_warranty_years INTEGER;

-- Dates
ALTER TABLE contractor_bids
  ADD COLUMN IF NOT EXISTS quote_date DATE;

-- Contractor business info
ALTER TABLE contractor_bids
  ADD COLUMN IF NOT EXISTS contractor_employee_count TEXT,
  ADD COLUMN IF NOT EXISTS contractor_service_area TEXT;

-- Detailed certifications (JSONB for structured data)
ALTER TABLE contractor_bids
  ADD COLUMN IF NOT EXISTS contractor_certifications_detailed JSONB;

-- Comments
COMMENT ON COLUMN contractor_bids.disposal_cost IS 'Cost for disposal of old equipment';
COMMENT ON COLUMN contractor_bids.electrical_cost IS 'Cost for electrical work';
COMMENT ON COLUMN contractor_bids.deposit_required_flag IS 'Whether a deposit is required (boolean)';
COMMENT ON COLUMN contractor_bids.compressor_warranty_years IS 'Compressor warranty duration in years';
COMMENT ON COLUMN contractor_bids.quote_date IS 'Date the quote was issued';
COMMENT ON COLUMN contractor_bids.contractor_employee_count IS 'Estimated employee count';
COMMENT ON COLUMN contractor_bids.contractor_service_area IS 'Geographic service area';
COMMENT ON COLUMN contractor_bids.contractor_certifications_detailed IS 'Detailed certifications JSON: nate_certified, epa_608_certified, bpi_certified, manufacturer_authorized[], other_certifications[]';
