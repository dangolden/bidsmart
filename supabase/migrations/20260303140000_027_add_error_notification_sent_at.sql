-- Add error_notification_sent_at column to projects table
-- Used for idempotent error notification emails:
-- Only send one "we're working on it" email per project
ALTER TABLE projects ADD COLUMN IF NOT EXISTS error_notification_sent_at TIMESTAMPTZ;

-- Allow the column to be read via the admin_stats view / RLS
COMMENT ON COLUMN projects.error_notification_sent_at IS 'Timestamp when error notification was sent to user (for idempotency)';
