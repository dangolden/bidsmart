-- ============================================================
-- BidSmart V2 — Chunk B: Bid Tables
-- Creates: bids, bid_contractors, bid_scope, bid_scores, bid_equipment
-- Also resolves deferred FKs from Chunk A:
--   projects.selected_bid_id -> bids(id)
--   pdf_uploads.extracted_bid_id -> bids(id)
-- ============================================================

-- ============================================================
-- TABLE 5: bids
-- Core bid record. Renamed+split from contractor_bids (98 cols -> 33).
-- Contractor, scope, electrical, scoring data moved to dedicated 1:1 tables.
-- ============================================================

CREATE TABLE IF NOT EXISTS bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  pdf_upload_id UUID REFERENCES pdf_uploads(id),
  bid_index INTEGER,                            -- Order of bid in analysis (0-indexed)

  -- Display & System Type
  contractor_name TEXT NOT NULL,               -- Denormalized for sort/display
  system_type TEXT CHECK (system_type IN ('heat_pump', 'furnace_ac', 'mini_split', 'hybrid', 'boiler', 'other')),

  -- Pricing
  total_bid_amount DECIMAL(10,2) NOT NULL,
  labor_cost DECIMAL(10,2),
  equipment_cost DECIMAL(10,2),
  materials_cost DECIMAL(10,2),
  permit_cost DECIMAL(10,2),
  disposal_cost DECIMAL(10,2),
  electrical_cost DECIMAL(10,2),
  total_before_rebates DECIMAL(10,2),
  estimated_rebates DECIMAL(10,2),
  total_after_rebates DECIMAL(10,2),

  -- Payment Terms
  deposit_required DECIMAL(10,2),
  deposit_percentage DECIMAL(5,2),
  payment_schedule TEXT,
  financing_offered BOOLEAN DEFAULT false,
  financing_terms TEXT,

  -- Warranty & Timeline
  labor_warranty_years INTEGER,
  equipment_warranty_years INTEGER,
  compressor_warranty_years INTEGER,
  additional_warranty_details TEXT,
  estimated_days INTEGER,
  start_date_available DATE,
  bid_date DATE,
  valid_until DATE,

  -- Extraction Metadata
  extraction_confidence confidence_level DEFAULT 'manual',
  extraction_notes TEXT,

  -- User Actions
  verified_by_user BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  user_notes TEXT,
  is_favorite BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bids_project ON bids(project_id);
CREATE INDEX IF NOT EXISTS idx_bids_contractor ON bids(contractor_name);
CREATE INDEX IF NOT EXISTS idx_bids_amount ON bids(total_bid_amount);

