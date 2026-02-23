-- ============================================================
-- BidSmart V2 — Chunk A: ENUMs + Core Tables
-- Creates: users_ext, projects, pdf_uploads, project_requirements
-- Plus: 5 ENUM types, update_updated_at() trigger function
-- ============================================================

-- ============================================================
-- EXTENSIONS
-- ============================================================

-- Use gen_random_uuid() which is built into Supabase (pgcrypto bundled)
-- No need for uuid-ossp in Supabase projects

-- ============================================================
-- ENUM TYPES
-- ============================================================

-- Project status workflow
CREATE TYPE project_status AS ENUM (
  'draft',
  'specifications',
  'collecting_bids',
  'analyzing',
  'comparing',
  'decided',
  'in_progress',
  'completed',
  'cancelled'
);

-- PDF processing status
CREATE TYPE pdf_status AS ENUM (
  'uploaded',
  'processing',
  'extracted',
  'review_needed',
  'failed',
  'verified'
);

-- Bid confidence levels
CREATE TYPE confidence_level AS ENUM (
  'high',
  'medium',
  'low',
  'manual'
);

-- Heat pump system types (used in projects)
CREATE TYPE heat_pump_type AS ENUM (
  'air_source',
  'ground_source',
  'water_source',
  'mini_split',
  'ducted',
  'hybrid',
  'other'
);

-- Line item categories (used in bid_scope.line_items JSONB)
CREATE TYPE line_item_type AS ENUM (
  'equipment',
  'labor',
  'materials',
  'permit',
  'disposal',
  'electrical',
  'ductwork',
  'thermostat',
  'rebate_processing',
  'warranty',
  'other'
);

-- ============================================================
-- SHARED TRIGGER FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- USER DATA TABLES
-- ============================================================

-- ============================================================
-- TABLE 1: users_ext
-- Extended user profile. Links to Supabase auth via auth_user_id.
-- ============================================================

