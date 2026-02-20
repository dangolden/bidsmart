-- ============================================================================
-- Migration: Add Missing MindPal Output Columns
-- Created: 2026-02-20
-- Description: Adds columns that MindPal v24 outputs but were missing from DB
-- ============================================================================

-- ============================================
-- FIX 1: bid_questions - Add generation_notes
-- MindPal Question Generator outputs this field
-- ============================================

ALTER TABLE bid_questions
  ADD COLUMN IF NOT EXISTS generation_notes TEXT;

COMMENT ON COLUMN bid_questions.generation_notes IS 'Notes from MindPal Question Generator explaining gaps or recommendations';

-- ============================================
-- FIX 2: bid_faqs - Add sources array
-- MindPal Per-Bid FAQ Generator outputs this field
-- ============================================

ALTER TABLE bid_faqs
  ADD COLUMN IF NOT EXISTS sources TEXT[];

COMMENT ON COLUMN bid_faqs.sources IS 'Array of source references for the FAQ answer (e.g., bid document, equipment research)';

-- ============================================
-- Note: generation_confidence and faq_generation_confidence
-- are output by MindPal but are metadata about the generation
-- process, not per-FAQ data. We can choose to not store these
-- as they are not needed for display. If needed later, add:
-- ALTER TABLE bid_faqs ADD COLUMN IF NOT EXISTS generation_confidence INTEGER;
-- ALTER TABLE project_faqs ADD COLUMN IF NOT EXISTS generation_confidence INTEGER;
-- ============================================
