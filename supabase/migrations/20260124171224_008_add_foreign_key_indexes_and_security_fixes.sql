/*
  # Add Foreign Key Indexes and Security Fixes

  ## Changes
  
  1. New Indexes for Foreign Keys
    - `idx_bid_analysis_project_id` - Improves performance for project-based analysis queries
    - `idx_bid_analysis_recommended_bid_id` - Improves performance for recommended bid lookups
    - `idx_bid_line_items_bid_id` - Improves performance for line item queries by bid
    - `idx_mindpal_extractions_mapped_bid_id` - Improves performance for extraction-to-bid mappings
    - `idx_mindpal_extractions_pdf_upload_id` - Improves performance for extraction queries by upload
    - `idx_pdf_uploads_extracted_bid_id` - Improves performance for upload-to-bid lookups
    - `idx_project_qii_checklist_item_id` - Improves performance for checklist item queries
    - `idx_project_rebates_rebate_program_id` - Improves performance for rebate program queries
    - `idx_projects_selected_bid_id` - Improves performance for selected bid lookups

  2. Cleanup
    - Remove unused index `idx_pdf_mindpal_run_id`

  3. Function Security
    - Fix search_path for `calculate_bid_scores` function to prevent schema injection

  ## Important Notes
  - These indexes significantly improve query performance and prevent table scans
  - All indexes are created with IF NOT EXISTS for safety
  - Foreign key indexes are critical for query optimization
  
  ## Auth Configuration Notes (Manual Steps Required)
  The following settings should be updated in the Supabase Dashboard:
  
  1. Auth DB Connection Strategy:
     - Navigate to: Database Settings > Connection Pooling
     - Change Auth connection strategy from fixed (10) to percentage-based
     - Recommended: 10% of available connections
  
  2. Leaked Password Protection:
     - Navigate to: Authentication > Settings > Password
     - Enable "Check for leaked passwords" (HaveIBeenPwned integration)
     - This prevents users from using compromised passwords
*/

-- ============================================
-- ADD FOREIGN KEY INDEXES
-- ============================================

-- Index for bid_analysis.project_id
CREATE INDEX IF NOT EXISTS idx_bid_analysis_project_id 
  ON bid_analysis (project_id);

-- Index for bid_analysis.recommended_bid_id
CREATE INDEX IF NOT EXISTS idx_bid_analysis_recommended_bid_id 
  ON bid_analysis (recommended_bid_id);

-- Index for bid_line_items.bid_id
CREATE INDEX IF NOT EXISTS idx_bid_line_items_bid_id 
  ON bid_line_items (bid_id);

-- Index for mindpal_extractions.mapped_bid_id
CREATE INDEX IF NOT EXISTS idx_mindpal_extractions_mapped_bid_id 
  ON mindpal_extractions (mapped_bid_id);

-- Index for mindpal_extractions.pdf_upload_id
CREATE INDEX IF NOT EXISTS idx_mindpal_extractions_pdf_upload_id 
  ON mindpal_extractions (pdf_upload_id);

-- Index for pdf_uploads.extracted_bid_id
CREATE INDEX IF NOT EXISTS idx_pdf_uploads_extracted_bid_id 
  ON pdf_uploads (extracted_bid_id);

-- Index for project_qii_checklist.checklist_item_id
CREATE INDEX IF NOT EXISTS idx_project_qii_checklist_item_id 
  ON project_qii_checklist (checklist_item_id);

-- Index for project_rebates.rebate_program_id
CREATE INDEX IF NOT EXISTS idx_project_rebates_rebate_program_id 
  ON project_rebates (rebate_program_id);

-- Index for projects.selected_bid_id
CREATE INDEX IF NOT EXISTS idx_projects_selected_bid_id 
  ON projects (selected_bid_id);

-- ============================================
-- REMOVE UNUSED INDEXES
-- ============================================

-- Remove unused index on pdf_uploads.mindpal_run_id
DROP INDEX IF EXISTS idx_pdf_mindpal_run_id;

-- ============================================
-- FIX FUNCTION SEARCH PATH
-- ============================================

-- Drop existing function and recreate with secure search_path
DROP FUNCTION IF EXISTS calculate_bid_scores(uuid);

CREATE FUNCTION calculate_bid_scores(p_project_id uuid)
RETURNS TABLE (
  bid_id uuid,
  overall_score numeric,
  value_score numeric,
  quality_score numeric,
  completeness_score numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_avg_price numeric;
  v_min_price numeric;
  v_max_price numeric;
BEGIN
  -- Get price statistics
  SELECT 
    AVG(total_bid_amount),
    MIN(total_bid_amount),
    MAX(total_bid_amount)
  INTO v_avg_price, v_min_price, v_max_price
  FROM public.contractor_bids
  WHERE project_id = p_project_id
    AND total_bid_amount > 0;

  -- Return scores for each bid
  RETURN QUERY
  SELECT 
    cb.id AS bid_id,
    -- Overall score (average of all scores)
    (
      COALESCE(
        CASE 
          WHEN v_max_price > v_min_price THEN
            100 - ((cb.total_bid_amount - v_min_price) / (v_max_price - v_min_price) * 50)
          ELSE 75
        END, 
        75
      ) +
      COALESCE((cb.contractor_switch_rating * 20), 50) +
      COALESCE(
        CASE 
          WHEN cb.labor_warranty_years >= 5 THEN 90
          WHEN cb.labor_warranty_years >= 2 THEN 70
          ELSE 50
        END,
        50
      ) +
      COALESCE(
        (
          SELECT AVG(
            CASE 
              WHEN description IS NOT NULL AND description != '' THEN 25
              ELSE 0
            END +
            CASE 
              WHEN unit_price IS NOT NULL THEN 25
              ELSE 0
            END
          ) * 2
          FROM public.bid_line_items
          WHERE bid_id = cb.id
        ),
        50
      )
    ) / 4 AS overall_score,
    
    -- Value score (price relative to average)
    COALESCE(
      CASE 
        WHEN v_avg_price > 0 THEN
          GREATEST(0, 100 - ABS(cb.total_bid_amount - v_avg_price) / v_avg_price * 100)
        ELSE 75
      END,
      75
    ) AS value_score,
    
    -- Quality score (based on ratings and warranties)
    (
      COALESCE((cb.contractor_switch_rating * 20), 50) +
      COALESCE(
        CASE 
          WHEN cb.labor_warranty_years >= 5 THEN 90
          WHEN cb.labor_warranty_years >= 2 THEN 70
          ELSE 50
        END,
        50
      )
    ) / 2 AS quality_score,
    
    -- Completeness score (how much data is filled in)
    COALESCE(
      (
        SELECT AVG(
          CASE 
            WHEN description IS NOT NULL AND description != '' THEN 25
            ELSE 0
          END +
          CASE 
            WHEN unit_price IS NOT NULL THEN 25
            ELSE 0
          END +
          CASE 
            WHEN brand IS NOT NULL THEN 25
            ELSE 0
          END +
          CASE 
            WHEN model_number IS NOT NULL THEN 25
            ELSE 0
          END
        )
        FROM public.bid_line_items
        WHERE bid_id = cb.id
      ),
      50
    ) AS completeness_score
    
  FROM public.contractor_bids cb
  WHERE cb.project_id = p_project_id;
END;
$$;