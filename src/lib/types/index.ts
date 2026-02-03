/**
 * BidSmart Type Definitions
 * 
 * These types match the database schema and MindPal integration
 */

// ============================================
// ENUMS
// ============================================

export type ProjectStatus =
  | 'draft'
  | 'specifications'
  | 'collecting_bids'
  | 'analyzing'
  | 'comparing'
  | 'decided'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type PdfStatus =
  | 'uploaded'
  | 'processing'
  | 'extracted'
  | 'review_needed'
  | 'failed'
  | 'verified';

export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'manual';

export type HeatPumpType =
  | 'air_source'
  | 'ground_source'
  | 'water_source'
  | 'mini_split'
  | 'ducted'
  | 'hybrid'
  | 'other';

export type LineItemType =
  | 'equipment'
  | 'labor'
  | 'materials'
  | 'permit'
  | 'disposal'
  | 'electrical'
  | 'ductwork'
  | 'thermostat'
  | 'rebate_processing'
  | 'warranty'
  | 'other';

export type EquipmentType =
  | 'outdoor_unit'
  | 'indoor_unit'
  | 'air_handler'
  | 'thermostat'
  | 'line_set'
  | 'disconnect'
  | 'pad'
  | 'other';

// ============================================
// DATABASE MODELS
// ============================================

export interface UserExt {
  id: string;
  auth_user_id?: string | null;
  email: string;
  full_name?: string | null;
  phone?: string | null;
  
  // Property details
  property_address?: string | null;
  property_city?: string | null;
  property_state?: string | null;
  property_zip?: string | null;
  property_type?: string | null;
  square_footage?: number | null;
  year_built?: number | null;
  
  // Current HVAC system
  current_heating_type?: string | null;
  current_cooling_type?: string | null;
  current_system_age?: number | null;
  
  // Utility information
  electric_utility?: string | null;
  gas_utility?: string | null;
  annual_heating_cost?: number | null;
  annual_cooling_cost?: number | null;
  
  // Source tracking
  referral_source?: string | null;
  partner_code?: string | null;
  
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  
  // Project basics
  project_name: string;
  status: ProjectStatus;
  
  // System specifications
  heat_pump_type?: HeatPumpType | null;
  system_size_tons?: number | null;
  system_size_btu?: number | null;
  desired_seer?: number | null;
  desired_hspf?: number | null;
  
  // Scope of work
  replace_air_handler: boolean;
  replace_ductwork: boolean;
  add_zones: number;
  requires_electrical_upgrade: boolean;
  electrical_panel_amps?: number | null;
  
  // Property specifics
  heating_load_calculated?: number | null;
  cooling_load_calculated?: number | null;
  
  // Timeline
  desired_start_date?: string | null;
  flexibility?: string | null;
  
  // Financing (no budget fields - we don't want to bias comparison)
  financing_interested: boolean;
  
  // Preferences (spec-focused, not brand-focused)
  min_seer_requirement?: number | null;
  must_have_features?: string[] | null;
  
  // Decision tracking
  selected_bid_id?: string | null;
  decision_date?: string | null;
  decision_notes?: string | null;

  // Data sharing consent
  data_sharing_consent: boolean;
  data_sharing_consented_at?: string | null;

  // Project details
  project_details?: string | null;

  // Demo project flags
  is_demo: boolean;
  is_public_demo?: boolean;
  demo_description?: string | null;

  // Draft project tracking
  session_id?: string | null;

  // Notification settings
  notification_email?: string | null;
  notify_on_completion: boolean;
  notification_sent_at?: string | null;
  analysis_queued_at?: string | null;
  rerun_count: number;

  created_at: string;
  updated_at: string;
}

export interface ContractorBid {
  id: string;
  project_id: string;
  
  // Contractor information
  contractor_name: string;
  contractor_company?: string | null;
  contractor_phone?: string | null;
  contractor_email?: string | null;
  contractor_license?: string | null;
  contractor_license_state?: string | null;
  contractor_insurance_verified?: boolean | null;
  contractor_website?: string | null;
  
  // Contractor qualitative data (for side-by-side comparison)
  contractor_years_in_business?: number | null;
  contractor_year_established?: number | null;
  contractor_total_installs?: number | null;
  contractor_switch_rating?: number | null; // TheSwitchIsOn rating (1-5)
  contractor_google_rating?: number | null;
  contractor_google_review_count?: number | null;
  contractor_certifications?: string[] | null;
  contractor_is_switch_preferred?: boolean;
  
