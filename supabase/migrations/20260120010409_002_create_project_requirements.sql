/*
  # Create Project Requirements Table

  1. New Tables
    - `project_requirements`
      - `id` (uuid, primary key)
      - `project_id` (uuid, foreign key to projects)
      - `priority_price` (integer 1-5) - importance of low price
      - `priority_warranty` (integer 1-5) - importance of warranty coverage
      - `priority_efficiency` (integer 1-5) - importance of energy efficiency
      - `priority_timeline` (integer 1-5) - importance of quick installation
      - `priority_reputation` (integer 1-5) - importance of contractor reputation
      - `timeline_urgency` (text) - 'flexible', 'within_month', 'within_2_weeks', 'asap'
      - `budget_range` (text) - optional budget range
      - `specific_concerns` (text[]) - array of specific concerns
      - `must_have_features` (text[]) - required features
      - `nice_to_have_features` (text[]) - preferred but not required features
      - `additional_notes` (text) - freeform notes
      - `completed_at` (timestamptz) - when questionnaire was completed
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on `project_requirements` table
    - Add policies for authenticated users and public access via project ownership
*/

CREATE TABLE IF NOT EXISTS project_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  priority_price integer DEFAULT 3 CHECK (priority_price >= 1 AND priority_price <= 5),
  priority_warranty integer DEFAULT 3 CHECK (priority_warranty >= 1 AND priority_warranty <= 5),
  priority_efficiency integer DEFAULT 3 CHECK (priority_efficiency >= 1 AND priority_efficiency <= 5),
  priority_timeline integer DEFAULT 3 CHECK (priority_timeline >= 1 AND priority_timeline <= 5),
  priority_reputation integer DEFAULT 3 CHECK (priority_reputation >= 1 AND priority_reputation <= 5),
  
  timeline_urgency text DEFAULT 'flexible' CHECK (timeline_urgency IN ('flexible', 'within_month', 'within_2_weeks', 'asap')),
  budget_range text,
  
  specific_concerns text[] DEFAULT '{}',
  must_have_features text[] DEFAULT '{}',
  nice_to_have_features text[] DEFAULT '{}',
  
  additional_notes text,
  completed_at timestamptz,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT unique_project_requirements UNIQUE (project_id)
);

ALTER TABLE project_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own project requirements"
  ON project_requirements
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN users_ext u ON p.user_id = u.id
      WHERE p.id = project_requirements.project_id
    )
  );

CREATE POLICY "Users can insert own project requirements"
  ON project_requirements
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_requirements.project_id
    )
  );

CREATE POLICY "Users can update own project requirements"
  ON project_requirements
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_requirements.project_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_requirements.project_id
    )
  );

CREATE POLICY "Users can delete own project requirements"
  ON project_requirements
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_requirements.project_id
    )
  );

CREATE INDEX IF NOT EXISTS idx_project_requirements_project_id ON project_requirements(project_id);
