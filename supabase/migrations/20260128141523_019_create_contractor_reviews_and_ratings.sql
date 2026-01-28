/*
  # Contractor Installation Reviews and Rating System

  ## Overview
  Transform the verification system from interactive checklist to two-part quality assurance:
  1. Contractor-facing checklist document (downloaded and given to contractor before work)
  2. Post-installation survey collecting detailed feedback about contractor performance

  ## New Tables
  - `contractor_installation_reviews`
    - `id` (uuid, primary key)
    - `project_id` (uuid, foreign key to projects)
    - `contractor_bid_id` (uuid, foreign key to contractor_bids)
    - `user_id` (uuid, foreign key to users_ext)
    - `overall_rating` (integer 1-5) - Overall satisfaction
    - `used_checklist` (boolean) - Did contractor complete the provided checklist
    - `checklist_completeness_rating` (integer 1-5) - How well they completed it
    - `quality_of_work_rating` (integer 1-5) - Installation quality
    - `professionalism_rating` (integer 1-5) - Professional conduct
    - `communication_rating` (integer 1-5) - Communication throughout project
    - `timeliness_rating` (integer 1-5) - On-time performance
    - `would_recommend` (boolean) - Would recommend to others
    - `completed_on_time` (boolean) - Project finished on schedule
    - `stayed_within_budget` (boolean) - No unexpected costs
    - `issues_encountered` (text[]) - Array of issues
    - `positive_comments` (text) - What went well
    - `improvement_suggestions` (text) - Constructive feedback
    - `critical_items_verified` (boolean) - All critical safety/quality items checked
    - `photo_documentation_provided` (boolean) - Contractor provided photos
    - `created_at`, `updated_at` (timestamptz)

  ## New Views
  - `contractor_rating_summary` - Aggregated ratings per contractor

  ## Security
  - Enable RLS on contractor_installation_reviews
  - Users can read their own reviews
  - Users can insert reviews for their projects
  - Public can read aggregated ratings
  - Indexes for efficient contractor lookups

  ## Important Notes
  1. Reviews are tied to specific projects and contractor bids
  2. Ratings are 1-5 scale (5 being best)
  3. Aggregated ratings update contractor_switch_rating automatically
  4. Checklist completeness rating is optional (only if used_checklist is true)
*/

-- ============================================
-- CREATE CONTRACTOR INSTALLATION REVIEWS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS contractor_installation_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  contractor_bid_id UUID REFERENCES contractor_bids(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users_ext(id) ON DELETE CASCADE NOT NULL,
  
  -- Overall ratings (1-5 scale)
  overall_rating INTEGER CHECK (overall_rating >= 1 AND overall_rating <= 5) NOT NULL,
  quality_of_work_rating INTEGER CHECK (quality_of_work_rating >= 1 AND quality_of_work_rating <= 5) NOT NULL,
  professionalism_rating INTEGER CHECK (professionalism_rating >= 1 AND professionalism_rating <= 5) NOT NULL,
  communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5) NOT NULL,
  timeliness_rating INTEGER CHECK (timeliness_rating >= 1 AND timeliness_rating <= 5) NOT NULL,
  
  -- Checklist usage
  used_checklist BOOLEAN DEFAULT false NOT NULL,
  checklist_completeness_rating INTEGER CHECK (checklist_completeness_rating IS NULL OR (checklist_completeness_rating >= 1 AND checklist_completeness_rating <= 5)),
  
  -- Yes/No questions
  would_recommend BOOLEAN NOT NULL,
  completed_on_time BOOLEAN NOT NULL,
  stayed_within_budget BOOLEAN NOT NULL,
  critical_items_verified BOOLEAN NOT NULL,
  photo_documentation_provided BOOLEAN NOT NULL,
  
  -- Detailed feedback
  issues_encountered TEXT[] DEFAULT '{}',
  positive_comments TEXT,
  improvement_suggestions TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraint: One review per project
  UNIQUE(project_id)
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_contractor_reviews_bid_id 
  ON contractor_installation_reviews(contractor_bid_id);

