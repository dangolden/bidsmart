/*
  # Optimize RLS Policies and Clean Up Unused Indexes

  ## 1. RLS Performance Optimization
  All RLS policies have been updated to use `(select auth.uid())` instead of `auth.uid()` 
  to prevent re-evaluation for each row, significantly improving query performance at scale.
  
  Updated policies for tables:
    - users_ext (users_ext_policy)
    - projects (projects_policy)
    - contractor_bids (bids_policy)
    - bid_line_items (line_items_policy)
    - bid_equipment (equipment_policy)
    - bid_analysis (analysis_policy)
    - pdf_uploads (pdf_policy)
    - mindpal_extractions (extractions_policy)
    - project_rebates (project_rebates_policy)
    - project_qii_checklist (project_qii_policy)
    - bid_questions (bid_questions_policy)

  ## 2. Index Cleanup
  Removed unused indexes to improve write performance and reduce storage:
    - Rebate programs: idx_rebates_active, idx_rebates_states
    - Contractor bids: idx_bids_contractor, idx_bids_amount, idx_bids_score
    - Bid line items: idx_line_items_bid, idx_line_items_type
    - Bid equipment: idx_equipment_brand
    - Bid analysis: idx_bid_analysis_project_id, idx_bid_analysis_recommended_bid_id
    - PDF uploads: idx_pdf_status, idx_pdf_mindpal, idx_pdf_uploads_extracted_bid_id
    - MindPal extractions: idx_mindpal_extractions_mapped_bid_id, idx_mindpal_extractions_pdf_upload_id
    - Project rebates: idx_project_rebates_program_id
    - QII checklist: idx_qii_items_category, idx_project_qii_checklist_item_id
    - Bid questions: idx_bid_questions_unanswered
    - Users: idx_users_ext_zip
    - Projects: idx_projects_status, idx_projects_created, idx_projects_selected_bid_id

  ## 3. Manual Configuration Changes Required
  
  **IMPORTANT**: The following settings must be configured in the Supabase Dashboard:
  
  ### Auth Connection Strategy
  Navigate to: Project Settings > Database > Connection Pooling
  - Change Auth server connection allocation from fixed number (10) to percentage-based strategy
  - This allows automatic scaling of auth connections with instance size
  
  ### Leaked Password Protection
  Navigate to: Authentication > Policies > Password
  - Enable "Leaked Password Protection" 
  - This checks passwords against HaveIBeenPwned.org database to prevent compromised passwords
  
  ## 4. Security Notes
  - Function search path security was already fixed in migration 003_security_fixes
  - All RLS policies maintain the same access control logic, just optimized for performance
  - Demo mode (auth_user_id IS NULL) access is preserved in all policies
*/

-- =============================================
-- SECTION 1: Drop and Recreate RLS Policies with Optimized Performance
-- =============================================

-- Drop all existing policies that need optimization
DROP POLICY IF EXISTS users_ext_policy ON public.users_ext;
DROP POLICY IF EXISTS projects_policy ON public.projects;
DROP POLICY IF EXISTS bids_policy ON public.contractor_bids;
DROP POLICY IF EXISTS line_items_policy ON public.bid_line_items;
DROP POLICY IF EXISTS equipment_policy ON public.bid_equipment;
DROP POLICY IF EXISTS analysis_policy ON public.bid_analysis;
DROP POLICY IF EXISTS pdf_policy ON public.pdf_uploads;
DROP POLICY IF EXISTS extractions_policy ON public.mindpal_extractions;
DROP POLICY IF EXISTS project_rebates_policy ON public.project_rebates;
DROP POLICY IF EXISTS project_qii_policy ON public.project_qii_checklist;
DROP POLICY IF EXISTS bid_questions_policy ON public.bid_questions;

-- Recreate users_ext policy with optimized auth.uid() call
CREATE POLICY users_ext_policy ON public.users_ext
  FOR ALL USING (
    auth_user_id = (select auth.uid())
    OR auth_user_id IS NULL
  );

-- Recreate projects policy with optimized auth.uid() call
CREATE POLICY projects_policy ON public.projects
  FOR ALL USING (
    user_id IN (
      SELECT id FROM public.users_ext 
      WHERE auth_user_id = (select auth.uid())
      OR auth_user_id IS NULL
    )
  );

-- Recreate bids policy with optimized auth.uid() call
CREATE POLICY bids_policy ON public.contractor_bids
  FOR ALL USING (
    project_id IN (
      SELECT id FROM public.projects 
      WHERE user_id IN (
        SELECT id FROM public.users_ext 
        WHERE auth_user_id = (select auth.uid())
        OR auth_user_id IS NULL
      )
    )
  );

-- Recreate line items policy with optimized auth.uid() call
CREATE POLICY line_items_policy ON public.bid_line_items
  FOR ALL USING (
    bid_id IN (
      SELECT id FROM public.contractor_bids 
      WHERE project_id IN (
        SELECT id FROM public.projects 
        WHERE user_id IN (
          SELECT id FROM public.users_ext 
          WHERE auth_user_id = (select auth.uid())
          OR auth_user_id IS NULL
        )
      )
    )
  );

