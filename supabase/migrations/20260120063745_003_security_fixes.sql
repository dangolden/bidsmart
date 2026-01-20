/*
  # Security Fixes Migration

  1. Index Fixes
    - Add indexes for unindexed foreign keys to improve query performance:
      - bid_analysis.project_id
      - bid_analysis.recommended_bid_id
      - mindpal_extractions.mapped_bid_id
      - mindpal_extractions.pdf_upload_id
      - pdf_uploads.extracted_bid_id
      - project_qii_checklist.checklist_item_id
      - project_rebates.rebate_program_id
      - projects.selected_bid_id

  2. RLS Enablement
    - Enable Row Level Security on all tables that have policies defined

  3. Function Security
    - Set immutable search_path on functions to prevent search path injection
*/

-- =============================================
-- SECTION 1: Add indexes for unindexed foreign keys
-- =============================================

CREATE INDEX IF NOT EXISTS idx_bid_analysis_project_id 
  ON public.bid_analysis(project_id);

CREATE INDEX IF NOT EXISTS idx_bid_analysis_recommended_bid_id 
  ON public.bid_analysis(recommended_bid_id);

CREATE INDEX IF NOT EXISTS idx_mindpal_extractions_mapped_bid_id 
  ON public.mindpal_extractions(mapped_bid_id);

CREATE INDEX IF NOT EXISTS idx_mindpal_extractions_pdf_upload_id 
  ON public.mindpal_extractions(pdf_upload_id);

CREATE INDEX IF NOT EXISTS idx_pdf_uploads_extracted_bid_id 
  ON public.pdf_uploads(extracted_bid_id);

CREATE INDEX IF NOT EXISTS idx_project_qii_checklist_item_id 
  ON public.project_qii_checklist(checklist_item_id);

CREATE INDEX IF NOT EXISTS idx_project_rebates_program_id 
  ON public.project_rebates(rebate_program_id);

CREATE INDEX IF NOT EXISTS idx_projects_selected_bid_id 
  ON public.projects(selected_bid_id);

-- =============================================
-- SECTION 2: Enable RLS on all tables with policies
-- =============================================

ALTER TABLE public.users_ext ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bid_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bid_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bid_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdf_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mindpal_extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rebate_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_rebates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qii_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_qii_checklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bid_questions ENABLE ROW LEVEL SECURITY;

-- =============================================
-- SECTION 3: Fix function search paths
-- =============================================

-- Drop existing functions
DROP FUNCTION IF EXISTS public.update_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.calculate_bid_scores() CASCADE;
DROP FUNCTION IF EXISTS public.trigger_recalculate_scores() CASCADE;
DROP FUNCTION IF EXISTS public.get_project_summary(uuid);

-- Recreate update_updated_at with secure search_path
CREATE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate calculate_bid_scores with secure search_path
CREATE FUNCTION public.calculate_bid_scores()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  avg_price numeric;
  max_warranty int;
  max_seer numeric;
BEGIN
  SELECT AVG(total_bid_amount), MAX(equipment_warranty_years), MAX(
    (SELECT MAX(seer2_rating) FROM public.bid_equipment WHERE bid_id = cb.id)
  )
  INTO avg_price, max_warranty, max_seer
  FROM public.contractor_bids cb
  WHERE project_id = NEW.project_id;

  IF avg_price IS NOT NULL AND avg_price > 0 THEN
    NEW.value_score = ROUND((avg_price / NULLIF(NEW.total_bid_amount, 0)) * 100);
  END IF;

  IF max_warranty IS NOT NULL AND max_warranty > 0 THEN
    NEW.quality_score = ROUND((COALESCE(NEW.equipment_warranty_years, 0)::numeric / max_warranty) * 100);
  END IF;

  NEW.completeness_score = (
    CASE WHEN NEW.contractor_name IS NOT NULL THEN 10 ELSE 0 END +
    CASE WHEN NEW.total_bid_amount IS NOT NULL THEN 20 ELSE 0 END +
    CASE WHEN NEW.equipment_cost IS NOT NULL THEN 10 ELSE 0 END +
    CASE WHEN NEW.labor_cost IS NOT NULL THEN 10 ELSE 0 END +
    CASE WHEN NEW.labor_warranty_years IS NOT NULL THEN 10 ELSE 0 END +
    CASE WHEN NEW.equipment_warranty_years IS NOT NULL THEN 10 ELSE 0 END +
    CASE WHEN NEW.estimated_days IS NOT NULL THEN 10 ELSE 0 END +
    CASE WHEN array_length(NEW.inclusions, 1) > 0 THEN 10 ELSE 0 END +
    CASE WHEN NEW.contractor_license IS NOT NULL THEN 10 ELSE 0 END
  );

  NEW.overall_score = ROUND(
    (COALESCE(NEW.value_score, 0) * 0.4) +
    (COALESCE(NEW.quality_score, 0) * 0.3) +
    (COALESCE(NEW.completeness_score, 0) * 0.3)
  );

  RETURN NEW;
END;
$$;

-- Recreate trigger_recalculate_scores with secure search_path
CREATE FUNCTION public.trigger_recalculate_scores()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.contractor_bids
  SET updated_at = now()
  WHERE project_id = NEW.project_id
    AND id != NEW.id;
  RETURN NEW;
END;
$$;

-- Recreate get_project_summary with secure search_path
CREATE FUNCTION public.get_project_summary(p_project_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'project', row_to_json(p.*),
    'bids', (
      SELECT json_agg(row_to_json(b.*))
      FROM public.contractor_bids b
      WHERE b.project_id = p.id
    ),
    'requirements', (
      SELECT row_to_json(r.*)
      FROM public.project_requirements r
      WHERE r.project_id = p.id
    ),
    'stats', json_build_object(
      'total_bids', (SELECT COUNT(*) FROM public.contractor_bids WHERE project_id = p.id),
      'avg_price', (SELECT AVG(total_bid_amount) FROM public.contractor_bids WHERE project_id = p.id),
      'lowest_price', (SELECT MIN(total_bid_amount) FROM public.contractor_bids WHERE project_id = p.id),
      'highest_price', (SELECT MAX(total_bid_amount) FROM public.contractor_bids WHERE project_id = p.id)
    )
  )
  INTO result
  FROM public.projects p
  WHERE p.id = p_project_id;

  RETURN result;
END;
$$;

-- =============================================
-- SECTION 4: Recreate triggers that were dropped with CASCADE
-- =============================================

-- Recreate updated_at triggers for all tables that need them
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.users_ext
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.contractor_bids
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.bid_analysis
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.pdf_uploads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.rebate_programs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.project_rebates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.project_qii_checklist
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.project_requirements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Recreate bid score calculation triggers
CREATE TRIGGER calculate_scores
  BEFORE INSERT OR UPDATE ON public.contractor_bids
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_bid_scores();

CREATE TRIGGER recalculate_other_scores
  AFTER INSERT ON public.contractor_bids
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_recalculate_scores();
