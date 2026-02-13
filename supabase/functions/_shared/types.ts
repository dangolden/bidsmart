export interface MindPalTriggerRequest {
  // Flat fields matching MindPal API Input names
  document_urls: string; // JSON stringified array of URLs
  project_id: string;
  user_priorities: string; // JSON stringified priorities object
  user_notes: string;
  callback_url: string;
  request_id: string;
  signature: string;
  timestamp: string;
  // Additional context (optional, for backward compatibility)
  project_context?: {
    heat_pump_type?: string | null;
    system_size_tons?: number | null;
    property_state?: string | null;
    property_zip?: string | null;
    square_footage?: number | null;
    must_have_features?: string[];
  };
}

export interface MindPalCallbackPayload {
  request_id: string;
  signature: string;
  timestamp: string;
  status: "success" | "partial" | "failed";
  extraction_timestamp: string;
  overall_confidence: number;
  contractor_info?: ContractorInfo;
  pricing?: PricingInfo;
  timeline?: TimelineInfo;
  warranty?: WarrantyInfo;
  equipment?: EquipmentInfo[];
  line_items?: LineItemInfo[];
  scope_of_work?: ScopeInfo;
  payment_terms?: PaymentTermsInfo;
  dates?: DatesInfo;
  field_confidences?: Record<string, number>;
  extraction_notes?: ExtractionNote[];
  error?: {
    code: string;
    message: string;
    details?: string;
  };
}

export interface ContractorInfo {
  company_name?: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  license_number?: string;
  license_state?: string;
  website?: string;
  confidence?: number;
}

export interface PricingInfo {
  total_amount: number;
  equipment_cost?: number;
  labor_cost?: number;
  materials_cost?: number;
  permit_cost?: number;
  disposal_cost?: number;
  electrical_cost?: number;
  other_costs?: Array<{ description: string; amount: number }>;
  rebates_mentioned?: Array<{
    name: string;
    amount: number;
    type: "federal" | "state" | "utility" | "manufacturer";
  }>;
  price_before_rebates?: number;
  price_after_rebates?: number;
  confidence?: number;
}

export interface TimelineInfo {
  estimated_days?: number;
  estimated_hours?: number;
  start_date_available?: string;
  bid_valid_until?: string;
  confidence?: number;
}

export interface WarrantyInfo {
  labor_warranty_years?: number;
  equipment_warranty_years?: number;
  compressor_warranty_years?: number;
  extended_warranty_offered?: boolean;
  extended_warranty_cost?: number;
  extended_warranty_years?: number;
  warranty_details?: string;
  confidence?: number;
}

export interface EquipmentInfo {
  equipment_type: string;
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
  stages?: "single" | "two" | "variable";
  refrigerant?: string;
  voltage?: number;
  sound_level_db?: number;
  energy_star?: boolean;
  energy_star_most_efficient?: boolean;
  equipment_cost?: number;
  confidence?: number;
}

export interface LineItemInfo {
  item_type?: string;
  description: string;
  quantity?: number;
  unit_price?: number;
  total_price: number;
  brand?: string;
  model_number?: string;
  source_text?: string;
  confidence?: number;
}

export interface ScopeInfo {
  summary?: string;
  inclusions?: string[];
  exclusions?: string[];
  permit_included?: boolean;
  disposal_included?: boolean;
  electrical_work_included?: boolean;
  ductwork_included?: boolean;
  thermostat_included?: boolean;
  manual_j_included?: boolean;
  commissioning_included?: boolean;
  air_handler_included?: boolean;
  line_set_included?: boolean;
  disconnect_included?: boolean;
  pad_included?: boolean;
  drain_line_included?: boolean;
  confidence?: number;
}

export interface PaymentTermsInfo {
  deposit_required?: boolean;
  deposit_amount?: number;
  deposit_percentage?: number;
  payment_schedule?: string;
  financing_offered?: boolean;
  financing_terms?: string;
  accepted_payment_methods?: string[];
  confidence?: number;
}

export interface DatesInfo {
  bid_date?: string;
  quote_date?: string;
  valid_until?: string;
}

export interface ExtractionNote {
  type: "warning" | "info" | "error";
  message: string;
  field?: string;
}

export type ConfidenceLevel = "high" | "medium" | "low" | "manual";

export function mapConfidenceToLevel(confidence: number | undefined): ConfidenceLevel {
  if (confidence === undefined) return "low";
  if (confidence >= 90) return "high";
  if (confidence >= 70) return "medium";
  return "low";
}

export type LineItemType =
  | "equipment"
  | "labor"
  | "materials"
  | "permit"
  | "disposal"
  | "electrical"
  | "ductwork"
  | "thermostat"
  | "rebate_processing"
  | "warranty"
  | "other";

export function mapLineItemType(type: string | undefined): LineItemType {
  if (!type) return "other";
  const typeMap: Record<string, LineItemType> = {
    equipment: "equipment",
    labor: "labor",
    materials: "materials",
    permit: "permit",
    disposal: "disposal",
    electrical: "electrical",
    ductwork: "ductwork",
    thermostat: "thermostat",
    rebate_processing: "rebate_processing",
    warranty: "warranty",
  };
  return typeMap[type.toLowerCase()] || "other";
}

export type QuestionCategory =
  | "pricing"
  | "warranty"
  | "equipment"
  | "timeline"
  | "scope"
  | "credentials";

export type QuestionPriority = "high" | "medium" | "low";

export interface MindPalQuestionItem {
  bid_id: string;
  question_text: string;
  question_category: QuestionCategory;
  priority: QuestionPriority;
  missing_field?: string | null;
  context?: string;
  display_order: number;
}

export interface MindPalQuestionsCallback {
  request_id: string;
  project_id: string;
  signature: string;
  timestamp: string;
  status: "success" | "failed";
  questions: MindPalQuestionItem[];
  analysis_context?: {
    total_bids_compared: number;
    scope_differences_found?: string[];
    price_range?: {
      lowest: number;
      highest: number;
      average: number;
    };
    equipment_differences?: string[];
  };
}

export interface MindPalFaqItem {
  bid_id: string;
  faq_key: string;
  question_text: string;
  answer_text: string;
  answer_confidence: ConfidenceLevel;
  is_answered: boolean;
  display_order: number;
}

export interface MindPalFaqsCallback {
  request_id: string;
  project_id: string;
  signature: string;
  timestamp: string;
  status: "success" | "failed";
  faqs: MindPalFaqItem[];
}
