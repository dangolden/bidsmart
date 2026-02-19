-- ============================================================================
-- Migration: Fix MindPal Column Name Mismatches
-- Created: 2026-02-18
-- Description: Aligns column names with MindPal v10 workflow expectations
-- ============================================================================

-- ============================================
-- FIX 1: bid_questions - Add missing columns
-- MindPal expects these columns that don't exist
-- ============================================

ALTER TABLE bid_questions
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS context TEXT,
  ADD COLUMN IF NOT EXISTS triggered_by TEXT,
  ADD COLUMN IF NOT EXISTS good_answer_looks_like TEXT,
  ADD COLUMN IF NOT EXISTS concerning_answer_looks_like TEXT;

COMMENT ON COLUMN bid_questions.category IS 'MindPal category field (parallel to question_category)';
COMMENT ON COLUMN bid_questions.context IS 'Additional context about why this question matters';
COMMENT ON COLUMN bid_questions.triggered_by IS 'What triggered this question (missing data, inconsistency, etc.)';
COMMENT ON COLUMN bid_questions.good_answer_looks_like IS 'Example of a satisfactory answer';
COMMENT ON COLUMN bid_questions.concerning_answer_looks_like IS 'Example of a concerning answer';

-- ============================================
-- FIX 2: bid_faqs - Rename faq_category to category
-- MindPal expects 'category', we created 'faq_category'
-- ============================================

ALTER TABLE bid_faqs 
  RENAME COLUMN faq_category TO category;

-- ============================================
-- FIX 3: project_faqs - Rename faq_category to category
-- MindPal expects 'category', we created 'faq_category'
-- ============================================

ALTER TABLE project_faqs 
  RENAME COLUMN faq_category TO category;

-- Update index names to match new column names
DROP INDEX IF EXISTS idx_bid_faqs_faq_category;
DROP INDEX IF EXISTS idx_project_faqs_faq_category;

CREATE INDEX IF NOT EXISTS idx_bid_faqs_category ON bid_faqs(category);
CREATE INDEX IF NOT EXISTS idx_project_faqs_category ON project_faqs(category);
