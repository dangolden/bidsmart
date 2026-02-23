/**
 * @deprecated These types are part of the legacy V1 Make.com pipeline (make-webhook → v8Mapper).
 * The V2 pipeline uses mindpal-callback with types from _shared/types.ts.
 * Kept as a fallback in case Make.com route is re-enabled.
 *
 * MindPal v8 Response Type Definitions (LEGACY V1)
 */

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

export interface FAQData {
  overall: OverallFAQ[];
  by_bid: BidFAQSet[];
}

export interface OverallFAQ {
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

export interface BidFAQ {
  faq_key: string;
  question_text: string;
  answer_text: string;
  answer_confidence: 'high' | 'medium' | 'low';
  evidence: FAQEvidence[];
  display_order: number;
}

export interface FAQEvidence {
  source: 'bid' | 'researched' | 'industry_standard';
  bid_index?: number;
  field: string;
  value: string;
  notes: string;
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