-- Recreate equipment policy with optimized auth.uid() call
CREATE POLICY equipment_policy ON public.bid_equipment
  FOR ALL USING (
    bid_id IN (
      SELECT id FROM public.contractor_bids 
      WHERE project_id IN (
        SELECT id FROM public.projects 
        WHERE user_id IN (
          SELECT id FROM public.users_ext 
          WHERE auth_user_id = (select auth.uid())
          OR auth_user_id IS NULL
        )
      )
    )
  );

-- Recreate analysis policy with optimized auth.uid() call
CREATE POLICY analysis_policy ON public.bid_analysis
  FOR ALL USING (
    project_id IN (
      SELECT id FROM public.projects 
      WHERE user_id IN (
        SELECT id FROM public.users_ext 
        WHERE auth_user_id = (select auth.uid())
        OR auth_user_id IS NULL
      )
    )
  );

-- Recreate pdf uploads policy with optimized auth.uid() call
CREATE POLICY pdf_policy ON public.pdf_uploads
  FOR ALL USING (
    project_id IN (
      SELECT id FROM public.projects 
      WHERE user_id IN (
        SELECT id FROM public.users_ext 
        WHERE auth_user_id = (select auth.uid())
        OR auth_user_id IS NULL
      )
    )
  );

-- Recreate mindpal extractions policy with optimized auth.uid() call
CREATE POLICY extractions_policy ON public.mindpal_extractions
  FOR ALL USING (
    pdf_upload_id IN (
      SELECT id FROM public.pdf_uploads 
      WHERE project_id IN (
        SELECT id FROM public.projects 
        WHERE user_id IN (
          SELECT id FROM public.users_ext 
          WHERE auth_user_id = (select auth.uid())
          OR auth_user_id IS NULL
        )
      )
    )
  );

-- Recreate project rebates policy with optimized auth.uid() call
CREATE POLICY project_rebates_policy ON public.project_rebates
  FOR ALL USING (
    project_id IN (
      SELECT id FROM public.projects 
      WHERE user_id IN (
        SELECT id FROM public.users_ext 
        WHERE auth_user_id = (select auth.uid())
        OR auth_user_id IS NULL
      )
    )
  );

-- Recreate project qii checklist policy with optimized auth.uid() call
CREATE POLICY project_qii_policy ON public.project_qii_checklist
  FOR ALL USING (
    project_id IN (
      SELECT id FROM public.projects 
      WHERE user_id IN (
        SELECT id FROM public.users_ext 
        WHERE auth_user_id = (select auth.uid())
        OR auth_user_id IS NULL
      )
    )
  );

-- Recreate bid questions policy with optimized auth.uid() call
CREATE POLICY bid_questions_policy ON public.bid_questions
  FOR ALL USING (
    bid_id IN (
      SELECT id FROM public.contractor_bids 
      WHERE project_id IN (
        SELECT id FROM public.projects 
        WHERE user_id IN (
          SELECT id FROM public.users_ext 
          WHERE auth_user_id = (select auth.uid())
          OR auth_user_id IS NULL
        )
      )
    )
  );

-- =============================================
-- SECTION 2: Drop Unused Indexes
-- =============================================

-- Rebate programs unused indexes
DROP INDEX IF EXISTS public.idx_rebates_active;
DROP INDEX IF EXISTS public.idx_rebates_states;

-- Contractor bids unused indexes
DROP INDEX IF EXISTS public.idx_bids_contractor;
DROP INDEX IF EXISTS public.idx_bids_amount;
DROP INDEX IF EXISTS public.idx_bids_score;

-- Bid line items unused indexes
DROP INDEX IF EXISTS public.idx_line_items_bid;
DROP INDEX IF EXISTS public.idx_line_items_type;

-- Bid equipment unused indexes
DROP INDEX IF EXISTS public.idx_equipment_brand;

-- Bid analysis unused indexes (these were added in migration 003 but are not being used)
DROP INDEX IF EXISTS public.idx_bid_analysis_project_id;
DROP INDEX IF EXISTS public.idx_bid_analysis_recommended_bid_id;

-- PDF uploads unused indexes
DROP INDEX IF EXISTS public.idx_pdf_status;
DROP INDEX IF EXISTS public.idx_pdf_mindpal;
DROP INDEX IF EXISTS public.idx_pdf_uploads_extracted_bid_id;

-- MindPal extractions unused indexes
DROP INDEX IF EXISTS public.idx_mindpal_extractions_mapped_bid_id;
DROP INDEX IF EXISTS public.idx_mindpal_extractions_pdf_upload_id;

-- Project rebates unused indexes
DROP INDEX IF EXISTS public.idx_project_rebates_program_id;

-- QII checklist unused indexes
DROP INDEX IF EXISTS public.idx_qii_items_category;
DROP INDEX IF EXISTS public.idx_project_qii_checklist_item_id;

-- Bid questions unused indexes
DROP INDEX IF EXISTS public.idx_bid_questions_unanswered;

-- Users unused indexes
DROP INDEX IF EXISTS public.idx_users_ext_zip;

-- Projects unused indexes
DROP INDEX IF EXISTS public.idx_projects_status;
DROP INDEX IF EXISTS public.idx_projects_created;
DROP INDEX IF EXISTS public.idx_projects_selected_bid_id;