  // Bid totals
  total_bid_amount: number;
  labor_cost?: number | null;
  equipment_cost?: number | null;
  materials_cost?: number | null;
  permit_cost?: number | null;
  
  // Pre-rebate vs post-rebate
  total_before_rebates?: number | null;
  estimated_rebates?: number | null;
  total_after_rebates?: number | null;
  
  // Timeline
  estimated_days?: number | null;
  start_date_available?: string | null;
  
  // Warranty
  labor_warranty_years?: number | null;
  equipment_warranty_years?: number | null;
  additional_warranty_details?: string | null;
  
  // Payment terms
  deposit_required?: number | null;
  deposit_percentage?: number | null;
  payment_schedule?: string | null;
  financing_offered: boolean;
  financing_terms?: string | null;
  
  // Scope
  scope_summary?: string | null;
  inclusions?: string[] | null;
  exclusions?: string[] | null;

  // Structured scope booleans (for comparison grid)
  scope_permit_included?: boolean | null;
  scope_disposal_included?: boolean | null;
  scope_electrical_included?: boolean | null;
  scope_ductwork_included?: boolean | null;
  scope_thermostat_included?: boolean | null;
  scope_manual_j_included?: boolean | null;
  scope_commissioning_included?: boolean | null;
  scope_air_handler_included?: boolean | null;
  scope_line_set_included?: boolean | null;
  scope_disconnect_included?: boolean | null;
  scope_pad_included?: boolean | null;
  scope_drain_line_included?: boolean | null;

  // Scope details (specific info like "Smart Thermostat" instead of just boolean)
  scope_permit_detail?: string | null;
  scope_disposal_detail?: string | null;
  scope_electrical_detail?: string | null;
  scope_ductwork_detail?: string | null;
  scope_thermostat_detail?: string | null;
  scope_manual_j_detail?: string | null;
  scope_commissioning_detail?: string | null;
  scope_air_handler_detail?: string | null;
  scope_line_set_detail?: string | null;
  scope_disconnect_detail?: string | null;
  scope_pad_detail?: string | null;
  scope_drain_line_detail?: string | null;

  // Source tracking
  bid_date?: string | null;
  valid_until?: string | null;
  pdf_upload_id?: string | null;
  
  // Quality metrics
  overall_score?: number | null;
  value_score?: number | null;
  quality_score?: number | null;
  completeness_score?: number | null;
  
  // Extraction metadata
  extraction_confidence: ConfidenceLevel;
  extraction_notes?: string | null;
  verified_by_user: boolean;
  verified_at?: string | null;
  
  // User notes
  user_notes?: string | null;
  is_favorite: boolean;
  
  created_at: string;
  updated_at: string;
}

export interface BidLineItem {
  id: string;
  bid_id: string;
  
  item_type: LineItemType;
  description: string;
  quantity: number;
  unit_price?: number | null;
  total_price: number;
  
  // For equipment items
  brand?: string | null;
  model_number?: string | null;
  
  // Extraction metadata
  confidence: ConfidenceLevel;
  source_text?: string | null;
  
  line_order?: number | null;
  notes?: string | null;
  
  created_at: string;
}

export interface BidEquipment {
  id: string;
  bid_id: string;
  
  equipment_type: string;
  
  // Brand and model
  brand: string;
  model_number?: string | null;
  model_name?: string | null;
  
  // Specifications
  capacity_btu?: number | null;
  capacity_tons?: number | null;
  seer_rating?: number | null;
  seer2_rating?: number | null;
  hspf_rating?: number | null;
  hspf2_rating?: number | null;
  eer_rating?: number | null;
  cop?: number | null;
  
  // Features
  variable_speed?: boolean | null;
  stages?: number | null;
  refrigerant_type?: string | null;
  sound_level_db?: number | null;
  voltage?: number | null;
  
  // Energy Star
  energy_star_certified?: boolean | null;
  energy_star_most_efficient?: boolean | null;
  
  // Warranty
  warranty_years?: number | null;
  compressor_warranty_years?: number | null;
  
  // Pricing
  equipment_cost?: number | null;
  
  // Extraction metadata
  confidence: ConfidenceLevel;
  
  created_at: string;
}

export interface BidAnalysis {
  id: string;
  project_id: string;
  
