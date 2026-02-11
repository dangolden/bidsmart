-- Create admin_users table for storing admin credentials
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT,
    is_super_admin BOOLEAN DEFAULT FALSE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create admin_sessions table for session management
CREATE TABLE IF NOT EXISTS admin_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    session_token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON admin_sessions(expires_at);

-- Enable RLS
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role can manage admin_users"
    ON admin_users FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role can manage admin_sessions"
    ON admin_sessions FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Function to hash passwords using pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Function to verify admin password
CREATE OR REPLACE FUNCTION verify_admin_password(stored_hash TEXT, input_password TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN stored_hash = crypt(input_password, stored_hash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate admin session
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

-- Insert initial admin user (password: 'bidsmart2026')
-- You should change this password after first login
INSERT INTO admin_users (email, password_hash, name, is_super_admin)
VALUES (
    'dan@theswitchison.org',
    crypt('bidsmart2026', gen_salt('bf')),
    'Dan Golden',
    TRUE
)
ON CONFLICT (email) DO NOTHING;
