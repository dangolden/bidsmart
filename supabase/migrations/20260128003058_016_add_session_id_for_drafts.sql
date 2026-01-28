/*
  # Add Session ID for Draft Project Support

  1. Changes
    - Add `session_id` column to `projects` table for tracking anonymous drafts
    - Add index on `session_id` for fast lookups
    - Add `demo_description` column to projects for demo card descriptions
    
  2. Purpose
    - Enable users to upload PDFs before providing email
    - Draft projects are linked via browser session ID
    - Allow draft recovery when user returns with same browser
    - Support demo project descriptions for Try the Tool section

  3. Security
    - session_id is nullable (only used for drafts)
    - No RLS changes needed - existing policies apply
*/

-- Add session_id column for tracking anonymous draft projects
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'session_id'
  ) THEN
    ALTER TABLE projects ADD COLUMN session_id text;
  END IF;
END $$;

-- Add demo_description column for demo project cards
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'demo_description'
  ) THEN
    ALTER TABLE projects ADD COLUMN demo_description text;
  END IF;
END $$;

-- Create index on session_id for fast draft lookups
CREATE INDEX IF NOT EXISTS idx_projects_session_id ON projects(session_id) WHERE session_id IS NOT NULL;

-- Update existing demo projects with descriptions
UPDATE projects 
SET demo_description = 'See how BidSmart analyzes and compares real heat pump contractor bids side-by-side'
WHERE is_public_demo = true AND demo_description IS NULL;
