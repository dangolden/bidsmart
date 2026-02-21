-- ============================================================================
-- Migration: Add Missing Contractor Researcher Columns
-- Created: 2026-02-21
-- Description: Adds columns for Contractor Researcher output fields that were
--              missing from contractor_bids table
-- ============================================================================

-- ============================================
-- ADD MISSING CONTRACTOR RESEARCHER COLUMNS
-- ============================================

ALTER TABLE contractor_bids
  ADD COLUMN IF NOT EXISTS contractor_license_status TEXT,
  ADD COLUMN IF NOT EXISTS contractor_license_expiration_date DATE,
  ADD COLUMN IF NOT EXISTS contractor_research_confidence INTEGER,
  ADD COLUMN IF NOT EXISTS contractor_verification_date DATE,
  ADD COLUMN IF NOT EXISTS contractor_research_notes TEXT;

-- Comments
COMMENT ON COLUMN contractor_bids.contractor_license_status IS 'License status: Active, Inactive, Expired (from Contractor Researcher)';
COMMENT ON COLUMN contractor_bids.contractor_license_expiration_date IS 'License expiration date (from Contractor Researcher)';
COMMENT ON COLUMN contractor_bids.contractor_research_confidence IS 'Research confidence 0-100 (from Contractor Researcher)';
COMMENT ON COLUMN contractor_bids.contractor_verification_date IS 'Date contractor was researched (from Contractor Researcher)';
COMMENT ON COLUMN contractor_bids.contractor_research_notes IS 'Research notes explaining sources and limitations (from Contractor Researcher)';

-- ============================================
-- NOTE ON FIELD NAME TRANSFORMATION
-- ============================================
-- The Contractor Researcher node outputs unprefixed field names:
--   license_status, license_expiration_date, research_confidence, 
--   verification_date, research_notes, google_rating, yelp_rating, etc.
-- 
-- The "Send data to supabase" AGENT node must transform these to prefixed names:
--   contractor_license_status, contractor_license_expiration_date,
--   contractor_research_confidence, contractor_verification_date,
--   contractor_research_notes, contractor_google_rating, etc.
--
-- This transformation is handled by the AI agent in MindPal, not by this migration.
-- ============================================