  // Overall analysis
  analysis_summary?: string | null;
  
  // Weighted scoring
  scoring_weights?: ScoringWeights | null;
  
  // Recommendations
  recommended_bid_id?: string | null;
  recommendation_reasoning?: string | null;
  
  // Comparisons
  price_comparison?: PriceComparison | null;
  efficiency_comparison?: EfficiencyComparison | null;
  warranty_comparison?: WarrantyComparison | null;
  
  // Issues
  red_flags?: RedFlag[] | null;
  missing_info?: MissingInfo[] | null;
  
  // Opportunities
  negotiation_points?: NegotiationPoint[] | null;
  
  // Generated content
  comparison_report?: string | null;
  negotiation_email_template?: string | null;
  questions_to_ask?: string[] | null;
  
  // Metadata
  analysis_version: string;
  analyzed_at: string;
  model_used?: string | null;
  
  created_at: string;
  updated_at: string;
}

export interface PdfUpload {
  id: string;
  project_id: string;
  
  // File info
  file_name: string;
  file_path: string;
  file_size_bytes?: number | null;
  file_hash?: string | null;
  
  // Processing status
  status: PdfStatus;
  
  // MindPal integration
  mindpal_workflow_id?: string | null;
  mindpal_job_id?: string | null;
  mindpal_status?: string | null;
  
  // Processing timestamps
  uploaded_at: string;
  processing_started_at?: string | null;
  processing_completed_at?: string | null;
  
  // Results
  extracted_bid_id?: string | null;
  extraction_confidence?: number | null;
  
  // Error handling
  error_message?: string | null;
  retry_count: number;
  
  created_at: string;
  updated_at: string;
}

export interface MindPalExtraction {
  id: string;
  pdf_upload_id: string;
  
  // Raw extraction
  raw_json: Record<string, unknown>;
  
  // Parsing results
  parsed_successfully: boolean;
  parsing_errors?: string[] | null;
  
  // Mapping
  mapped_bid_id?: string | null;
  
  // Confidence scores
  overall_confidence?: number | null;
  field_confidences?: Record<string, number> | null;
  
  // Timestamps
  extracted_at: string;
  processed_at?: string | null;
}

export type TimelineUrgency = 'flexible' | 'within_month' | 'within_2_weeks' | 'asap';

export interface ProjectRequirements {
  id: string;
  project_id: string;

  priority_price: number;
  priority_warranty: number;
  priority_efficiency: number;
  priority_timeline: number;
  priority_reputation: number;

  timeline_urgency: TimelineUrgency;
  budget_range?: string | null;

  specific_concerns: string[];
  must_have_features: string[];
  nice_to_have_features: string[];

  additional_notes?: string | null;
  completed_at?: string | null;

  created_at: string;
  updated_at: string;
}

export interface RebateProgram {
  id: string;
  
  program_name: string;
  program_code?: string | null;
  
  // Program details
  description?: string | null;
  program_type?: string | null;
  
  // Geographic availability
  available_states?: string[] | null;
  available_utilities?: string[] | null;
  available_nationwide: boolean;
  
  // Amounts
  rebate_amount?: number | null;
  rebate_percentage?: number | null;
  max_rebate?: number | null;
  
  // Requirements
  requirements?: Record<string, unknown> | null;
  income_qualified: boolean;
  income_limits?: Record<string, unknown> | null;
  
  // Timing
  valid_from?: string | null;
  valid_until?: string | null;
  
  // Application
  application_url?: string | null;
  application_process?: string | null;
  typical_processing_days?: number | null;
  
  // Stacking rules
  stackable: boolean;
  cannot_stack_with?: string[] | null;
  
  // Status
  is_active: boolean;
  last_verified?: string | null;
  
  created_at: string;
  updated_at: string;
}

export interface ProjectRebate {
  id: string;
  project_id: string;
  rebate_program_id: string;
  
  // Applicability
  is_eligible: boolean;
  eligibility_notes?: string | null;
  
  // Estimated amounts
  estimated_amount?: number | null;
  
  // Actual amounts
  applied_amount?: number | null;
  application_status?: string | null;
  application_date?: string | null;
  approval_date?: string | null;
  
  created_at: string;
  updated_at: string;
}

// ============================================
// ANALYSIS TYPES
// ============================================

export interface ScoringWeights {
  price: number;
  efficiency: number;
  warranty: number;
  reputation: number;
  timeline: number;
}

