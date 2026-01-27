/*
  # Add Public Demo Projects Support

  1. Schema Changes
    - Add `is_public_demo` column to `projects` table
      - Boolean flag to mark projects as publicly viewable demos
      - Defaults to false for user projects
    
  2. Data Updates
    - Mark existing demo project as public demo
    - Set is_public_demo = true for projects with is_demo = true
  
  3. Security
    - Public demo projects are viewable by all users
    - Public demo projects remain read-only through existing RLS policies
*/

-- Add is_public_demo column to projects table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'is_public_demo'
  ) THEN
    ALTER TABLE projects ADD COLUMN is_public_demo boolean DEFAULT false;
    COMMENT ON COLUMN projects.is_public_demo IS 'Flag to mark projects as publicly viewable demo projects that appear for all users';
  END IF;
END $$;

-- Update existing demo projects to be public demos
UPDATE projects 
SET is_public_demo = true 
WHERE is_demo = true;

-- Create index for efficient querying of public demo projects
CREATE INDEX IF NOT EXISTS idx_projects_public_demo ON projects(is_public_demo) WHERE is_public_demo = true;
