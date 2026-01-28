/*
  # Create User Feedback Table
  
  ## Overview
  This migration creates a table to store user feedback from the early access program.
  Allows tracking of feature requests, bugs, and positive feedback.
  
  ## New Tables
  - `user_feedback`
    - `id` (uuid, primary key)
    - `type` (enum: liked, wishlist, bug)
    - `message` (text)
    - `url` (text): Page URL where feedback was submitted
    - `user_agent` (text): Browser information
    - `timestamp` (timestamptz): When feedback was submitted
    - `created_at` (timestamptz): Database timestamp
  
  ## Security
  - Table is public (write-only from edge function)
  - No authentication required for submissions (encourage participation)
  - Created_at is immutable
*/

CREATE TABLE IF NOT EXISTS user_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('liked', 'wishlist', 'bug')),
  message TEXT NOT NULL,
  url TEXT,
  user_agent TEXT,
  timestamp TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public feedback submissions"
  ON user_feedback
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public feedback viewing for team"
  ON user_feedback
  FOR SELECT
  TO authenticated
  USING (auth.jwt()->>'role' = 'authenticated' OR current_setting('request.jwt.claims')::jsonb->>'sub' IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_user_feedback_type ON user_feedback(type);
CREATE INDEX IF NOT EXISTS idx_user_feedback_created ON user_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_feedback_timestamp ON user_feedback(timestamp DESC);

COMMENT ON TABLE user_feedback IS 'User feedback and feature requests from early access program';
COMMENT ON COLUMN user_feedback.type IS 'Type of feedback: liked (positive), wishlist (feature request), bug (issue report)';
COMMENT ON COLUMN user_feedback.message IS 'The feedback message (max 500 chars)';
COMMENT ON COLUMN user_feedback.url IS 'URL where feedback was submitted from';
COMMENT ON COLUMN user_feedback.user_agent IS 'Browser user agent for debugging';
COMMENT ON COLUMN user_feedback.timestamp IS 'Client-reported timestamp of feedback submission';
