-- ============================================================
-- Migration 009: Schema Audit Fixes
-- Fixes column name discrepancies found during V2 audit
-- Applied: 2026-02-22
-- ============================================================

-- Fix 1: bid_faqs — rename faq_category → category (matches spec + V1 migration 028 intent)
ALTER TABLE bid_faqs RENAME COLUMN faq_category TO category;

-- Fix 2: bid_faqs — add missing sources column (in spec, never created in V2 migration)
ALTER TABLE bid_faqs ADD COLUMN IF NOT EXISTS sources TEXT[];

-- Fix 3: project_faqs — rename faq_category → category (same naming fix)
ALTER TABLE project_faqs RENAME COLUMN faq_category TO category;

-- ============================================================
-- No changes needed for:
--   contractor_installation_reviews.bid_id       (DB name is correct; spec updated)
--   contractor_installation_reviews.user_id      (DB has it; spec updated to add it)
--   project_qii_checklist.checklist_item_key     (DB name is correct; spec updated)
--   project_qii_checklist.photo_url              (DB has it; spec updated to add it)
--   project_qii_checklist.updated_at             (DB has it; spec updated to add it)
-- ============================================================