-- Trigger
CREATE TRIGGER trg_bids_updated_at
  BEFORE UPDATE ON bids
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bids"
  ON bids FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN users_ext u ON u.id = p.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own bids"
  ON bids FOR INSERT
  TO authenticated
  WITH CHECK (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN users_ext u ON u.id = p.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own bids"
  ON bids FOR UPDATE
  TO authenticated
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN users_ext u ON u.id = p.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own bids"
  ON bids FOR DELETE
  TO authenticated
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN users_ext u ON u.id = p.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access to bids"
  ON bids FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- RESOLVE DEFERRED FKs FROM CHUNK A
-- ============================================================

-- projects.selected_bid_id -> bids(id) SET NULL on delete
ALTER TABLE projects
  ADD CONSTRAINT fk_projects_selected_bid
  FOREIGN KEY (selected_bid_id)
  REFERENCES bids(id)
  ON DELETE SET NULL;

-- pdf_uploads.extracted_bid_id -> bids(id) SET NULL on delete
ALTER TABLE pdf_uploads
  ADD CONSTRAINT fk_pdf_uploads_extracted_bid
  FOREIGN KEY (extracted_bid_id)
  REFERENCES bids(id)
  ON DELETE SET NULL;

-- ============================================================
-- TABLE 6: bid_contractors
-- Contractor company info, ratings, credentials, research data. 1:1 per bid.
-- ============================================================

CREATE TABLE IF NOT EXISTS bid_contractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bid_id UUID NOT NULL UNIQUE REFERENCES bids(id) ON DELETE CASCADE,

  -- Identity
  name TEXT NOT NULL,
  company TEXT,
  contact_name TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,

  -- Licensing
  license TEXT,
  license_state TEXT,
  license_status TEXT,
  license_expiration_date DATE,
  insurance_verified BOOLEAN,
  bonded BOOLEAN DEFAULT false,

  -- Experience
  years_in_business INTEGER,
  year_established INTEGER,
  total_installs INTEGER,
  certifications TEXT[] DEFAULT '{}',
  employee_count INTEGER,
  service_area TEXT,

  -- Ratings
  google_rating DECIMAL(3,2),
  google_review_count INTEGER,
  yelp_rating DECIMAL(3,2),
  yelp_review_count INTEGER,
  bbb_rating TEXT,
  bbb_accredited BOOLEAN DEFAULT false,
  bbb_complaints_3yr INTEGER,

  -- Research Metadata
  research_confidence INTEGER,
  verification_date DATE,
  research_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_bid_contractors_bid ON bid_contractors(bid_id);

-- Trigger
CREATE TRIGGER trg_bid_contractors_updated_at
  BEFORE UPDATE ON bid_contractors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE bid_contractors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bid_contractors"
  ON bid_contractors FOR SELECT
  TO authenticated
  USING (
    bid_id IN (
      SELECT b.id FROM bids b
      JOIN projects p ON p.id = b.project_id
      JOIN users_ext u ON u.id = p.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own bid_contractors"
  ON bid_contractors FOR INSERT
  TO authenticated
  WITH CHECK (
    bid_id IN (
      SELECT b.id FROM bids b
      JOIN projects p ON p.id = b.project_id
      JOIN users_ext u ON u.id = p.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own bid_contractors"
  ON bid_contractors FOR UPDATE
  TO authenticated
  USING (
    bid_id IN (
      SELECT b.id FROM bids b
      JOIN projects p ON p.id = b.project_id
      JOIN users_ext u ON u.id = p.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access to bid_contractors"
  ON bid_contractors FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- TABLE 7: bid_scope
-- Scope of work, electrical work details, accessories, and line items. 1:1 per bid.
-- Fixes ghost column bug (scope_*_detail columns now exist properly).
-- Includes line_items JSONB (merged from dropped bid_line_items table).
-- ============================================================

CREATE TABLE IF NOT EXISTS bid_scope (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bid_id UUID NOT NULL UNIQUE REFERENCES bids(id) ON DELETE CASCADE,

  -- Summary & Free-Form
  summary TEXT,
  inclusions TEXT[] DEFAULT '{}',
  exclusions TEXT[] DEFAULT '{}',

  -- Scope Booleans + Details (12 pairs)
  permit_included BOOLEAN,
  permit_detail TEXT,
  disposal_included BOOLEAN,
  disposal_detail TEXT,
  electrical_included BOOLEAN,
  electrical_detail TEXT,
  ductwork_included BOOLEAN,
  ductwork_detail TEXT,
  thermostat_included BOOLEAN,
  thermostat_detail TEXT,
  manual_j_included BOOLEAN,
  manual_j_detail TEXT,
  commissioning_included BOOLEAN,
  commissioning_detail TEXT,
  air_handler_included BOOLEAN,
  air_handler_detail TEXT,
  line_set_included BOOLEAN,
  line_set_detail TEXT,
  disconnect_included BOOLEAN,
  disconnect_detail TEXT,
  pad_included BOOLEAN,
  pad_detail TEXT,
  drain_line_included BOOLEAN,
  drain_line_detail TEXT,

  -- Electrical Work Sub-Group
  panel_assessment_included BOOLEAN,
  panel_upgrade_included BOOLEAN,
  dedicated_circuit_included BOOLEAN,
  electrical_permit_included BOOLEAN,
  load_calculation_included BOOLEAN,
  existing_panel_amps INTEGER,
  proposed_panel_amps INTEGER,
  breaker_size_required INTEGER,
  panel_upgrade_cost DECIMAL(10,2),
  electrical_notes TEXT,

  -- Accessories (JSONB array)
  -- Each entry: {type, name, brand, model_number, description, cost}
  accessories JSONB DEFAULT '[]',

  -- Line Items (JSONB array — merged from dropped bid_line_items table)
  -- Each entry: {item_type, description, amount, quantity, unit_price, is_included, notes}
  line_items JSONB DEFAULT '[]',

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_bid_scope_bid ON bid_scope(bid_id);

-- Trigger
CREATE TRIGGER trg_bid_scope_updated_at
  BEFORE UPDATE ON bid_scope
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE bid_scope ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bid_scope"
  ON bid_scope FOR SELECT
  TO authenticated
  USING (
    bid_id IN (
      SELECT b.id FROM bids b
      JOIN projects p ON p.id = b.project_id
      JOIN users_ext u ON u.id = p.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own bid_scope"
  ON bid_scope FOR INSERT
  TO authenticated
  WITH CHECK (
    bid_id IN (
      SELECT b.id FROM bids b
      JOIN projects p ON p.id = b.project_id
      JOIN users_ext u ON u.id = p.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own bid_scope"
  ON bid_scope FOR UPDATE
  TO authenticated
  USING (
    bid_id IN (
      SELECT b.id FROM bids b
      JOIN projects p ON p.id = b.project_id
      JOIN users_ext u ON u.id = p.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access to bid_scope"
  ON bid_scope FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- TABLE 8: bid_scores
-- Scoring, quality indicators, analysis flags per bid. 1:1 per bid.
-- Separated so scoring can be recalculated independently.
-- ============================================================

CREATE TABLE IF NOT EXISTS bid_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bid_id UUID NOT NULL UNIQUE REFERENCES bids(id) ON DELETE CASCADE,

  -- Scores (0-100 scale)
  overall_score DECIMAL(5,2),
  value_score DECIMAL(5,2),
  quality_score DECIMAL(5,2),
  completeness_score DECIMAL(5,2),

  -- Metadata & Flags
  score_confidence DECIMAL(5,2),
  scoring_notes TEXT,
  ranking_recommendation TEXT,               -- excellent | good | fair | poor

  -- JSONB arrays for structured flags
  -- red_flags: [{issue, severity, detail}]
  red_flags JSONB DEFAULT '[]',
  -- positive_indicators: [{indicator, detail}]
  positive_indicators JSONB DEFAULT '[]',

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_bid_scores_bid ON bid_scores(bid_id);
CREATE INDEX IF NOT EXISTS idx_bid_scores_overall ON bid_scores(overall_score DESC);

-- Trigger
CREATE TRIGGER trg_bid_scores_updated_at
  BEFORE UPDATE ON bid_scores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE bid_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bid_scores"
  ON bid_scores FOR SELECT
  TO authenticated
  USING (
    bid_id IN (
      SELECT b.id FROM bids b
      JOIN projects p ON p.id = b.project_id
      JOIN users_ext u ON u.id = p.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own bid_scores"
  ON bid_scores FOR INSERT
  TO authenticated
  WITH CHECK (
    bid_id IN (
      SELECT b.id FROM bids b
      JOIN projects p ON p.id = b.project_id
      JOIN users_ext u ON u.id = p.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own bid_scores"
  ON bid_scores FOR UPDATE
  TO authenticated
  USING (
    bid_id IN (
      SELECT b.id FROM bids b
      JOIN projects p ON p.id = b.project_id
      JOIN users_ext u ON u.id = p.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access to bid_scores"
  ON bid_scores FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- TABLE 9: bid_equipment
-- Primary HVAC equipment specs per bid (1:N — multiple devices).
-- Restructured: added system_role, afue_rating, fuel_type.
-- Accessories moved to bid_scope.accessories JSONB.
-- ============================================================

CREATE TABLE IF NOT EXISTS bid_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bid_id UUID NOT NULL REFERENCES bids(id) ON DELETE CASCADE,

  -- Identity & Role
  equipment_type TEXT NOT NULL,              -- heat_pump, outdoor_unit, indoor_unit, air_handler, furnace, condenser
  system_role TEXT CHECK (system_role IN ('primary_heating', 'primary_cooling', 'primary_both', 'secondary', 'air_distribution')),

  -- Brand & Model
  brand TEXT NOT NULL,
  model_number TEXT,
  model_name TEXT,

  -- Capacity
  capacity_btu INTEGER,
  capacity_tons DECIMAL(4,2),

  -- Efficiency
  seer_rating DECIMAL(5,2),
  seer2_rating DECIMAL(5,2),
  hspf_rating DECIMAL(5,2),
  hspf2_rating DECIMAL(5,2),
  eer_rating DECIMAL(5,2),
  cop DECIMAL(4,2),
  afue_rating DECIMAL(5,2),                 -- Annual Fuel Utilization Efficiency (furnaces)
  fuel_type TEXT CHECK (fuel_type IN ('electric', 'natural_gas', 'propane', 'oil')),

  -- Features
  variable_speed BOOLEAN,
  stages INTEGER,
  refrigerant_type TEXT,
  sound_level_db DECIMAL(5,1),

  -- Electrical Specs (per-device manufacturer specs)
  voltage INTEGER,
  amperage_draw INTEGER,
  minimum_circuit_amperage INTEGER,

  -- Energy Star
  energy_star_certified BOOLEAN,
  energy_star_most_efficient BOOLEAN,

  -- Warranty & Pricing
  warranty_years INTEGER,
  compressor_warranty_years INTEGER,
  equipment_cost DECIMAL(10,2),

  -- Extraction
  confidence confidence_level DEFAULT 'manual',

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_equipment_bid ON bid_equipment(bid_id);
CREATE INDEX IF NOT EXISTS idx_equipment_brand ON bid_equipment(brand);

-- RLS
ALTER TABLE bid_equipment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bid_equipment"
  ON bid_equipment FOR SELECT
  TO authenticated
  USING (
    bid_id IN (
      SELECT b.id FROM bids b
      JOIN projects p ON p.id = b.project_id
      JOIN users_ext u ON u.id = p.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own bid_equipment"
  ON bid_equipment FOR INSERT
  TO authenticated
  WITH CHECK (
    bid_id IN (
      SELECT b.id FROM bids b
      JOIN projects p ON p.id = b.project_id
      JOIN users_ext u ON u.id = p.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own bid_equipment"
  ON bid_equipment FOR UPDATE
  TO authenticated
  USING (
    bid_id IN (
      SELECT b.id FROM bids b
      JOIN projects p ON p.id = b.project_id
      JOIN users_ext u ON u.id = p.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access to bid_equipment"
  ON bid_equipment FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