export interface PriceComparison {
  lowest_bid_id: string;
  highest_bid_id: string;
  average_price: number;
  median_price: number;
  price_range: number;
  price_spread_percentage: number;
  by_bid: Array<{
    bid_id: string;
    contractor_name: string;
    total_amount: number;
    per_ton_cost: number;
    deviation_from_average: number;
  }>;
}

export interface EfficiencyComparison {
  highest_seer_bid_id: string;
  highest_hspf_bid_id: string;
  by_bid: Array<{
    bid_id: string;
    contractor_name: string;
    seer: number | null;
    seer2: number | null;
    hspf: number | null;
    hspf2: number | null;
    energy_star: boolean;
    most_efficient: boolean;
  }>;
}

export interface WarrantyComparison {
  best_labor_warranty_bid_id: string;
  best_equipment_warranty_bid_id: string;
  by_bid: Array<{
    bid_id: string;
    contractor_name: string;
    labor_years: number | null;
    equipment_years: number | null;
    compressor_years: number | null;
    extended_available: boolean;
    total_warranty_value: number;
  }>;
}

export interface RedFlag {
  bid_id: string;
  contractor_name: string;
  issue: string;
  severity: 'high' | 'medium' | 'low';
  recommendation: string;
}

export interface MissingInfo {
  bid_id: string;
  contractor_name: string;
  missing_field: string;
  importance: 'critical' | 'important' | 'nice_to_have';
}

export interface NegotiationPoint {
  topic: string;
  current_situation: string;
  suggested_ask: string;
  potential_savings: number | null;
  leverage_points: string[];
  talking_points: string[];
}

// ============================================
// MINDPAL INTEGRATION TYPES
// ============================================

export interface MindPalExtractionRequest {
  request_id: string;
  pdf_url: string;
  callback_url: string;
  project_context: {
    project_id: string;
    heat_pump_type?: HeatPumpType | null;
    system_size_tons?: number | null;
    property_state?: string | null;
    property_zip?: string | null;
    square_footage?: number | null;
    preferred_brands?: string[] | null;
  };
  extraction_options?: {
    extract_line_items?: boolean;
    extract_equipment_specs?: boolean;
    include_raw_text?: boolean;
  };
}

export interface MindPalExtractionResponse {
  request_id: string;
  status: 'success' | 'partial' | 'failed';
  extraction_timestamp: string;
  overall_confidence: number;
  
  contractor_info?: {
    company_name?: string;
    contact_name?: string;
    phone?: string;
    email?: string;
    address?: string;
    license_number?: string;
    license_state?: string;
    website?: string;
    confidence?: number;
  };
  
  pricing?: {
    total_amount: number;
    equipment_cost?: number;
    labor_cost?: number;
    materials_cost?: number;
    permit_cost?: number;
    disposal_cost?: number;
    electrical_cost?: number;
    other_costs?: Array<{
      description: string;
      amount: number;
    }>;
    rebates_mentioned?: Array<{
      name: string;
      amount: number;
      type: 'federal' | 'state' | 'utility' | 'manufacturer';
    }>;
    price_before_rebates?: number;
    price_after_rebates?: number;
    confidence?: number;
  };
  
  timeline?: {
    estimated_days?: number;
    estimated_hours?: number;
    start_date_available?: string;
    bid_valid_until?: string;
    confidence?: number;
  };
  
  warranty?: {
    labor_warranty_years?: number;
    equipment_warranty_years?: number;
    compressor_warranty_years?: number;
    extended_warranty_offered?: boolean;
    extended_warranty_cost?: number;
    extended_warranty_years?: number;
    warranty_details?: string;
    confidence?: number;
  };
  
  equipment?: Array<{
    equipment_type: EquipmentType;
    brand: string;
    model_number?: string;
    model_name?: string;
    capacity_btu?: number;
    capacity_tons?: number;
    seer_rating?: number;
    seer2_rating?: number;
    hspf_rating?: number;
    hspf2_rating?: number;
    eer_rating?: number;
    variable_speed?: boolean;
    stages?: 'single' | 'two' | 'variable';
    refrigerant?: string;
    voltage?: number;
    sound_level_db?: number;
    energy_star?: boolean;
    energy_star_most_efficient?: boolean;
    equipment_cost?: number;
    confidence?: number;
  }>;
  
