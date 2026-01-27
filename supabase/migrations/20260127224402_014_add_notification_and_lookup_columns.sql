/*
  # Add Notification Email and Project Lookup Support
  
  ## Overview
  This migration adds support for:
  1. Email notifications when analysis completes
  2. Project lookup by notification email
  3. Tracking when submissions are queued
  
  ## New Columns on projects table
  - `notification_email` (text): Email address to notify when analysis completes
  - `notify_on_completion` (boolean): Whether user opted in for notification
  - `notification_sent_at` (timestamptz): When notification was sent
  - `analysis_queued_at` (timestamptz): When analysis was submitted to queue
  - `rerun_count` (integer): Number of times analysis has been re-run
  
  ## Security
  - Index added on notification_email for efficient lookups
  - Existing RLS policies cover these columns
  
  ## Important Notes
  - notification_email is separate from users_ext email to allow per-project notifications
  - notify_on_completion defaults to false (opt-in)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'notification_email'
  ) THEN
    ALTER TABLE projects ADD COLUMN notification_email TEXT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'notify_on_completion'
  ) THEN
    ALTER TABLE projects ADD COLUMN notify_on_completion BOOLEAN DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'notification_sent_at'
  ) THEN
    ALTER TABLE projects ADD COLUMN notification_sent_at TIMESTAMPTZ;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'analysis_queued_at'
  ) THEN
    ALTER TABLE projects ADD COLUMN analysis_queued_at TIMESTAMPTZ;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'rerun_count'
  ) THEN
    ALTER TABLE projects ADD COLUMN rerun_count INTEGER DEFAULT 0;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_projects_notification_email 
  ON projects(notification_email) 
  WHERE notification_email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_projects_notify_pending 
  ON projects(notify_on_completion, notification_sent_at) 
  WHERE notify_on_completion = true AND notification_sent_at IS NULL;

COMMENT ON COLUMN projects.notification_email IS 'Email address to notify when analysis completes';
COMMENT ON COLUMN projects.notify_on_completion IS 'User opted in for completion notification';
COMMENT ON COLUMN projects.notification_sent_at IS 'Timestamp when notification email was sent';
COMMENT ON COLUMN projects.analysis_queued_at IS 'Timestamp when analysis was submitted to processing queue';
COMMENT ON COLUMN projects.rerun_count IS 'Number of times analysis has been re-run with additional bids';
