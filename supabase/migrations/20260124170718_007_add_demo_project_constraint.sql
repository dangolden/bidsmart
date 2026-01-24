/*
  # Add Demo Project Constraint

  ## Changes
  1. New Column
    - `is_demo` (boolean) - Flag to identify demo projects
      - Default: false
      - Used to distinguish demo projects from real user projects

  2. Constraints
    - Unique partial index on (user_id) WHERE is_demo = true
    - Ensures each user can only have ONE demo project
    - Prevents duplicate demo data creation

  3. Data Cleanup
    - Removes duplicate existing demo projects (keeps most recent)
    - Marks existing demo projects with is_demo = true

  4. Security
    - No RLS changes needed (inherits from existing policies)

  ## Important Notes
  - Database-enforced uniqueness prevents race conditions
  - Multiple "Try Demo" clicks will be caught by constraint violation
  - Application code handles constraint violations gracefully
*/

-- Add is_demo column to projects table
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;

-- Clean up existing duplicate demo projects
-- Keep only the most recent demo project per user
DELETE FROM projects 
WHERE id IN (
  SELECT id FROM (
    SELECT id, 
           ROW_NUMBER() OVER (
             PARTITION BY user_id 
             ORDER BY created_at DESC
           ) as rn
    FROM projects 
    WHERE project_name = 'Demo: Heat Pump Comparison'
  ) t
  WHERE t.rn > 1
);

-- Mark existing demo projects
UPDATE projects 
SET is_demo = true 
WHERE project_name = 'Demo: Heat Pump Comparison';

-- Create unique partial index to ensure one demo per user
-- This will prevent duplicate demos even with race conditions
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_demo_per_user 
  ON projects (user_id) 
  WHERE is_demo = true;