  line_items?: Array<{
    item_type?: LineItemType;
    description: string;
    quantity?: number;
    unit_price?: number;
    total_price: number;
    brand?: string;
    model_number?: string;
    source_text?: string;
    confidence?: number;
  }>;
  
  scope_of_work?: {
    summary?: string;
    inclusions?: string[];
    exclusions?: string[];
    permit_included?: boolean;
    disposal_included?: boolean;
    electrical_work_included?: boolean;
    ductwork_included?: boolean;
    thermostat_included?: boolean;
    confidence?: number;
  };
  
  payment_terms?: {
    deposit_required?: boolean;
    deposit_amount?: number;
    deposit_percentage?: number;
    payment_schedule?: string;
    financing_offered?: boolean;
    financing_terms?: string;
    accepted_payment_methods?: string[];
    confidence?: number;
  };
  
  dates?: {
    bid_date?: string;
    quote_date?: string;
    valid_until?: string;
  };
  
  field_confidences?: Record<string, number>;
  
  extraction_notes?: Array<{
    type: 'warning' | 'info' | 'error';
    message: string;
    field?: string;
  }>;
  
  raw_text?: string;
  
  error?: {
    code: string;
    message: string;
    details?: string;
  };
}

// ============================================
// UI COMPONENT TYPES
// ============================================

export interface BidComparisonTableRow {
  bid: ContractorBid;
  equipment: BidEquipment[];
  lineItems: BidLineItem[];
  scores: {
    overall: number;
    price: number;
    quality: number;
    value: number;
    completeness: number;
  };
}

export interface ProjectSummary {
  project: Project;
  bids: BidComparisonTableRow[];
  analysis: BidAnalysis | null;
  rebates: Array<{
    program: RebateProgram;
    projectRebate: ProjectRebate;
  }>;
  stats: {
    totalBids: number;
    averagePrice: number;
    lowestPrice: number;
    highestPrice: number;
    bestValueBidId: string | null;
    bestQualityBidId: string | null;
  };
}

export interface WeightedScoreConfig {
  price: { weight: number; label: string };
  efficiency: { weight: number; label: string };
  warranty: { weight: number; label: string };
  completeness: { weight: number; label: string };
  timeline: { weight: number; label: string };
}

export type SortField = 
  | 'overall_score'
  | 'total_bid_amount'
  | 'contractor_name'
  | 'created_at'
  | 'equipment_warranty_years';

export type SortDirection = 'asc' | 'desc';

// ============================================
// QII CHECKLIST TYPES
// ============================================

export type QIICategory = 
  | 'pre_installation'
  | 'equipment'
  | 'airflow'
  | 'refrigerant'
  | 'electrical'
  | 'commissioning';

export interface QIIChecklistItem {
  id: string;
  category: QIICategory;
  item_key: string;
  item_text: string;
  description?: string | null;
  why_it_matters?: string | null;
  is_critical: boolean;
  display_order?: number | null;
  created_at: string;
}