CREATE INDEX IF NOT EXISTS idx_contractor_reviews_user_id 
  ON contractor_installation_reviews(user_id);

CREATE INDEX IF NOT EXISTS idx_contractor_reviews_created_at 
  ON contractor_installation_reviews(created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE contractor_installation_reviews ENABLE ROW LEVEL SECURITY;

-- Users can read their own reviews
CREATE POLICY "Users can read own reviews"
  ON contractor_installation_reviews
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can insert reviews for their own projects
CREATE POLICY "Users can create reviews for own projects"
  ON contractor_installation_reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Users can update their own reviews (within reason - maybe 30 days?)
CREATE POLICY "Users can update own reviews"
  ON contractor_installation_reviews
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Allow anonymous/authenticated users to read aggregated review data
-- This is handled through the view below

-- ============================================
-- AGGREGATED CONTRACTOR RATINGS VIEW
-- ============================================

CREATE OR REPLACE VIEW contractor_rating_summary AS
SELECT 
  cb.contractor_company,
  cb.contractor_name,
  cb.contractor_license,
  cb.contractor_license_state,
  COUNT(cir.id) AS total_reviews,
  ROUND(AVG(cir.overall_rating)::numeric, 2) AS avg_overall_rating,
  ROUND(AVG(cir.quality_of_work_rating)::numeric, 2) AS avg_quality_rating,
  ROUND(AVG(cir.professionalism_rating)::numeric, 2) AS avg_professionalism_rating,
  ROUND(AVG(cir.communication_rating)::numeric, 2) AS avg_communication_rating,
  ROUND(AVG(cir.timeliness_rating)::numeric, 2) AS avg_timeliness_rating,
  ROUND(AVG(CASE WHEN cir.used_checklist THEN cir.checklist_completeness_rating ELSE NULL END)::numeric, 2) AS avg_checklist_rating,
  ROUND((SUM(CASE WHEN cir.would_recommend THEN 1 ELSE 0 END)::numeric / COUNT(cir.id)) * 100, 1) AS recommendation_percentage,
  ROUND((SUM(CASE WHEN cir.completed_on_time THEN 1 ELSE 0 END)::numeric / COUNT(cir.id)) * 100, 1) AS on_time_percentage,
  ROUND((SUM(CASE WHEN cir.stayed_within_budget THEN 1 ELSE 0 END)::numeric / COUNT(cir.id)) * 100, 1) AS within_budget_percentage,
  ROUND((SUM(CASE WHEN cir.used_checklist THEN 1 ELSE 0 END)::numeric / COUNT(cir.id)) * 100, 1) AS checklist_usage_percentage,
  MAX(cir.created_at) AS most_recent_review_date
FROM contractor_bids cb
LEFT JOIN contractor_installation_reviews cir ON cb.id = cir.contractor_bid_id
GROUP BY cb.contractor_company, cb.contractor_name, cb.contractor_license, cb.contractor_license_state
HAVING COUNT(cir.id) > 0;

-- ============================================
-- FUNCTION TO UPDATE CONTRACTOR SWITCH RATING
-- ============================================

-- This function updates the contractor_switch_rating in contractor_bids
-- whenever a new review is submitted
CREATE OR REPLACE FUNCTION update_contractor_switch_rating()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the contractor_switch_rating based on average overall_rating
  UPDATE contractor_bids
  SET contractor_switch_rating = (
    SELECT ROUND(AVG(overall_rating)::numeric, 2)
    FROM contractor_installation_reviews
    WHERE contractor_bid_id = NEW.contractor_bid_id
  )
  WHERE id = NEW.contractor_bid_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update ratings
DROP TRIGGER IF EXISTS trigger_update_contractor_rating ON contractor_installation_reviews;
CREATE TRIGGER trigger_update_contractor_rating
  AFTER INSERT OR UPDATE ON contractor_installation_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_contractor_switch_rating();

-- ============================================
-- GRANT PERMISSIONS FOR VIEW
-- ============================================

-- Allow authenticated and anonymous users to read aggregated ratings
GRANT SELECT ON contractor_rating_summary TO authenticated, anon;