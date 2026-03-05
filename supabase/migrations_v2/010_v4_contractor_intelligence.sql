-- V4: Contractor Intelligence tables
-- Owned by quick-extract + contractor-intelligence Edge Functions
-- MindPal NEVER writes to these tables. No collision with bid_contractors.

CREATE TABLE IF NOT EXISTS contractor_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Cache/dedup key: normalized contractor name + state + license
  cache_key TEXT NOT NULL UNIQUE,

  -- Identity (from quick-extract via Gemini)
  contractor_name TEXT NOT NULL,
  company_legal_name TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  address_street TEXT,
  address_city TEXT,
  address_state TEXT,
  address_zip TEXT,

  -- CSLB License Data (from cslb.ca.gov scrape)
  license_number TEXT,
  license_state TEXT DEFAULT 'CA',
  license_status TEXT,
  license_type TEXT,
  license_classifications TEXT[],
  license_issue_date DATE,
  license_expiration_date DATE,
  bond_amount DECIMAL(10,2),
  bond_status TEXT,
  workers_comp_status TEXT,
  disciplinary_actions INTEGER DEFAULT 0,
  open_complaints INTEGER DEFAULT 0,

  -- Google Places Data
  google_place_id TEXT,
  google_rating DECIMAL(3,2),
  google_review_count INTEGER,
  google_business_status TEXT,

  -- BBB Data
  bbb_rating TEXT,
  bbb_accredited BOOLEAN,
  bbb_complaints_3yr INTEGER,
  bbb_url TEXT,

  -- Permit History (county data)
  total_permits INTEGER,
  hvac_permits INTEGER,
  permits_last_3yr INTEGER,
  permit_completion_rate DECIMAL(5,2),

  -- Signals
  red_flags JSONB DEFAULT '[]',
  positive_signals JSONB DEFAULT '[]',

  -- Research metadata
  data_sources TEXT[] DEFAULT '{}',
  research_confidence INTEGER,
  last_researched_at TIMESTAMPTZ,
  research_duration_ms INTEGER,
  raw_research_data JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Junction table: link contractor_intelligence to bids
CREATE TABLE IF NOT EXISTS bid_contractor_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bid_id UUID NOT NULL REFERENCES bids(id) ON DELETE CASCADE,
  contractor_intelligence_id UUID NOT NULL REFERENCES contractor_intelligence(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  extracted_by TEXT DEFAULT 'gemini-2.0-flash',
  extraction_confidence INTEGER,
  extracted_at TIMESTAMPTZ DEFAULT NOW(),

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  UNIQUE(bid_id, contractor_intelligence_id)
);

-- Indexes
CREATE INDEX idx_ci_cache_key ON contractor_intelligence(cache_key);
CREATE INDEX idx_ci_license ON contractor_intelligence(license_number, license_state);
CREATE INDEX idx_ci_name ON contractor_intelligence(contractor_name);
CREATE INDEX idx_bci_bid ON bid_contractor_intelligence(bid_id);
CREATE INDEX idx_bci_project ON bid_contractor_intelligence(project_id);
CREATE INDEX idx_bci_ci ON bid_contractor_intelligence(contractor_intelligence_id);

-- RLS
ALTER TABLE contractor_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE bid_contractor_intelligence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access contractor_intelligence"
  ON contractor_intelligence FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access bid_contractor_intelligence"
  ON bid_contractor_intelligence FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Users view own bid contractor intelligence"
  ON bid_contractor_intelligence FOR SELECT TO authenticated
  USING (
    bid_id IN (
      SELECT b.id FROM bids b
      JOIN projects p ON p.id = b.project_id
      JOIN users_ext u ON u.id = p.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users view contractor intelligence via bids"
  ON contractor_intelligence FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT bci.contractor_intelligence_id
      FROM bid_contractor_intelligence bci
      JOIN bids b ON b.id = bci.bid_id
      JOIN projects p ON p.id = b.project_id
      JOIN users_ext u ON u.id = p.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  );
