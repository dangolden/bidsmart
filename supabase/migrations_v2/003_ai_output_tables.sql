-- ============================================================
-- BidSmart V2 — Chunk C: AI-Output Tables
-- Creates: incentive_program_database, project_incentives,
--          contractor_questions, bid_faqs, project_faqs,
--          project_qii_checklist
-- ============================================================

-- ============================================================
-- TABLE 17 (Reference): incentive_program_database
-- Master reference database of all known incentive programs.
-- Renamed from rebate_programs + added geo columns + discovery tracking.
-- Created FIRST because project_incentives has optional FK to it.
-- ============================================================

CREATE TABLE IF NOT EXISTS incentive_program_database (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_name TEXT NOT NULL,
  program_code TEXT UNIQUE,                    -- Short code (FED_25C, FED_HEEHR)
  description TEXT,
  program_type TEXT,                           -- federal, state, utility, manufacturer

  -- Geographic availability
  available_states TEXT[],                     -- State codes where available
  available_zip_codes TEXT[],                  -- ZIP codes (geo column)
  available_utilities TEXT[],                  -- Utility company names
  available_nationwide BOOLEAN DEFAULT false,

  -- Amounts
  rebate_amount DECIMAL(10,2),
  rebate_percentage DECIMAL(5,2),
  max_rebate DECIMAL(10,2),

  -- Requirements
  requirements JSONB,                          -- {min_seer2, energy_star, etc.}
  income_qualified BOOLEAN DEFAULT false,
  income_limits JSONB,                         -- Income limit thresholds

  -- Timing
  valid_from DATE,
  valid_until DATE,

  -- Application
  application_url TEXT,
  application_process TEXT,
  typical_processing_days INTEGER,

  -- Stacking rules
  stackable BOOLEAN DEFAULT true,
  cannot_stack_with TEXT[],                    -- Program codes that conflict

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_verified DATE,

  -- Discovery tracking (new)
  discovered_by TEXT DEFAULT 'seed'
    CHECK (discovered_by IN ('seed', 'mindpal', 'admin')),
  discovery_source_url TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_incentive_db_active ON incentive_program_database(id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_incentive_db_states ON incentive_program_database USING GIN(available_states);

-- Trigger
CREATE TRIGGER trg_incentive_program_database_updated_at
  BEFORE UPDATE ON incentive_program_database
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS: Public read (active only), service role full access
ALTER TABLE incentive_program_database ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active incentive programs"
  ON incentive_program_database FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "Service role full access to incentive_program_database"
  ON incentive_program_database FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- TABLE 13 (User): project_incentives
-- All incentives applicable to a project — matched from database,
-- discovered by AI, or added by user. Replaces incentive_programs
-- + project_rebates. Has optional FK to incentive_program_database.
-- ============================================================

CREATE TABLE IF NOT EXISTS project_incentives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Source
  source TEXT NOT NULL
    CHECK (source IN ('database_match', 'ai_discovered', 'user_added')),
  incentive_database_id UUID REFERENCES incentive_program_database(id), -- nullable for ai_discovered

  -- Identity
  program_name TEXT NOT NULL,
  program_type TEXT NOT NULL
    CHECK (program_type IN ('federal', 'state', 'utility', 'manufacturer', 'tax_credit')),

  -- Amounts
  amount_min DECIMAL(12,2),
  amount_max DECIMAL(12,2),
  amount_description TEXT,                     -- Human-readable (e.g. "30% up to $2,000")

  -- Eligibility
  equipment_types_eligible TEXT[] DEFAULT '{}', -- e.g. ['heat_pump'] not ['furnace']
  eligibility_requirements TEXT,
  income_qualified BOOLEAN DEFAULT false,
  income_limits TEXT,

  -- Application & Stacking
  application_process TEXT,
  application_url TEXT,
  verification_source TEXT,
  can_stack BOOLEAN,
  stacking_notes TEXT,
  still_active BOOLEAN DEFAULT true,
  confidence TEXT,                             -- high | medium | low

  -- User Tracking
  user_plans_to_apply BOOLEAN,
  application_status TEXT DEFAULT 'not_applied'
    CHECK (application_status IN ('not_applied', 'applied', 'approved', 'received')),
  applied_amount DECIMAL(12,2),

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_project_incentives_project ON project_incentives(project_id);
CREATE INDEX IF NOT EXISTS idx_project_incentives_type ON project_incentives(program_type);

-- Trigger
CREATE TRIGGER trg_project_incentives_updated_at
  BEFORE UPDATE ON project_incentives
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE project_incentives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own project_incentives"
  ON project_incentives FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN users_ext u ON u.id = p.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own project_incentives"
  ON project_incentives FOR INSERT
  TO authenticated
  WITH CHECK (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN users_ext u ON u.id = p.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own project_incentives"
  ON project_incentives FOR UPDATE
  TO authenticated
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN users_ext u ON u.id = p.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access to project_incentives"
  ON project_incentives FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- TABLE 10 (User): contractor_questions
-- Clarification questions for homeowner to ask each contractor.
-- Renamed from bid_questions. Restores full v8 7-category spec.
-- ============================================================

CREATE TABLE IF NOT EXISTS contractor_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bid_id UUID NOT NULL REFERENCES bids(id) ON DELETE CASCADE,

  -- Core question fields
  question_text TEXT NOT NULL,
  question_category TEXT,                      -- pricing, warranty, equipment, timeline, scope, credentials, electrical
  category TEXT,                               -- MindPal category field (parallel)
  priority TEXT DEFAULT 'medium',              -- high | medium | low

  -- v8 spec fields (restored)
  context TEXT,                                -- Why this question matters
  triggered_by TEXT,                           -- What triggered this question
  good_answer_looks_like TEXT,                 -- Example satisfactory answer
  concerning_answer_looks_like TEXT,           -- Example concerning answer

  -- Metadata
  missing_field TEXT,                          -- Which data field triggered this
  generation_notes TEXT,
  auto_generated BOOLEAN DEFAULT true,

  -- User tracking
  is_answered BOOLEAN DEFAULT false,
  answer_text TEXT,
  answered_at TIMESTAMPTZ,
  display_order INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contractor_questions_bid ON contractor_questions(bid_id);
CREATE INDEX IF NOT EXISTS idx_contractor_questions_priority ON contractor_questions(priority);
CREATE INDEX IF NOT EXISTS idx_contractor_questions_unanswered ON contractor_questions(bid_id) WHERE is_answered = false;

-- RLS
ALTER TABLE contractor_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own contractor_questions"
  ON contractor_questions FOR SELECT
  TO authenticated
  USING (
    bid_id IN (
      SELECT b.id FROM bids b
      JOIN projects p ON p.id = b.project_id
      JOIN users_ext u ON u.id = p.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own contractor_questions"
  ON contractor_questions FOR INSERT
  TO authenticated
  WITH CHECK (
    bid_id IN (
      SELECT b.id FROM bids b
      JOIN projects p ON p.id = b.project_id
      JOIN users_ext u ON u.id = p.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own contractor_questions"
  ON contractor_questions FOR UPDATE
  TO authenticated
  USING (
    bid_id IN (
      SELECT b.id FROM bids b
      JOIN projects p ON p.id = b.project_id
      JOIN users_ext u ON u.id = p.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access to contractor_questions"
  ON contractor_questions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- TABLE 11 (User): bid_faqs
-- Per-bid FAQs generated by MindPal.
-- FK updated to reference bids (was contractor_bids).
-- ============================================================

CREATE TABLE IF NOT EXISTS bid_faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bid_id UUID NOT NULL REFERENCES bids(id) ON DELETE CASCADE,

  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  faq_category TEXT,                           -- pricing, warranty, equipment, scope, contractor, timeline
  answer_confidence TEXT,                      -- high, medium, low
  display_order INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bid_faqs_bid ON bid_faqs(bid_id);
CREATE INDEX IF NOT EXISTS idx_bid_faqs_category ON bid_faqs(faq_category);

-- Trigger
CREATE TRIGGER trg_bid_faqs_updated_at
  BEFORE UPDATE ON bid_faqs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE bid_faqs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bid_faqs"
  ON bid_faqs FOR SELECT
  TO authenticated
  USING (
    bid_id IN (
      SELECT b.id FROM bids b
      JOIN projects p ON p.id = b.project_id
      JOIN users_ext u ON u.id = p.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own bid_faqs"
  ON bid_faqs FOR INSERT
  TO authenticated
  WITH CHECK (
    bid_id IN (
      SELECT b.id FROM bids b
      JOIN projects p ON p.id = b.project_id
      JOIN users_ext u ON u.id = p.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own bid_faqs"
  ON bid_faqs FOR UPDATE
  TO authenticated
  USING (
    bid_id IN (
      SELECT b.id FROM bids b
      JOIN projects p ON p.id = b.project_id
      JOIN users_ext u ON u.id = p.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access to bid_faqs"
  ON bid_faqs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- TABLE 12 (User): project_faqs
-- Project-level comparison FAQs. Kept as-is.
-- ============================================================

CREATE TABLE IF NOT EXISTS project_faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  faq_category TEXT,                           -- comparison, recommendation, general, incentives
  sources TEXT[],
  display_order INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_project_faqs_project ON project_faqs(project_id);
CREATE INDEX IF NOT EXISTS idx_project_faqs_category ON project_faqs(faq_category);

-- RLS
ALTER TABLE project_faqs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own project_faqs"
  ON project_faqs FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN users_ext u ON u.id = p.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own project_faqs"
  ON project_faqs FOR INSERT
  TO authenticated
  WITH CHECK (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN users_ext u ON u.id = p.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access to project_faqs"
  ON project_faqs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- TABLE 14 (User): project_qii_checklist
-- Per-project QII verification tracking.
-- FK changed from UUID -> qii_checklist_items to item_key TEXT
-- (qii_checklist_items table is hardcoded in the app).
-- ============================================================

CREATE TABLE IF NOT EXISTS project_qii_checklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  checklist_item_key TEXT NOT NULL,            -- References hardcoded app constant

  -- Status
  is_verified BOOLEAN DEFAULT false,
  verified_by TEXT,                            -- contractor, homeowner, inspector
  verified_at TIMESTAMPTZ,

  -- Notes
  notes TEXT,
  photo_url TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  UNIQUE(project_id, checklist_item_key)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_qii_project ON project_qii_checklist(project_id);

-- Trigger
CREATE TRIGGER trg_project_qii_checklist_updated_at
  BEFORE UPDATE ON project_qii_checklist
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE project_qii_checklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own project_qii_checklist"
  ON project_qii_checklist FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN users_ext u ON u.id = p.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own project_qii_checklist"
  ON project_qii_checklist FOR INSERT
  TO authenticated
  WITH CHECK (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN users_ext u ON u.id = p.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own project_qii_checklist"
  ON project_qii_checklist FOR UPDATE
  TO authenticated
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN users_ext u ON u.id = p.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access to project_qii_checklist"
  ON project_qii_checklist FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
