/*
  # BidSmart Heat Pump Bid Analysis Platform
  # Database Schema for TheSwitchIsOn.org
  
  ## Overview
  This schema supports the complete bid comparison and analysis workflow:
  1. Users submit property details and project specifications
  2. Users upload PDF bids from contractors
  3. MindPal AI extracts structured data from PDFs
  4. System stores extracted data and generates comparisons
  5. Users view weighted scoring, recommendations, and negotiation emails
  
  ## Tables
  - users_ext: Extended user profile for BidSmart
  - projects: Heat pump project details and specifications
  - contractor_bids: Individual bids from contractors
  - bid_line_items: Itemized breakdown of each bid
  - bid_equipment: Equipment specifications in each bid
  - bid_analysis: AI-generated analysis and recommendations
  - pdf_uploads: Track PDF uploads and processing status
  - mindpal_extractions: Raw extraction data from MindPal
  - rebate_programs: Available rebates and incentives
  - project_rebates: Rebates applicable to specific projects
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUM TYPES
-- ============================================

-- Project status workflow
CREATE TYPE project_status AS ENUM (
  'draft',           -- Initial entry, incomplete
  'specifications',  -- User filling out project details
  'collecting_bids', -- Actively collecting contractor bids
  'analyzing',       -- AI processing bids
  'comparing',       -- Bids ready for comparison
  'decided',         -- User made a decision
  'in_progress',     -- Work has started
  'completed',       -- Project finished
  'cancelled'        -- Project cancelled
);

-- PDF processing status
CREATE TYPE pdf_status AS ENUM (
  'uploaded',       -- File uploaded, not processed
  'processing',     -- MindPal is extracting data
  'extracted',      -- Data extracted successfully
  'review_needed',  -- Low confidence, needs human review
  'failed',         -- Extraction failed
  'verified'        -- Human verified the extraction
);

-- Bid confidence levels
CREATE TYPE confidence_level AS ENUM (
  'high',           -- 90%+ confidence
  'medium',         -- 70-89% confidence
  'low',            -- 50-69% confidence
  'manual'          -- Human-entered data
);

-- Heat pump system types
CREATE TYPE heat_pump_type AS ENUM (
  'air_source',
  'ground_source',
  'water_source',
  'mini_split',
  'ducted',
  'hybrid',
  'other'
);

-- Line item categories
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

-- ============================================
-- CORE TABLES
-- ============================================

-- Extended user profile for BidSmart
CREATE TABLE IF NOT EXISTS users_ext (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id UUID UNIQUE, -- Links to Supabase auth.users if used
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  phone TEXT,
  
  -- Property details
  property_address TEXT,
  property_city TEXT,
  property_state TEXT,
  property_zip TEXT,
  property_type TEXT, -- single_family, townhouse, condo, etc.
  square_footage INTEGER,
  year_built INTEGER,
  
  -- Current HVAC system
  current_heating_type TEXT, -- gas_furnace, oil, electric_resistance, etc.
  current_cooling_type TEXT, -- central_ac, window_units, none
  current_system_age INTEGER,
  
  -- Utility information
  electric_utility TEXT,
  gas_utility TEXT,
  annual_heating_cost DECIMAL(10,2),
  annual_cooling_cost DECIMAL(10,2),
  
  -- Source tracking
  referral_source TEXT, -- TheSwitchIsOn, direct, partner, etc.
  partner_code TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Heat pump projects
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users_ext(id) ON DELETE CASCADE NOT NULL,
  
  -- Project basics
  project_name TEXT NOT NULL DEFAULT 'My Heat Pump Project',
  status project_status DEFAULT 'draft',
  
  -- System specifications
  heat_pump_type heat_pump_type,
  system_size_tons DECIMAL(4,2), -- e.g., 3.5 tons
  system_size_btu INTEGER,       -- e.g., 42000 BTU
  desired_seer DECIMAL(4,1),     -- Cooling efficiency target
  desired_hspf DECIMAL(4,1),     -- Heating efficiency target
  
  -- Scope of work
  replace_air_handler BOOLEAN DEFAULT true,
  replace_ductwork BOOLEAN DEFAULT false,
  add_zones INTEGER DEFAULT 1,
  requires_electrical_upgrade BOOLEAN DEFAULT false,
  electrical_panel_amps INTEGER,
  
  -- Property specifics for this project
  heating_load_calculated DECIMAL(10,2), -- Manual J calculation
  cooling_load_calculated DECIMAL(10,2),
  
  -- Timeline
  desired_start_date DATE,
  flexibility TEXT, -- flexible, specific_month, urgent
  
  -- Financing interest (no budget - we don't want to bias the comparison)
  financing_interested BOOLEAN DEFAULT false,
  
  -- Preferences (spec-focused, not brand-focused)
  min_seer_requirement DECIMAL(4,1), -- Minimum efficiency requirement
  must_have_features TEXT[], -- wifi, variable_speed, quiet_operation, etc.
  
  -- Decision tracking
  selected_bid_id UUID, -- Will reference contractor_bids
  decision_date DATE,
  decision_notes TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual contractor bids
CREATE TABLE IF NOT EXISTS contractor_bids (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  
  -- Contractor information
  contractor_name TEXT NOT NULL,
  contractor_company TEXT,
  contractor_phone TEXT,
  contractor_email TEXT,
  contractor_license TEXT,
  contractor_license_state TEXT,
  contractor_insurance_verified BOOLEAN,
  contractor_website TEXT,
  
  -- Contractor qualitative data (for side-by-side comparison)
  contractor_years_in_business INTEGER,
  contractor_year_established INTEGER,
  contractor_total_installs INTEGER, -- Total heat pump installs if known
  contractor_switch_rating DECIMAL(3,2), -- TheSwitchIsOn rating (1-5 scale)
  contractor_google_rating DECIMAL(3,2), -- Google reviews rating
  contractor_google_review_count INTEGER,
  contractor_certifications TEXT[], -- NATE, EPA 608, manufacturer certs
  contractor_is_switch_preferred BOOLEAN DEFAULT false, -- TheSwitchIsOn preferred contractor
  
  -- Bid totals
  total_bid_amount DECIMAL(10,2) NOT NULL,
  labor_cost DECIMAL(10,2),
  equipment_cost DECIMAL(10,2),
  materials_cost DECIMAL(10,2),
  permit_cost DECIMAL(10,2),
  
  -- Pre-rebate vs post-rebate
  total_before_rebates DECIMAL(10,2),
  estimated_rebates DECIMAL(10,2),
  total_after_rebates DECIMAL(10,2),
  
  -- Timeline
  estimated_days INTEGER,
  start_date_available DATE,
  
  -- Warranty
  labor_warranty_years INTEGER,
  equipment_warranty_years INTEGER,
  additional_warranty_details TEXT,
  
  -- Payment terms
  deposit_required DECIMAL(10,2),
  deposit_percentage DECIMAL(5,2),
  payment_schedule TEXT, -- JSON or text description
  financing_offered BOOLEAN DEFAULT false,
  financing_terms TEXT,
  
  -- Scope
  scope_summary TEXT,
  inclusions TEXT[], -- What's included
  exclusions TEXT[], -- What's not included
  
  -- Source tracking
  bid_date DATE,
  valid_until DATE,
  pdf_upload_id UUID, -- Links to pdf_uploads
  
  -- Quality metrics (calculated)
  overall_score DECIMAL(5,2),
  value_score DECIMAL(5,2),
  quality_score DECIMAL(5,2),
  completeness_score DECIMAL(5,2),
  
  -- Extraction metadata
  extraction_confidence confidence_level DEFAULT 'manual',
  extraction_notes TEXT,
  verified_by_user BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  
  -- User notes
  user_notes TEXT,
  is_favorite BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key for selected_bid after contractor_bids exists
ALTER TABLE projects 
  ADD CONSTRAINT fk_selected_bid 
  FOREIGN KEY (selected_bid_id) 
  REFERENCES contractor_bids(id) 
  ON DELETE SET NULL;

-- Itemized line items from each bid
CREATE TABLE IF NOT EXISTS bid_line_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bid_id UUID REFERENCES contractor_bids(id) ON DELETE CASCADE NOT NULL,
  
  item_type line_item_type NOT NULL,
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) DEFAULT 1,
  unit_price DECIMAL(10,2),
  total_price DECIMAL(10,2) NOT NULL,
  
  -- For equipment items
  brand TEXT,
  model_number TEXT,
  
  -- Extraction metadata
  confidence confidence_level DEFAULT 'manual',
  source_text TEXT, -- Original text from PDF
  
  line_order INTEGER, -- For display ordering
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Equipment specifications extracted from bids
CREATE TABLE IF NOT EXISTS bid_equipment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bid_id UUID REFERENCES contractor_bids(id) ON DELETE CASCADE NOT NULL,
  
  equipment_type TEXT NOT NULL, -- outdoor_unit, indoor_unit, thermostat, etc.
  
  -- Brand and model
  brand TEXT NOT NULL,
  model_number TEXT,
  model_name TEXT,
  
  -- Specifications
  capacity_btu INTEGER,
  capacity_tons DECIMAL(4,2),
  seer_rating DECIMAL(5,2),
  seer2_rating DECIMAL(5,2), -- Newer SEER2 standard
  hspf_rating DECIMAL(5,2),
  hspf2_rating DECIMAL(5,2), -- Newer HSPF2 standard
  eer_rating DECIMAL(5,2),
  cop DECIMAL(4,2), -- Coefficient of Performance
  
  -- Features
  variable_speed BOOLEAN,
  stages INTEGER, -- single, two, variable
  refrigerant_type TEXT, -- R-410A, R-32, etc.
  sound_level_db DECIMAL(5,1),
  voltage INTEGER,
  
  -- Energy Star
  energy_star_certified BOOLEAN,
  energy_star_most_efficient BOOLEAN,
  
  -- Warranty
  warranty_years INTEGER,
  compressor_warranty_years INTEGER,
  
  -- Pricing from this bid
  equipment_cost DECIMAL(10,2),
  
  -- Extraction metadata
  confidence confidence_level DEFAULT 'manual',
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI-generated analysis and recommendations
CREATE TABLE IF NOT EXISTS bid_analysis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  
  -- Overall analysis
  analysis_summary TEXT,
  
  -- Weighted scoring breakdown
  scoring_weights JSONB, -- {price: 0.3, efficiency: 0.25, warranty: 0.2, reputation: 0.15, timeline: 0.1}
  
  -- Recommendations
  recommended_bid_id UUID REFERENCES contractor_bids(id),
  recommendation_reasoning TEXT,
  
  -- Comparison insights
  price_comparison JSONB, -- Price analysis across bids
  efficiency_comparison JSONB, -- SEER/HSPF comparison
  warranty_comparison JSONB,
  
  -- Red flags
  red_flags JSONB, -- Array of {bid_id, issue, severity}
  
  -- Missing information
  missing_info JSONB, -- Array of {bid_id, missing_field}
  
  -- Negotiation opportunities
  negotiation_points JSONB, -- Array of opportunities
  
  -- Generated content
  comparison_report TEXT, -- Full comparison report
  negotiation_email_template TEXT, -- Email template for negotiation
  questions_to_ask TEXT[], -- Questions for contractors
  
  -- Analysis metadata
  analysis_version TEXT DEFAULT '1.0',
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  model_used TEXT, -- Which AI model generated this
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PDF upload tracking
CREATE TABLE IF NOT EXISTS pdf_uploads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  
  -- File info
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL, -- Storage path
  file_size_bytes INTEGER,
  file_hash TEXT, -- For deduplication
  
  -- Processing status
  status pdf_status DEFAULT 'uploaded',
  
  -- MindPal integration
  mindpal_workflow_id TEXT,
  mindpal_job_id TEXT,
  mindpal_status TEXT,
  
  -- Processing timestamps
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  processing_started_at TIMESTAMPTZ,
  processing_completed_at TIMESTAMPTZ,
  
  -- Results
  extracted_bid_id UUID REFERENCES contractor_bids(id),
  extraction_confidence DECIMAL(5,2), -- 0-100%
  
  -- Error handling
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Raw MindPal extraction data (for debugging and reprocessing)
CREATE TABLE IF NOT EXISTS mindpal_extractions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pdf_upload_id UUID REFERENCES pdf_uploads(id) ON DELETE CASCADE NOT NULL,
  
  -- Raw extraction
  raw_json JSONB NOT NULL, -- Complete MindPal output
  
  -- Parsing results
  parsed_successfully BOOLEAN DEFAULT false,
  parsing_errors TEXT[],
  
  -- Mapping to our schema
  mapped_bid_id UUID REFERENCES contractor_bids(id),
  
  -- Confidence scores from MindPal
  overall_confidence DECIMAL(5,2),
  field_confidences JSONB, -- {field_name: confidence_score}
  
  -- Timestamps
  extracted_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Available rebate programs
CREATE TABLE IF NOT EXISTS rebate_programs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  program_name TEXT NOT NULL,
  program_code TEXT UNIQUE,
  
  -- Program details
  description TEXT,
  program_type TEXT, -- federal, state, utility, manufacturer
  
  -- Geographic availability
  available_states TEXT[], -- Array of state codes
  available_utilities TEXT[], -- Array of utility names
  available_nationwide BOOLEAN DEFAULT false,
  
  -- Amounts
  rebate_amount DECIMAL(10,2),
  rebate_percentage DECIMAL(5,2),
  max_rebate DECIMAL(10,2),
  
  -- Requirements
  requirements JSONB, -- {min_seer: 16, energy_star: true, etc.}
  income_qualified BOOLEAN DEFAULT false,
  income_limits JSONB,
  
  -- Timing
  valid_from DATE,
  valid_until DATE,
  
  -- Application
  application_url TEXT,
  application_process TEXT,
  typical_processing_days INTEGER,
  
  -- Stacking rules
  stackable BOOLEAN DEFAULT true,
  cannot_stack_with TEXT[], -- Program codes
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  last_verified DATE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rebates applicable to specific projects
CREATE TABLE IF NOT EXISTS project_rebates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  rebate_program_id UUID REFERENCES rebate_programs(id) ON DELETE CASCADE NOT NULL,
  
  -- Applicability
  is_eligible BOOLEAN DEFAULT true,
  eligibility_notes TEXT,
  
  -- Estimated amounts
  estimated_amount DECIMAL(10,2),
  
  -- Actual amounts (when known)
  applied_amount DECIMAL(10,2),
  application_status TEXT, -- not_applied, applied, approved, received
  application_date DATE,
  approval_date DATE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(project_id, rebate_program_id)
);

-- Quality Installation Inspection (QII) checklist items
CREATE TABLE IF NOT EXISTS qii_checklist_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  category TEXT NOT NULL, -- pre_installation, equipment, airflow, refrigerant, electrical, commissioning
  item_key TEXT NOT NULL UNIQUE,
  item_text TEXT NOT NULL,
  description TEXT,
  why_it_matters TEXT,
  
  -- Item properties
  is_critical BOOLEAN DEFAULT false, -- Must-have items
  display_order INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project QII checklist tracking
CREATE TABLE IF NOT EXISTS project_qii_checklist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  checklist_item_id UUID REFERENCES qii_checklist_items(id) ON DELETE CASCADE NOT NULL,
  
  -- Status
  is_verified BOOLEAN DEFAULT false,
  verified_by TEXT, -- contractor, homeowner, inspector
  verified_at TIMESTAMPTZ,
  
  -- Notes
  notes TEXT,
  photo_url TEXT, -- Optional photo evidence
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(project_id, checklist_item_id)
);

-- Contractor-specific questions (generated based on missing info)
CREATE TABLE IF NOT EXISTS bid_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bid_id UUID REFERENCES contractor_bids(id) ON DELETE CASCADE NOT NULL,
  
  question_text TEXT NOT NULL,
  question_category TEXT, -- pricing, warranty, equipment, timeline, scope, credentials
  priority TEXT DEFAULT 'medium', -- high, medium, low
  
  -- Tracking
  is_answered BOOLEAN DEFAULT false,
  answer_text TEXT,
  answered_at TIMESTAMPTZ,
  
  -- Auto-generation metadata
  auto_generated BOOLEAN DEFAULT true,
  missing_field TEXT, -- Which field triggered this question
  
  display_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

-- Users
CREATE INDEX idx_users_ext_email ON users_ext(email);
CREATE INDEX idx_users_ext_zip ON users_ext(property_zip);

-- Projects
CREATE INDEX idx_projects_user ON projects(user_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_created ON projects(created_at DESC);

-- Bids
CREATE INDEX idx_bids_project ON contractor_bids(project_id);
CREATE INDEX idx_bids_contractor ON contractor_bids(contractor_name);
CREATE INDEX idx_bids_amount ON contractor_bids(total_bid_amount);
CREATE INDEX idx_bids_score ON contractor_bids(overall_score DESC);

-- Line items
CREATE INDEX idx_line_items_bid ON bid_line_items(bid_id);
CREATE INDEX idx_line_items_type ON bid_line_items(item_type);

-- Equipment
CREATE INDEX idx_equipment_bid ON bid_equipment(bid_id);
CREATE INDEX idx_equipment_brand ON bid_equipment(brand);

-- PDF uploads
CREATE INDEX idx_pdf_project ON pdf_uploads(project_id);
CREATE INDEX idx_pdf_status ON pdf_uploads(status);
CREATE INDEX idx_pdf_mindpal ON pdf_uploads(mindpal_job_id);

-- Rebates
CREATE INDEX idx_rebates_active ON rebate_programs(is_active) WHERE is_active = true;
CREATE INDEX idx_rebates_states ON rebate_programs USING GIN(available_states);

-- QII checklist
CREATE INDEX idx_qii_items_category ON qii_checklist_items(category);
CREATE INDEX idx_project_qii_project ON project_qii_checklist(project_id);

-- Bid questions
CREATE INDEX idx_bid_questions_bid ON bid_questions(bid_id);
CREATE INDEX idx_bid_questions_unanswered ON bid_questions(bid_id) WHERE is_answered = false;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users_ext ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractor_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE bid_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bid_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE bid_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE mindpal_extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rebate_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_rebates ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY users_ext_policy ON users_ext
  FOR ALL USING (
    auth_user_id = auth.uid() 
    OR auth_user_id IS NULL -- Allow anonymous users for now
  );

-- Projects policy
CREATE POLICY projects_policy ON projects
  FOR ALL USING (
    user_id IN (
      SELECT id FROM users_ext 
      WHERE auth_user_id = auth.uid() 
      OR auth_user_id IS NULL
    )
  );

-- Bids policy (through project)
CREATE POLICY bids_policy ON contractor_bids
  FOR ALL USING (
    project_id IN (
      SELECT id FROM projects 
      WHERE user_id IN (
        SELECT id FROM users_ext 
        WHERE auth_user_id = auth.uid() 
        OR auth_user_id IS NULL
      )
    )
  );

-- Line items policy
CREATE POLICY line_items_policy ON bid_line_items
  FOR ALL USING (
    bid_id IN (
      SELECT id FROM contractor_bids 
      WHERE project_id IN (
        SELECT id FROM projects 
        WHERE user_id IN (
          SELECT id FROM users_ext 
          WHERE auth_user_id = auth.uid() 
          OR auth_user_id IS NULL
        )
      )
    )
  );

-- Equipment policy
CREATE POLICY equipment_policy ON bid_equipment
  FOR ALL USING (
    bid_id IN (
      SELECT id FROM contractor_bids 
      WHERE project_id IN (
        SELECT id FROM projects 
        WHERE user_id IN (
          SELECT id FROM users_ext 
          WHERE auth_user_id = auth.uid() 
          OR auth_user_id IS NULL
        )
      )
    )
  );

-- Analysis policy
CREATE POLICY analysis_policy ON bid_analysis
  FOR ALL USING (
    project_id IN (
      SELECT id FROM projects 
      WHERE user_id IN (
        SELECT id FROM users_ext 
        WHERE auth_user_id = auth.uid() 
        OR auth_user_id IS NULL
      )
    )
  );

-- PDF uploads policy
CREATE POLICY pdf_policy ON pdf_uploads
  FOR ALL USING (
    project_id IN (
      SELECT id FROM projects 
      WHERE user_id IN (
        SELECT id FROM users_ext 
        WHERE auth_user_id = auth.uid() 
        OR auth_user_id IS NULL
      )
    )
  );

-- MindPal extractions policy
CREATE POLICY extractions_policy ON mindpal_extractions
  FOR ALL USING (
    pdf_upload_id IN (
      SELECT id FROM pdf_uploads 
      WHERE project_id IN (
        SELECT id FROM projects 
        WHERE user_id IN (
          SELECT id FROM users_ext 
          WHERE auth_user_id = auth.uid() 
          OR auth_user_id IS NULL
        )
      )
    )
  );

-- Rebate programs are public read
CREATE POLICY rebates_read_policy ON rebate_programs
  FOR SELECT USING (is_active = true);

-- Project rebates policy
CREATE POLICY project_rebates_policy ON project_rebates
  FOR ALL USING (
    project_id IN (
      SELECT id FROM projects 
      WHERE user_id IN (
        SELECT id FROM users_ext 
        WHERE auth_user_id = auth.uid() 
        OR auth_user_id IS NULL
      )
    )
  );

-- QII checklist items are public read
ALTER TABLE qii_checklist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY qii_items_read_policy ON qii_checklist_items
  FOR SELECT USING (true);

-- Project QII checklist policy
ALTER TABLE project_qii_checklist ENABLE ROW LEVEL SECURITY;
CREATE POLICY project_qii_policy ON project_qii_checklist
  FOR ALL USING (
    project_id IN (
      SELECT id FROM projects 
      WHERE user_id IN (
        SELECT id FROM users_ext 
        WHERE auth_user_id = auth.uid() 
        OR auth_user_id IS NULL
      )
    )
  );

-- Bid questions policy
ALTER TABLE bid_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY bid_questions_policy ON bid_questions
  FOR ALL USING (
    bid_id IN (
      SELECT id FROM contractor_bids 
      WHERE project_id IN (
        SELECT id FROM projects 
        WHERE user_id IN (
          SELECT id FROM users_ext 
          WHERE auth_user_id = auth.uid() 
          OR auth_user_id IS NULL
        )
      )
    )
  );

-- ============================================
-- FUNCTIONS
-- ============================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER users_ext_updated BEFORE UPDATE ON users_ext
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER projects_updated BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER bids_updated BEFORE UPDATE ON contractor_bids
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER analysis_updated BEFORE UPDATE ON bid_analysis
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER pdf_updated BEFORE UPDATE ON pdf_uploads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER rebates_updated BEFORE UPDATE ON rebate_programs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER project_rebates_updated BEFORE UPDATE ON project_rebates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Calculate bid scores
CREATE OR REPLACE FUNCTION calculate_bid_scores(p_bid_id UUID)
RETURNS VOID AS $$
DECLARE
  v_project_id UUID;
  v_bid RECORD;
  v_all_bids RECORD;
  v_min_price DECIMAL;
  v_max_price DECIMAL;
  v_price_score DECIMAL;
  v_quality_score DECIMAL;
  v_completeness_score DECIMAL;
  v_value_score DECIMAL;
  v_overall_score DECIMAL;
BEGIN
  -- Get the bid and project
  SELECT project_id INTO v_project_id FROM contractor_bids WHERE id = p_bid_id;
  SELECT * INTO v_bid FROM contractor_bids WHERE id = p_bid_id;
  
  -- Get price range for this project
  SELECT MIN(total_bid_amount), MAX(total_bid_amount)
  INTO v_min_price, v_max_price
  FROM contractor_bids WHERE project_id = v_project_id;
  
  -- Calculate price score (lower is better, normalized 0-100)
  IF v_max_price > v_min_price THEN
    v_price_score := 100 - ((v_bid.total_bid_amount - v_min_price) / (v_max_price - v_min_price) * 100);
  ELSE
    v_price_score := 100;
  END IF;
  
  -- Calculate quality score based on warranty and features
  v_quality_score := 50; -- Base score
  v_quality_score := v_quality_score + COALESCE(v_bid.labor_warranty_years, 0) * 5;
  v_quality_score := v_quality_score + COALESCE(v_bid.equipment_warranty_years, 0) * 3;
  IF v_bid.contractor_insurance_verified THEN
    v_quality_score := v_quality_score + 10;
  END IF;
  v_quality_score := LEAST(v_quality_score, 100);
  
  -- Calculate completeness score
  v_completeness_score := 0;
  IF v_bid.contractor_name IS NOT NULL THEN v_completeness_score := v_completeness_score + 10; END IF;
  IF v_bid.contractor_phone IS NOT NULL THEN v_completeness_score := v_completeness_score + 10; END IF;
  IF v_bid.contractor_email IS NOT NULL THEN v_completeness_score := v_completeness_score + 10; END IF;
  IF v_bid.contractor_license IS NOT NULL THEN v_completeness_score := v_completeness_score + 15; END IF;
  IF v_bid.total_bid_amount IS NOT NULL THEN v_completeness_score := v_completeness_score + 15; END IF;
  IF v_bid.labor_warranty_years IS NOT NULL THEN v_completeness_score := v_completeness_score + 10; END IF;
  IF v_bid.equipment_warranty_years IS NOT NULL THEN v_completeness_score := v_completeness_score + 10; END IF;
  IF v_bid.estimated_days IS NOT NULL THEN v_completeness_score := v_completeness_score + 10; END IF;
  IF v_bid.scope_summary IS NOT NULL THEN v_completeness_score := v_completeness_score + 10; END IF;
  
  -- Calculate value score (quality vs price)
  v_value_score := (v_price_score * 0.6 + v_quality_score * 0.4);
  
  -- Calculate overall score
  v_overall_score := (v_price_score * 0.30 + v_quality_score * 0.25 + 
                      v_completeness_score * 0.25 + v_value_score * 0.20);
  
  -- Update the bid
  UPDATE contractor_bids
  SET 
    overall_score = v_overall_score,
    value_score = v_value_score,
    quality_score = v_quality_score,
    completeness_score = v_completeness_score
  WHERE id = p_bid_id;
  
END;
$$ LANGUAGE plpgsql;

-- Trigger to recalculate scores when bid is updated
CREATE OR REPLACE FUNCTION trigger_recalculate_scores()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM calculate_bid_scores(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bid_score_trigger 
  AFTER INSERT OR UPDATE OF total_bid_amount, labor_warranty_years, equipment_warranty_years,
    contractor_insurance_verified, contractor_name, contractor_phone, contractor_email,
    contractor_license, estimated_days, scope_summary
  ON contractor_bids
  FOR EACH ROW EXECUTE FUNCTION trigger_recalculate_scores();

-- Get project summary with all bids
CREATE OR REPLACE FUNCTION get_project_summary(p_project_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'project', to_jsonb(p.*),
    'bids', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'bid', to_jsonb(b.*),
            'line_items', COALESCE(
              (SELECT jsonb_agg(to_jsonb(li.*)) FROM bid_line_items li WHERE li.bid_id = b.id),
              '[]'::jsonb
            ),
            'equipment', COALESCE(
              (SELECT jsonb_agg(to_jsonb(eq.*)) FROM bid_equipment eq WHERE eq.bid_id = b.id),
              '[]'::jsonb
            )
          )
        )
        FROM contractor_bids b WHERE b.project_id = p.id
      ),
      '[]'::jsonb
    ),
    'analysis', (
      SELECT to_jsonb(a.*) FROM bid_analysis a WHERE a.project_id = p.id ORDER BY a.created_at DESC LIMIT 1
    ),
    'applicable_rebates', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'rebate', to_jsonb(rp.*),
            'project_rebate', to_jsonb(pr.*)
          )
        )
        FROM project_rebates pr
        JOIN rebate_programs rp ON rp.id = pr.rebate_program_id
        WHERE pr.project_id = p.id
      ),
      '[]'::jsonb
    )
  )
  INTO v_result
  FROM projects p
  WHERE p.id = p_project_id;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SEED DATA: Initial Rebate Programs
-- ============================================

INSERT INTO rebate_programs (
  program_name, program_code, description, program_type,
  available_nationwide, rebate_amount, max_rebate,
  requirements, valid_from, valid_until, is_active
) VALUES
(
  'Federal 25C Tax Credit',
  'FED_25C',
  'Federal tax credit for qualified heat pumps under the Inflation Reduction Act. 30% of costs up to $2,000.',
  'federal',
  true,
  NULL, -- Percentage based
  2000,
  '{"min_seer2": 16, "min_hspf2": 8.1, "energy_star": true}'::jsonb,
  '2023-01-01',
  '2032-12-31',
  true
),
(
  'High Efficiency Electric Home Rebate (HEEHR)',
  'FED_HEEHR',
  'Income-qualified rebates up to $8,000 for heat pumps under the Inflation Reduction Act.',
  'federal',
  true,
  8000,
  8000,
  '{"income_qualified": true}'::jsonb,
  '2024-01-01',
  '2032-12-31',
  true
),
(
  'ENERGY STAR Most Efficient Bonus',
  'ES_MOST_EFFICIENT',
  'Additional rebate for ENERGY STAR Most Efficient certified equipment.',
  'manufacturer',
  true,
  500,
  500,
  '{"energy_star_most_efficient": true}'::jsonb,
  '2024-01-01',
  '2025-12-31',
  true
)
ON CONFLICT (program_code) DO NOTHING;

-- ============================================
-- SEED DATA: QII Checklist Items
-- Based on ACCA/ANSI Quality Installation standards
-- ============================================

INSERT INTO qii_checklist_items (category, item_key, item_text, description, why_it_matters, is_critical, display_order) VALUES
-- Pre-Installation
('pre_installation', 'manual_j', 'Manual J load calculation performed', 
  'Contractor provided heating and cooling load calculations specific to your home',
  'Ensures the system is properly sized. Oversized systems short-cycle, waste energy, and fail to dehumidify. Undersized systems can''t keep up.',
  true, 1),
('pre_installation', 'manual_d', 'Manual D duct design reviewed (if applicable)',
  'Duct sizing calculations for proper airflow',
  'Improperly sized ducts restrict airflow, reducing efficiency and comfort.',
  false, 2),
('pre_installation', 'permit_pulled', 'Building permit obtained',
  'Contractor pulled required permits before starting work',
  'Permits ensure work is inspected and meets code. Unpermitted work can affect insurance and resale.',
  true, 3),

-- Equipment Verification
('equipment', 'model_matches', 'Installed equipment matches bid specifications',
  'The actual equipment installed matches what was quoted',
  'Ensures you received what you paid for, including efficiency ratings.',
  true, 10),
('equipment', 'ahri_matched', 'Indoor and outdoor units are AHRI-matched',
  'The indoor and outdoor components are certified to work together',
  'Mismatched components may not achieve rated efficiency and can void warranties.',
  true, 11),
('equipment', 'serial_documented', 'Equipment serial numbers documented',
  'Serial numbers recorded for warranty registration',
  'Required for warranty claims and proves equipment is new.',
  true, 12),

-- Airflow
('airflow', 'static_pressure', 'Static pressure tested and within spec',
  'Duct system pressure measured and verified under 0.5" WC',
  'High static pressure reduces efficiency, increases noise, and shortens equipment life.',
  true, 20),
('airflow', 'airflow_verified', 'Airflow (CFM) verified at each register',
  'Measured airflow at supply registers matches design',
  'Proper airflow ensures each room receives adequate heating and cooling.',
  false, 21),
('airflow', 'filter_sized', 'Filter properly sized and accessible',
  'Filter is correct size with easy access for replacement',
  'Proper filtration protects equipment and improves air quality.',
  false, 22),

-- Refrigerant
('refrigerant', 'charge_verified', 'Refrigerant charge verified',
  'Superheat/subcooling measured and adjusted to manufacturer specs',
  'Improper charge reduces efficiency by 5-20% and can damage the compressor.',
  true, 30),
('refrigerant', 'no_leaks', 'System tested for refrigerant leaks',
  'Pressure test or electronic leak detection performed',
  'Leaks reduce efficiency, harm the environment, and lead to expensive repairs.',
  true, 31),
('refrigerant', 'linesets_insulated', 'Refrigerant lines properly insulated',
  'Suction line insulated from outdoor unit to indoor coil',
  'Uninsulated lines reduce efficiency and can cause condensation damage.',
  false, 32),

-- Electrical
('electrical', 'breaker_sized', 'Circuit breaker properly sized',
  'Electrical circuit matches equipment requirements',
  'Undersized circuits trip frequently; oversized circuits are a fire hazard.',
  true, 40),
('electrical', 'disconnect_installed', 'Outdoor disconnect installed',
  'Service disconnect within sight of outdoor unit',
  'Required by code for safe equipment servicing.',
  true, 41),
('electrical', 'wiring_secured', 'All wiring properly secured and protected',
  'Electrical connections tight and wiring protected from damage',
  'Loose connections cause failures; exposed wiring is a safety hazard.',
  false, 42),

-- Commissioning
('commissioning', 'thermostat_programmed', 'Thermostat properly programmed',
  'Settings configured for optimal comfort and efficiency',
  'Proper programming maximizes savings without sacrificing comfort.',
  false, 50),
('commissioning', 'homeowner_training', 'Homeowner training provided',
  'Contractor explained system operation, filter changes, and maintenance',
  'Informed homeowners maintain systems better and catch problems early.',
  false, 51),
('commissioning', 'startup_report', 'Startup/commissioning report provided',
  'Written documentation of all measurements and settings',
  'Provides baseline for future service and proves proper installation.',
  true, 52),
('commissioning', 'warranty_registered', 'Warranty registered with manufacturer',
  'Equipment warranty registration completed',
  'Unregistered equipment may have shorter warranty periods.',
  true, 53),
('commissioning', 'final_inspection', 'Final inspection passed (if required)',
  'Building department inspection completed and approved',
  'Confirms installation meets all code requirements.',
  true, 54)

ON CONFLICT (item_key) DO NOTHING;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE users_ext IS 'Extended user profiles for BidSmart platform';
COMMENT ON TABLE projects IS 'Heat pump installation projects with specifications';
COMMENT ON TABLE contractor_bids IS 'Individual bids from contractors for projects';
COMMENT ON TABLE bid_line_items IS 'Itemized breakdown of bid costs';
COMMENT ON TABLE bid_equipment IS 'Equipment specifications included in bids';
COMMENT ON TABLE bid_analysis IS 'AI-generated analysis and recommendations';
COMMENT ON TABLE pdf_uploads IS 'Tracking for uploaded PDF bid documents';
COMMENT ON TABLE mindpal_extractions IS 'Raw extraction data from MindPal AI';
COMMENT ON TABLE rebate_programs IS 'Available rebate and incentive programs';
COMMENT ON TABLE project_rebates IS 'Rebates applicable to specific projects';
