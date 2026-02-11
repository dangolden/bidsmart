/*
  # Analytics Events and Admin Stats
  
  ## Overview
  This migration creates tables and views for admin dashboard functionality:
  - analytics_events: Click/feature tracking
  - admin_stats view: Aggregated platform metrics
  
  ## New Tables
  - `analytics_events`: Track user interactions with features
  
  ## New Views
  - `admin_stats`: Aggregated metrics for admin dashboard
  
  ## Security
  - analytics_events: Public insert, admin-only select
  - admin_stats: Admin-only access
*/

-- Analytics events table for click/feature tracking
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Event identification
  event_type TEXT NOT NULL, -- 'click', 'view', 'action'
  event_name TEXT NOT NULL, -- 'upload_pdf', 'view_comparison', 'download_report', etc.
  event_category TEXT, -- 'upload', 'analysis', 'comparison', 'report'
  
  -- Context
  session_id TEXT, -- Browser session ID
  user_email TEXT, -- Optional user email if known
  project_id UUID, -- Optional project context
  
  -- Event data
  event_data JSONB, -- Additional event-specific data
  
  -- Client info
  page_url TEXT,
  referrer TEXT,
  user_agent TEXT,
  
  -- Timestamps
  client_timestamp TIMESTAMPTZ, -- Client-reported time
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for analytics queries
CREATE INDEX idx_analytics_event_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_event_name ON analytics_events(event_name);
CREATE INDEX idx_analytics_event_category ON analytics_events(event_category);
CREATE INDEX idx_analytics_created_at ON analytics_events(created_at DESC);
CREATE INDEX idx_analytics_session ON analytics_events(session_id);
CREATE INDEX idx_analytics_project ON analytics_events(project_id);

-- RLS for analytics_events
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Allow public inserts (for tracking)
CREATE POLICY "Allow public event tracking"
  ON analytics_events
  FOR INSERT
  WITH CHECK (true);

-- Admin stats view - aggregates key metrics
CREATE OR REPLACE VIEW admin_stats AS
SELECT
  -- Project counts
  (SELECT COUNT(*) FROM projects) AS total_projects,
  (SELECT COUNT(*) FROM projects WHERE status = 'draft') AS draft_projects,
  (SELECT COUNT(*) FROM projects WHERE status = 'analyzing') AS analyzing_projects,
  (SELECT COUNT(*) FROM projects WHERE status = 'comparing') AS comparing_projects,
  (SELECT COUNT(*) FROM projects WHERE status = 'completed') AS completed_projects,
  (SELECT COUNT(*) FROM projects WHERE status NOT IN ('draft', 'cancelled')) AS total_runs,
  
  -- Bid counts
  (SELECT COUNT(*) FROM contractor_bids) AS total_bids,
  (SELECT COUNT(DISTINCT contractor_name) FROM contractor_bids) AS unique_contractors,
  
  -- PDF counts
  (SELECT COUNT(*) FROM pdf_uploads) AS total_pdfs,
  (SELECT COUNT(*) FROM pdf_uploads WHERE status = 'extracted') AS extracted_pdfs,
  (SELECT COUNT(*) FROM pdf_uploads WHERE status = 'failed') AS failed_pdfs,
  
  -- User counts
  (SELECT COUNT(*) FROM users_ext) AS total_users,
  (SELECT COUNT(DISTINCT user_id) FROM projects WHERE created_at > NOW() - INTERVAL '7 days') AS active_users_7d,
  (SELECT COUNT(DISTINCT user_id) FROM projects WHERE created_at > NOW() - INTERVAL '30 days') AS active_users_30d,
  
  -- Feedback counts
  (SELECT COUNT(*) FROM user_feedback WHERE type = 'liked') AS feedback_liked,
  (SELECT COUNT(*) FROM user_feedback WHERE type = 'wishlist') AS feedback_wishlist,
  (SELECT COUNT(*) FROM user_feedback WHERE type = 'bug') AS feedback_bugs,
  
  -- Time-based metrics
  (SELECT COUNT(*) FROM projects WHERE created_at > NOW() - INTERVAL '24 hours') AS projects_24h,
  (SELECT COUNT(*) FROM projects WHERE created_at > NOW() - INTERVAL '7 days') AS projects_7d,
  (SELECT COUNT(*) FROM contractor_bids WHERE created_at > NOW() - INTERVAL '24 hours') AS bids_24h,
  (SELECT COUNT(*) FROM contractor_bids WHERE created_at > NOW() - INTERVAL '7 days') AS bids_7d,
  
  -- Timestamp
  NOW() AS generated_at;

-- Feature usage stats view
CREATE OR REPLACE VIEW feature_usage_stats AS
SELECT
  event_name,
  event_category,
  COUNT(*) AS total_count,
  COUNT(DISTINCT session_id) AS unique_sessions,
  COUNT(DISTINCT user_email) FILTER (WHERE user_email IS NOT NULL) AS unique_users,
  MIN(created_at) AS first_occurrence,
  MAX(created_at) AS last_occurrence,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') AS count_24h,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') AS count_7d
FROM analytics_events
GROUP BY event_name, event_category
ORDER BY total_count DESC;

-- Daily stats view for trends
CREATE OR REPLACE VIEW daily_stats AS
SELECT
  DATE(created_at) AS date,
  COUNT(*) AS projects_created,
  COUNT(DISTINCT user_id) AS unique_users
FROM projects
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Comments
COMMENT ON TABLE analytics_events IS 'User interaction tracking for admin dashboard analytics';
COMMENT ON VIEW admin_stats IS 'Aggregated platform metrics for admin dashboard';
COMMENT ON VIEW feature_usage_stats IS 'Feature usage statistics from analytics events';
COMMENT ON VIEW daily_stats IS 'Daily project creation trends';
