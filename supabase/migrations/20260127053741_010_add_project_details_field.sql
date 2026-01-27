/*
  # Add project details field to projects table

  1. Changes
    - Add `project_details` column to `projects` table
      - Type: text
      - Nullable: true (optional field)
      - Purpose: Stores open-ended homeowner input about their home, priorities, and contractor preferences
  
  2. Notes
    - This field allows homeowners to provide detailed context about their project
    - Can include information about home characteristics, personal priorities, budget considerations, contractor preferences, etc.
    - No character limit to accommodate varying levels of detail
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'project_details'
  ) THEN
    ALTER TABLE projects ADD COLUMN project_details text;
  END IF;
END $$;
