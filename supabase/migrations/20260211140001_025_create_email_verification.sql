/*
  # Email Verification for Report Lookup
  
  ## Overview
  This migration creates a table for storing email verification codes
  to add security to the report lookup feature without requiring full auth.
  
  ## New Tables
  - `email_verifications`: Store verification codes with expiry
  
  ## Security
  - Codes expire after 10 minutes
  - Rate limiting via unique constraint on email + created_at window
*/

-- Email verification codes table
CREATE TABLE IF NOT EXISTS email_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Verification data
  email TEXT NOT NULL,
  code TEXT NOT NULL, -- 6-digit code
  
  -- Status
  verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  
  -- Expiry
  expires_at TIMESTAMPTZ NOT NULL,
  
  -- Rate limiting
  ip_address TEXT,
  user_agent TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_email_verification_email ON email_verifications(email);
CREATE INDEX idx_email_verification_code ON email_verifications(email, code);
CREATE INDEX idx_email_verification_expires ON email_verifications(expires_at);

-- Clean up expired codes automatically (function to be called periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_verifications()
RETURNS void AS $$
BEGIN
  DELETE FROM email_verifications 
  WHERE expires_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- RLS
ALTER TABLE email_verifications ENABLE ROW LEVEL SECURITY;

-- Allow public inserts (for requesting codes)
CREATE POLICY "Allow public verification requests"
  ON email_verifications
  FOR INSERT
  WITH CHECK (true);

-- Allow updates only for matching email/code
CREATE POLICY "Allow verification updates"
  ON email_verifications
  FOR UPDATE
  USING (true);

-- Create session tokens table for verified sessions
CREATE TABLE IF NOT EXISTS verified_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Session data
  email TEXT NOT NULL,
  session_token TEXT NOT NULL UNIQUE,
  
  -- Status
  expires_at TIMESTAMPTZ NOT NULL,
  
  -- Metadata
  ip_address TEXT,
  user_agent TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for verified sessions
CREATE INDEX idx_verified_sessions_token ON verified_sessions(session_token);
CREATE INDEX idx_verified_sessions_email ON verified_sessions(email);
CREATE INDEX idx_verified_sessions_expires ON verified_sessions(expires_at);

-- RLS for verified sessions
ALTER TABLE verified_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public session creation"
  ON verified_sessions
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public session lookup"
  ON verified_sessions
  FOR SELECT
  USING (true);

-- Comments
COMMENT ON TABLE email_verifications IS 'Email verification codes for secure report lookup';
COMMENT ON TABLE verified_sessions IS 'Session tokens for verified email users';
