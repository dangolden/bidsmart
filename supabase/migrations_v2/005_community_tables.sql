-- ============================================================
-- BidSmart V2 — Chunk E: Community Tables (NEW)
-- Creates: community_contractors, community_bids
-- Anonymized data from opted-in users. No PII stored.
-- Populated by triggers on bids when data_sharing_consent = true.
-- ============================================================

-- ============================================================
-- TABLE 18 (Community): community_contractors
-- Anonymized contractor market data from opted-in users.
-- Includes third-party ratings AND BidSmart user review ratings.
-- No PII: no names, addresses, emails, phones.
-- ============================================================

CREATE TABLE IF NOT EXISTS community_contractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Admin dedup only — not exposed in community views
  source_project_id UUID REFERENCES projects(id),

  -- Geographic (anonymized)
  state TEXT,
  zip_code_area TEXT,                          -- First 3 digits of ZIP only
  service_area TEXT,

  -- Experience (no identifiers)
  years_in_business INTEGER,
  employee_count INTEGER,
  certifications TEXT[] DEFAULT '{}',          -- NATE, EPA 608, etc.

  -- Third-party ratings
  google_rating DECIMAL(3,2),
  yelp_rating DECIMAL(3,2),
  bbb_rating TEXT,
  bbb_accredited BOOLEAN DEFAULT false,

  -- BidSmart user review ratings (from contractor_installation_reviews via trigger)
  bidsmart_overall_rating INTEGER CHECK (bidsmart_overall_rating BETWEEN 1 AND 5),
  bidsmart_would_recommend BOOLEAN,
  bidsmart_completed_on_time BOOLEAN
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_community_contractors_state ON community_contractors(state);
CREATE INDEX IF NOT EXISTS idx_community_contractors_zip ON community_contractors(zip_code_area);

-- Trigger
CREATE TRIGGER trg_community_contractors_updated_at
  BEFORE UPDATE ON community_contractors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS: Public read (anonymized data), service role write
ALTER TABLE community_contractors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read community_contractors"
  ON community_contractors FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service role full access to community_contractors"
  ON community_contractors FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- TABLE 19 (Community): community_bids
-- Anonymized bid pricing + scope benchmarks from opted-in users.
-- Enables "fair market rate" insights by region.
-- Uses source_bid_id UNIQUE for upsert dedup on re-runs.
-- ============================================================

CREATE TABLE IF NOT EXISTS community_bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_contractor_id UUID REFERENCES community_contractors(id),
  source_bid_id UUID UNIQUE REFERENCES bids(id),  -- Admin dedup only, not exposed
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Bid date (anonymized)
  bid_date DATE,

  -- Geographic (anonymized)
  state TEXT,
  zip_code_area TEXT,                          -- First 3 digits of ZIP only

  -- Pricing
  total_bid_amount DECIMAL(10,2),
  labor_cost DECIMAL(10,2),
  equipment_cost DECIMAL(10,2),

  -- Scope (no identifiers)
  equipment_type TEXT,                         -- heat_pump, furnace_ac, etc.
  primary_seer_rating DECIMAL(5,2),
  primary_capacity_tons DECIMAL(4,2),
  includes_permit BOOLEAN,
  includes_electrical BOOLEAN,
  includes_ductwork BOOLEAN,
  labor_warranty_years INTEGER,
  estimated_days INTEGER
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_community_bids_state ON community_bids(state);
CREATE INDEX IF NOT EXISTS idx_community_bids_zip ON community_bids(zip_code_area);
CREATE INDEX IF NOT EXISTS idx_community_bids_equipment ON community_bids(equipment_type);
CREATE INDEX IF NOT EXISTS idx_community_bids_amount ON community_bids(total_bid_amount);

-- RLS: Public read (anonymized data), service role write
ALTER TABLE community_bids ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read community_bids"
  ON community_bids FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service role full access to community_bids"
  ON community_bids FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- FUNCTION: populate_community_data()
-- Trigger function called AFTER UPDATE ON bids when status
-- transitions to 'completed'. At that point, bid_scope is
-- guaranteed to exist (populated by MindPal callback).
-- All pricing/timeline data now read from bid_scope, not bids.
-- ============================================================

CREATE OR REPLACE FUNCTION populate_community_data()
RETURNS TRIGGER AS $$
DECLARE
  v_project RECORD;
  v_bid_scope RECORD;
  v_bid_contractors RECORD;
  v_community_contractor_id UUID;
BEGIN
  -- Only proceed if data sharing is consented
  SELECT * INTO v_project FROM projects WHERE id = NEW.project_id;
  IF NOT FOUND OR NOT v_project.data_sharing_consent THEN
    RETURN NEW;
  END IF;

  -- Get bid scope data (must exist — trigger only fires on status='completed')
  SELECT * INTO v_bid_scope FROM bid_scope WHERE bid_id = NEW.id;
  IF NOT FOUND THEN
    RETURN NEW;  -- Safety guard: skip if bid_scope somehow missing
  END IF;

  -- Get contractor data
  SELECT * INTO v_bid_contractors FROM bid_contractors WHERE bid_id = NEW.id;

  -- Upsert community_contractors (1 per project for dedup)
  INSERT INTO community_contractors (
    source_project_id,
    state,
    zip_code_area,
    service_area,
    years_in_business,
    certifications,
    google_rating
  )
  SELECT
    v_project.id,
    NULL,                                      -- state from user profile (not stored here)
    NULL,                                      -- zip anonymized at batch level
    v_bid_contractors.service_area,
    v_bid_contractors.years_in_business,
    COALESCE(v_bid_contractors.certifications, '{}'),
    v_bid_contractors.google_rating
  WHERE v_bid_contractors IS NOT NULL
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_community_contractor_id;

  -- Upsert community_bids (all pricing/timeline from bid_scope now)
  INSERT INTO community_bids (
    community_contractor_id,
    source_bid_id,
    bid_date,
    total_bid_amount,
    labor_cost,
    equipment_cost,
    includes_permit,
    includes_electrical,
    includes_ductwork,
    labor_warranty_years,
    estimated_days
  )
  VALUES (
    v_community_contractor_id,
    NEW.id,
    v_bid_scope.bid_date,
    v_bid_scope.total_bid_amount,
    v_bid_scope.labor_cost,
    v_bid_scope.equipment_cost,
    COALESCE(v_bid_scope.permit_included, false),
    COALESCE(v_bid_scope.electrical_included, false),
    COALESCE(v_bid_scope.ductwork_included, false),
    v_bid_scope.labor_warranty_years,
    v_bid_scope.estimated_days
  )
  ON CONFLICT (source_bid_id) DO UPDATE SET
    total_bid_amount = EXCLUDED.total_bid_amount,
    labor_cost = EXCLUDED.labor_cost,
    equipment_cost = EXCLUDED.equipment_cost,
    includes_permit = EXCLUDED.includes_permit,
    includes_electrical = EXCLUDED.includes_electrical,
    includes_ductwork = EXCLUDED.includes_ductwork,
    labor_warranty_years = EXCLUDED.labor_warranty_years,
    estimated_days = EXCLUDED.estimated_days;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