export interface ProjectQIIChecklist {
  id: string;
  project_id: string;
  checklist_item_id: string;
  is_verified: boolean;
  verified_by?: string | null;
  verified_at?: string | null;
  notes?: string | null;
  photo_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface QIIChecklistWithItem extends ProjectQIIChecklist {
  item: QIIChecklistItem;
}

// ============================================
// BID QUESTIONS TYPES
// ============================================

export type QuestionCategory = 
  | 'pricing'
  | 'warranty'
  | 'equipment'
  | 'timeline'
  | 'scope'
  | 'credentials';

export type QuestionPriority = 'high' | 'medium' | 'low';

export interface BidQuestion {
  id: string;
  bid_id: string;
  question_text: string;
  question_category?: QuestionCategory | null;
  priority: QuestionPriority;
  is_answered: boolean;
  answer_text?: string | null;
  answered_at?: string | null;
  auto_generated: boolean;
  missing_field?: string | null;
  display_order?: number | null;
  created_at: string;
}

export interface BidFaq {
  id: string;
  bid_id: string;
  faq_key: string;
  question_text: string;
  answer_text?: string | null;
  answer_confidence?: ConfidenceLevel | null;
  is_answered: boolean;
  display_order?: number | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// CONTRACTOR COMPARISON TYPES
// ============================================

export interface ContractorComparison {
  bid_id: string;
  contractor_name: string;
  years_in_business: number | null;
  total_installs: number | null;
  switch_rating: number | null;
  google_rating: number | null;
  google_reviews: number | null;
  certifications: string[];
  is_switch_preferred: boolean;
  license_number: string | null;
  license_state: string | null;
  insurance_verified: boolean;
}

export interface SpecComparison {
  bid_id: string;
  contractor_name: string;
  total_price: number;
  price_per_ton: number;
  seer: number | null;
  seer2: number | null;
  hspf: number | null;
  hspf2: number | null;
  capacity_tons: number | null;
  capacity_btu: number | null;
  variable_speed: boolean;
  sound_level_db: number | null;
  energy_star: boolean;
  most_efficient: boolean;
  labor_warranty_years: number | null;
  equipment_warranty_years: number | null;
  estimated_days: number | null;
}

// ============================================
// MINDPAL V8 TYPES
// ============================================

export interface ElectricalInfo {
  panel_assessment_included: boolean | null;
  panel_upgrade_included: boolean | null;
  panel_upgrade_cost: number | null;
  existing_panel_amps: number | null;
  proposed_panel_amps: number | null;
  breaker_size_required: number | null;
  dedicated_circuit_included: boolean | null;
  electrical_permit_included: boolean | null;
  load_calculation_included: boolean | null;
  electrical_notes: string | null;
}

export interface FAQEvidence {
  source: 'bid' | 'researched' | 'industry_standard';
  bid_index?: number;
  field: string;
  value: string;
  notes: string;
}

export interface OverallFAQ {
  faq_key: string;
  question_text: string;
  answer_text: string;
  answer_confidence: 'high' | 'medium' | 'low';
  evidence: FAQEvidence[];
  display_order: number;
}

export interface BidFAQ {
  faq_key: string;
  question_text: string;
  answer_text: string;
  answer_confidence: 'high' | 'medium' | 'low';
  evidence: FAQEvidence[];
  display_order: number;
}

export interface BidFAQSet {
  bid_index: number;
  contractor_name: string;
  faqs: BidFAQ[];
}

export interface FAQData {
  overall: OverallFAQ[];
  by_bid: BidFAQSet[];
}

export interface ClarificationQuestion {
  bid_index: number;
  contractor_name: string;
  question_text: string;
  question_category: 'pricing' | 'warranty' | 'equipment' | 'timeline' | 'scope' | 'credentials' | 'electrical';
  priority: 'high' | 'medium' | 'low';
  context: string | null;
  triggered_by: string | null;
  missing_field: string | null;
  good_answer_looks_like: string | null;
  concerning_answer_looks_like: string | null;
  display_order: number;
}

export interface IncentiveProgram {
  program_name: string;
  program_type: string;
  administering_entity: string;
  incentive_amount: number | null;
  incentive_percentage: number | null;
  max_incentive: number;
  description: string;
  eligibility: {
    income_qualified: boolean;
    equipment_requirements: string;
  };
  application: {
    how_to_apply: string;
    application_url: string;
  };
  verified_active: boolean;
}

export interface IncentivesData {
  customer_location: {
    address: string;
    city: string;
    state: string;
    zip: string;
  };
  utilities: {
    electric_utility: string;
    gas_utility: string | null;
    cca: string | null;
    ren: string | null;
  };
  programs: IncentiveProgram[];
  total_potential: {
    minimum_estimate: number;
    maximum_estimate: number;
    notes: string;
  };
}

export interface BidSmartV8Response {
  request_id: string;
  status: 'success' | 'failed';
  extraction_timestamp: string;
  overall_confidence: number;
  bids: V8Bid[];
  analysis: V8Analysis;
  questions: ClarificationQuestion[];
  faqs: FAQData;
  disclaimer: string;
  error?: {
    code: string;
    message: string;
  };
}

export interface V8Bid {
  bid_index: number;
  document_url: string;
  extraction_confidence: number;
  contractor_info: V8ContractorInfo;
  customer_info: V8CustomerInfo;
  pricing: V8Pricing;
  equipment: V8Equipment[];
  warranty: V8Warranty;
  timeline: V8Timeline;
  scope_of_work: V8ScopeOfWork;
  electrical: ElectricalInfo;
  payment_terms: V8PaymentTerms;
  dates: V8BidDates;
  scores: V8BidScores;
  red_flags: V8RedFlag[];
  positive_indicators: V8PositiveIndicator[];
}

export interface V8ContractorInfo {
  company_name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  license_number: string | null;
  license_state: string | null;
  license_verified: boolean | null;
  website: string | null;
  years_in_business: number | null;
  google_rating: number | null;
  google_review_count: number | null;
  yelp_rating: number | null;
  bbb_rating: string | null;
  bbb_accredited: boolean | null;
  certifications: string[];
}

export interface V8CustomerInfo {
  customer_name: string | null;
  property_address: string | null;
  property_city: string | null;
  property_state: string | null;
  property_zip: string | null;
}

export interface V8Pricing {
  total_amount: number;
  equipment_cost: number | null;
  labor_cost: number | null;
  materials_cost: number | null;
  permit_cost: number | null;
  disposal_cost: number | null;
  electrical_cost: number | null;
  price_before_rebates: number | null;
  price_after_rebates: number | null;
  rebates_mentioned: V8RebateMention[];
}

export interface V8RebateMention {
  name: string;
  amount: number;
  type: 'federal' | 'state' | 'utility' | 'manufacturer';
}

export interface V8Equipment {
  equipment_type: string;
  brand: string;
  brand_tier: string | null;
  model_number: string | null;
  model_name: string | null;
  system_type: string | null;
  capacity_btu: number | null;
  capacity_tons: number | null;
  seer_rating: number | null;
  seer2_rating: number | null;
  hspf_rating: number | null;
  hspf2_rating: number | null;
  eer_rating: number | null;
  cop: number | null;
  variable_speed: boolean | null;
  stages: number | null;
  refrigerant_type: string | null;
  voltage: number | null;
  amperage_draw: number | null;
  minimum_circuit_amperage: number | null;
  sound_level_db: number | null;
  energy_star: boolean | null;
  energy_star_most_efficient: boolean | null;
}

export interface V8Warranty {
  labor_warranty_years: number | null;
  equipment_warranty_years: number | null;
  compressor_warranty_years: number | null;
  extended_warranty_offered: boolean | null;
  extended_warranty_cost: number | null;
  extended_warranty_years: number | null;
  warranty_details: string | null;
}

export interface V8Timeline {
  estimated_days: number | null;
  estimated_hours: number | null;
  start_date_available: string | null;
  bid_valid_until: string | null;
}

export interface V8ScopeOfWork {
  summary: string | null;
  inclusions: string[];
  exclusions: string[];
  permit_included: boolean | null;
  disposal_included: boolean | null;
  electrical_work_included: boolean | null;
  ductwork_included: boolean | null;
  thermostat_included: boolean | null;
  manual_j_included: boolean | null;
  commissioning_included: boolean | null;
  air_handler_included: boolean | null;
  line_set_included: boolean | null;
  disconnect_included: boolean | null;
  pad_included: boolean | null;
  drain_line_included: boolean | null;
}

export interface V8PaymentTerms {
  deposit_required: boolean | null;
  deposit_amount: number | null;
  deposit_percentage: number | null;
  payment_schedule: string | null;
  financing_offered: boolean | null;
  financing_terms: string | null;
}

export interface V8BidDates {
  bid_date: string | null;
  quote_date: string | null;
}

export interface V8BidScores {
  overall: number | null;
  price: number | null;
  efficiency: number | null;
  warranty: number | null;
  completeness: number | null;
  contractor: number | null;
  timeline: number | null;
  rank: number | null;
  category_strengths: string[];
  category_weaknesses: string[];
}

export interface V8RedFlag {
  issue: string;
  source: string;
  severity: 'high' | 'medium' | 'low';
  date: string | null;
}

export interface V8PositiveIndicator {
  indicator: string;
  source: string;
}

export interface V8Analysis {
  scoring_metadata: V8ScoringMetadata;
  comparison_insights: V8ComparisonInsights;
  incentives: IncentivesData;
}

export interface V8ScoringMetadata {
  scoring_date: string;
  weights_used: {
    price: number;
    efficiency: number;
    warranty: number;
    completeness: number;
    contractor: number;
    timeline: number;
  };
  user_priorities_applied: boolean;
}

export interface V8ComparisonInsights {
  best_overall: { bid_index: number; contractor_name: string; score: number };
  best_value: { bid_index: number; contractor_name: string; reasoning: string };
  best_quality: { bid_index: number; contractor_name: string; reasoning: string };
  price_analysis: {
    lowest: { bid_index: number; amount: number };
    highest: { bid_index: number; amount: number };
    average: number;
    spread_percentage: number;
  };
}