CREATE TABLE IF NOT EXISTS users_ext (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE,                    -- Links to Supabase auth.users
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  phone TEXT,

  -- Property details
  property_address TEXT,
  property_city TEXT,
  property_state TEXT,
  property_zip TEXT,
  property_type TEXT,                          -- single_family, townhouse, condo, etc.
  square_footage INTEGER,
  year_built INTEGER,

  -- Current HVAC system
  current_heating_type TEXT,                   -- gas_furnace, oil, electric_resistance, etc.
  current_cooling_type TEXT,                   -- central_ac, window_units, none
  current_system_age INTEGER,

  -- Utility information
  electric_utility TEXT,
  gas_utility TEXT,
  annual_heating_cost DECIMAL(10,2),
  annual_cooling_cost DECIMAL(10,2),

  -- Source tracking
  referral_source TEXT,                        -- TheSwitchIsOn, direct, partner, etc.
  partner_code TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_ext_email ON users_ext(email);
CREATE INDEX IF NOT EXISTS idx_users_ext_auth_user_id ON users_ext(auth_user_id);

-- Trigger
CREATE TRIGGER trg_users_ext_updated_at
  BEFORE UPDATE ON users_ext
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE users_ext ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON users_ext FOR SELECT
  TO authenticated
  USING (auth_user_id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON users_ext FOR INSERT
  TO authenticated
  WITH CHECK (auth_user_id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON users_ext FOR UPDATE
  TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

CREATE POLICY "Service role full access to users_ext"
  ON users_ext FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- TABLE 2: projects
-- Heat pump installation projects. Central hub.
-- Note: selected_bid_id FK added in Chunk B (deferred — circular dep with bids)
-- ============================================================

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users_ext(id) ON DELETE CASCADE,
  project_name TEXT NOT NULL DEFAULT 'My Heat Pump Project',
  status project_status DEFAULT 'draft',
  session_id TEXT,                             -- Browser session tracking

  -- System specifications
  heat_pump_type heat_pump_type,
  system_size_tons DECIMAL(4,2),
  system_size_btu INTEGER,
  desired_seer DECIMAL(4,1),
  desired_hspf DECIMAL(4,1),

  -- Scope of work
  replace_air_handler BOOLEAN DEFAULT true,
  replace_ductwork BOOLEAN DEFAULT false,
  add_zones INTEGER DEFAULT 1,
  requires_electrical_upgrade BOOLEAN DEFAULT false,
  electrical_panel_amps INTEGER,

  -- Property specs for this project
  heating_load_calculated DECIMAL(10,2),
  cooling_load_calculated DECIMAL(10,2),

  -- Timeline & preferences
  desired_start_date DATE,
  flexibility TEXT,                            -- flexible, specific_month, urgent
  financing_interested BOOLEAN DEFAULT false,
  min_seer_requirement DECIMAL(4,1),
  must_have_features TEXT[],                   -- wifi, variable_speed, etc.
  demo_description TEXT,                       -- Demo project description

  -- Decision tracking
  selected_bid_id UUID,                        -- FK -> bids(id) added in Chunk B
  decision_date DATE,
  decision_notes TEXT,

  -- Community data sharing consent
  data_sharing_consent BOOLEAN NOT NULL DEFAULT false,
  data_sharing_consented_at TIMESTAMPTZ,

  -- Notifications & processing
  notification_email TEXT,
  notify_on_completion BOOLEAN NOT NULL DEFAULT false,
  notification_sent_at TIMESTAMPTZ,
  analysis_queued_at TIMESTAMPTZ,
  rerun_count INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created ON projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_session_id ON projects(session_id);

-- Trigger
CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM users_ext WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id IN (
      SELECT id FROM users_ext WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM users_ext WHERE auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id IN (
      SELECT id FROM users_ext WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own projects"
  ON projects FOR DELETE
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM users_ext WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access to projects"
  ON projects FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Anon users can select projects by session_id (pre-auth flow)
CREATE POLICY "Anon can view projects by session"
  ON projects FOR SELECT
  TO anon
  USING (session_id IS NOT NULL);

-- ============================================================
-- TABLE 3: pdf_uploads
-- PDF upload tracking, MindPal job IDs, processing status.
-- Note: extracted_bid_id FK added in Chunk B (deferred — circular dep)
-- ============================================================

CREATE TABLE IF NOT EXISTS pdf_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- File info
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,                     -- Storage path
  file_size_bytes INTEGER,
  file_hash TEXT,                              -- For deduplication

  -- Processing status
  status pdf_status DEFAULT 'uploaded',

  -- MindPal integration
  mindpal_workflow_id TEXT,
  mindpal_job_id TEXT,
  mindpal_run_id TEXT,
  mindpal_status TEXT,

  -- Result tracking
  extracted_bid_id UUID,                       -- FK -> bids(id) added in Chunk B
  extraction_confidence DECIMAL(5,2),          -- Confidence 0-100%
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pdf_project ON pdf_uploads(project_id);
CREATE INDEX IF NOT EXISTS idx_pdf_status ON pdf_uploads(status);
CREATE INDEX IF NOT EXISTS idx_pdf_mindpal ON pdf_uploads(mindpal_job_id);
CREATE INDEX IF NOT EXISTS idx_pdf_mindpal_run_id ON pdf_uploads(mindpal_run_id);

-- Trigger
CREATE TRIGGER trg_pdf_uploads_updated_at
  BEFORE UPDATE ON pdf_uploads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE pdf_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own pdf_uploads"
  ON pdf_uploads FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN users_ext u ON u.id = p.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own pdf_uploads"
  ON pdf_uploads FOR INSERT
  TO authenticated
  WITH CHECK (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN users_ext u ON u.id = p.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own pdf_uploads"
  ON pdf_uploads FOR UPDATE
  TO authenticated
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN users_ext u ON u.id = p.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access to pdf_uploads"
  ON pdf_uploads FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- TABLE 4: project_requirements
-- User priorities questionnaire. One per project (1:1).
-- ============================================================

CREATE TABLE IF NOT EXISTS project_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,

  -- Priority rankings (1=lowest, 5=highest importance)
  priority_price INTEGER DEFAULT 3 CHECK (priority_price BETWEEN 1 AND 5),
  priority_warranty INTEGER DEFAULT 3 CHECK (priority_warranty BETWEEN 1 AND 5),
  priority_efficiency INTEGER DEFAULT 3 CHECK (priority_efficiency BETWEEN 1 AND 5),
  priority_timeline INTEGER DEFAULT 3 CHECK (priority_timeline BETWEEN 1 AND 5),
  priority_reputation INTEGER DEFAULT 3 CHECK (priority_reputation BETWEEN 1 AND 5),

  -- Timeline urgency
  timeline_urgency TEXT DEFAULT 'flexible'
    CHECK (timeline_urgency IN ('flexible', 'within_month', 'within_2_weeks', 'asap')),

  -- Budget & constraints
  budget_range TEXT,
  specific_concerns TEXT[] DEFAULT '{}',
  must_have_features TEXT[] DEFAULT '{}',
  nice_to_have_features TEXT[] DEFAULT '{}',
  additional_notes TEXT,

  -- Tracking
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_project_requirements_project_id ON project_requirements(project_id);

-- Trigger
CREATE TRIGGER trg_project_requirements_updated_at
  BEFORE UPDATE ON project_requirements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE project_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own project_requirements"
  ON project_requirements FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN users_ext u ON u.id = p.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own project_requirements"
  ON project_requirements FOR INSERT
  TO authenticated
  WITH CHECK (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN users_ext u ON u.id = p.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own project_requirements"
  ON project_requirements FOR UPDATE
  TO authenticated
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN users_ext u ON u.id = p.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access to project_requirements"
  ON project_requirements FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
