-- ============================================================
-- BidSmart V2 — Chunk F: Admin/System Tables
-- Creates: analytics_events, admin_users, admin_sessions,
--          email_verifications, verified_sessions
-- Plus: verify_admin_password() and validate_admin_session() functions
-- ============================================================

-- ============================================================
-- TABLE 20 (Admin): analytics_events
-- User interaction tracking. Public insert, service role read.
-- ============================================================

CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Event identification
  event_type TEXT NOT NULL,               -- click, view, action
  event_name TEXT NOT NULL,               -- upload_pdf, view_comparison, download_report, etc.
  event_category TEXT,                    -- upload, analysis, comparison, report

  -- Context
  session_id TEXT,
  user_email TEXT,
  project_id UUID,                        -- No FK (intentional: events survive project deletes)

  -- Event data
  event_data JSONB,

  -- Client info
  page_url TEXT,
  referrer TEXT,
  user_agent TEXT,

  -- Timestamps
  client_timestamp TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_event_name ON analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_event_category ON analytics_events(event_category);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_session ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_project ON analytics_events(project_id);

-- RLS
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public event tracking"
  ON analytics_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Service role full access to analytics_events"
  ON analytics_events FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- TABLE 21 (Admin): admin_users
-- Admin portal accounts. Service role only.
-- ============================================================

-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT,
  is_super_admin BOOLEAN DEFAULT false,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Trigger
CREATE TRIGGER trg_admin_users_updated_at
  BEFORE UPDATE ON admin_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS: Service role only
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage admin_users"
  ON admin_users FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- TABLE 22 (Admin): admin_sessions
-- Admin session management. Service role only.
-- ============================================================

CREATE TABLE IF NOT EXISTS admin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON admin_sessions(expires_at);

-- RLS: Service role only
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage admin_sessions"
  ON admin_sessions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- ADMIN FUNCTIONS
-- ============================================================

-- Verify admin password using bcrypt
CREATE OR REPLACE FUNCTION verify_admin_password(stored_hash TEXT, input_password TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN stored_hash = extensions.crypt(input_password, stored_hash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Validate active admin session by token
CREATE OR REPLACE FUNCTION validate_admin_session(token TEXT)
RETURNS TABLE(admin_id UUID, email TEXT, name TEXT, is_super_admin BOOLEAN) AS $$
BEGIN
  RETURN QUERY
  SELECT au.id, au.email, au.name, au.is_super_admin
  FROM admin_sessions s
  JOIN admin_users au ON au.id = s.admin_user_id
  WHERE s.session_token = token
    AND s.expires_at > NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- TABLE 23 (Admin): email_verifications
-- Email verification codes for secure report lookup.
-- ============================================================

CREATE TABLE IF NOT EXISTS email_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code TEXT NOT NULL,                      -- 6-digit code
  verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_email_verification_email ON email_verifications(email);
CREATE INDEX IF NOT EXISTS idx_email_verification_code ON email_verifications(email, code);
CREATE INDEX IF NOT EXISTS idx_email_verification_expires ON email_verifications(expires_at);

-- RLS
ALTER TABLE email_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public verification requests"
  ON email_verifications FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow verification updates"
  ON email_verifications FOR UPDATE
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service role full access to email_verifications"
  ON email_verifications FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Cleanup function for expired codes
CREATE OR REPLACE FUNCTION cleanup_expired_verifications()
RETURNS void AS $$
BEGIN
  DELETE FROM email_verifications
  WHERE expires_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- TABLE 24 (Admin): verified_sessions
-- Session tokens for email-verified users (passwordless access).
-- ============================================================

CREATE TABLE IF NOT EXISTS verified_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  session_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_verified_sessions_token ON verified_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_verified_sessions_email ON verified_sessions(email);
CREATE INDEX IF NOT EXISTS idx_verified_sessions_expires ON verified_sessions(expires_at);

-- RLS
ALTER TABLE verified_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public session creation"
  ON verified_sessions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public session lookup"
  ON verified_sessions FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service role full access to verified_sessions"
  ON verified_sessions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
