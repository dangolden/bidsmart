/**
 * @deprecated This mapper is part of the legacy V1 Make.com pipeline (make-webhook).
 * The V2 pipeline uses mindpal-callback with inline mapping to V2 tables
 * (bids, bid_contractors, bid_scope, bid_scores).
 * Kept as a fallback in case Make.com route is re-enabled.
 *
 * MindPal v8/v10 Response Mapper (LEGACY V1)
 * Shared mapping logic for converting v8/v10 responses to V1 database schema (contractor_bids).
 *
 * v10 Changes:
 * - Supports flat contractor fields (contractor_name, contractor_phone, etc.) at top level
 * - Backwards compatible with v8 nested contractor_info structure
 * - Adds disposal_cost, electrical_cost, quote_date
 * - Auto-calculates deposit_required_flag
 * - Handles enum confidence values (high/medium/low) in addition to numeric (0-100)
 */

import type { BidSmartV8Response, V8Bid, V8Equipment } from "./v8Types.ts";

/**
 * Detect if payload is a v8 response
 */
export function isV8Response(payload: any): boolean {
  return (
    payload &&
    typeof payload === 'object' &&
    'bids' in payload &&
    Array.isArray(payload.bids) &&
    'faqs' in payload &&
    'questions' in payload
  );
}

/**
 * Map v8 bid to contractor_bids table structure
 */
export function mapV8BidToDatabase(
  v8Bid: V8Bid,
  projectId: string,
  pdfUploadId: string,
  overallConfidence: number
): Record<string, any> {
  const confidenceLevel = mapConfidenceToLevel(v8Bid.extraction_confidence || overallConfidence);

  // v10: Support flat structure (contractor_name at top level) OR v8 nested structure (contractor_info.company_name)
  const contractorName = (v8Bid as any).contractor_name || v8Bid.contractor_info?.company_name || "Unknown Contractor";
  const contractorCompany = (v8Bid as any).contractor_company || v8Bid.contractor_info?.company_name;
  const contractorPhone = (v8Bid as any).contractor_phone || v8Bid.contractor_info?.phone;
  const contractorEmail = (v8Bid as any).contractor_email || v8Bid.contractor_info?.email;
  const contractorLicense = (v8Bid as any).contractor_license || v8Bid.contractor_info?.license_number;
  const contractorLicenseState = (v8Bid as any).contractor_license_state || v8Bid.contractor_info?.license_state;
  const contractorWebsite = (v8Bid as any).contractor_website || v8Bid.contractor_info?.website;
  const contractorYearsInBusiness = (v8Bid as any).contractor_years_in_business || v8Bid.contractor_info?.years_in_business;
  const contractorCertifications = (v8Bid as any).contractor_certifications || v8Bid.contractor_info?.certifications || [];
  const contractorContactName = (v8Bid as any).contractor_contact_name || v8Bid.contractor_info?.contact_name;
  const contractorAddress = (v8Bid as any).contractor_address || v8Bid.contractor_info?.address;

  // Contractor research fields (from Contractor Researcher node)
  const contractorGoogleRating = (v8Bid as any).contractor_google_rating || v8Bid.contractor_info?.google_rating;
  const contractorGoogleReviewCount = (v8Bid as any).contractor_google_review_count || v8Bid.contractor_info?.google_review_count;
  const contractorInsuranceVerified = (v8Bid as any).contractor_insurance_verified || v8Bid.contractor_info?.license_verified;

  return {
    project_id: projectId,
    contractor_name: contractorName,
    contractor_company: contractorCompany,
    contractor_phone: contractorPhone,
    contractor_email: contractorEmail,
    contractor_license: contractorLicense,
    contractor_license_state: contractorLicenseState,
    contractor_insurance_verified: contractorInsuranceVerified,
    contractor_website: contractorWebsite,
    contractor_years_in_business: contractorYearsInBusiness,
    contractor_contact_name: contractorContactName,
    contractor_address: contractorAddress,
    contractor_google_rating: contractorGoogleRating,
    contractor_google_review_count: contractorGoogleReviewCount,
    contractor_certifications: contractorCertifications,

    // Pricing (v10: support flat pricing fields OR nested pricing object)
    total_bid_amount: (v8Bid as any).total_bid_amount || v8Bid.pricing?.total_amount || 0,
    labor_cost: (v8Bid as any).labor_cost || v8Bid.pricing?.labor_cost,
    equipment_cost: (v8Bid as any).equipment_cost || v8Bid.pricing?.equipment_cost,
    materials_cost: (v8Bid as any).materials_cost || v8Bid.pricing?.materials_cost,
    permit_cost: (v8Bid as any).permit_cost || v8Bid.pricing?.permit_cost,
    disposal_cost: (v8Bid as any).disposal_cost || v8Bid.pricing?.disposal_cost,
    electrical_cost: (v8Bid as any).electrical_cost || v8Bid.pricing?.electrical_cost,
    total_before_rebates: (v8Bid as any).total_before_rebates || v8Bid.pricing?.price_before_rebates,
    estimated_rebates: (v8Bid as any).estimated_rebates || v8Bid.pricing?.rebates_mentioned?.reduce(
      (sum: number, r: any) => sum + (r.amount || 0),
      0
    ),
    total_after_rebates: (v8Bid as any).total_after_rebates || v8Bid.pricing?.price_after_rebates,
    rebates_mentioned: (v8Bid as any).rebates_mentioned || v8Bid.pricing?.rebates_mentioned || [],

    // Timeline
    estimated_days: v8Bid.timeline?.estimated_days,
    start_date_available: v8Bid.timeline?.start_date_available,

    // Warranty
    labor_warranty_years: v8Bid.warranty?.labor_warranty_years,
    equipment_warranty_years: v8Bid.warranty?.equipment_warranty_years,
    additional_warranty_details: v8Bid.warranty?.warranty_details,

    // Payment terms (v10: support flat fields OR nested payment_terms object)
    // v10.1: deposit_amount is preferred field name, deposit_required is backwards compatible
    deposit_required: (v8Bid as any).deposit_amount || (v8Bid as any).deposit_required || v8Bid.payment_terms?.deposit_amount,
    deposit_required_flag: ((v8Bid as any).deposit_amount || (v8Bid as any).deposit_required || v8Bid.payment_terms?.deposit_amount) > 0,
    deposit_percentage: (v8Bid as any).deposit_percentage || v8Bid.payment_terms?.deposit_percentage,
    payment_schedule: (v8Bid as any).payment_schedule || v8Bid.payment_terms?.payment_schedule,
    financing_offered: (v8Bid as any).financing_offered ?? v8Bid.payment_terms?.financing_offered ?? false,
    financing_terms: (v8Bid as any).financing_terms || v8Bid.payment_terms?.financing_terms,

    // Scope of work (v10: support flat scope fields OR nested scope_of_work object)
    scope_summary: (v8Bid as any).scope_summary || v8Bid.scope_of_work?.summary,
    inclusions: (v8Bid as any).inclusions || v8Bid.scope_of_work?.inclusions,
    exclusions: (v8Bid as any).exclusions || v8Bid.scope_of_work?.exclusions,
    scope_permit_included: (v8Bid as any).scope_permit_included ?? v8Bid.scope_of_work?.permit_included,
    scope_disposal_included: (v8Bid as any).scope_disposal_included ?? v8Bid.scope_of_work?.disposal_included,
    scope_electrical_included: (v8Bid as any).scope_electrical_included ?? v8Bid.scope_of_work?.electrical_work_included,
    scope_ductwork_included: (v8Bid as any).scope_ductwork_included ?? v8Bid.scope_of_work?.ductwork_included,
    scope_thermostat_included: (v8Bid as any).scope_thermostat_included ?? v8Bid.scope_of_work?.thermostat_included,
    scope_manual_j_included: (v8Bid as any).scope_manual_j_included ?? v8Bid.scope_of_work?.manual_j_included,
    scope_commissioning_included: (v8Bid as any).scope_commissioning_included ?? v8Bid.scope_of_work?.commissioning_included,
    scope_air_handler_included: (v8Bid as any).scope_air_handler_included ?? v8Bid.scope_of_work?.air_handler_included,
    scope_line_set_included: (v8Bid as any).scope_line_set_included ?? v8Bid.scope_of_work?.line_set_included,
    scope_disconnect_included: (v8Bid as any).scope_disconnect_included ?? v8Bid.scope_of_work?.disconnect_included,
    scope_pad_included: (v8Bid as any).scope_pad_included ?? v8Bid.scope_of_work?.pad_included,
    scope_drain_line_included: (v8Bid as any).scope_drain_line_included ?? v8Bid.scope_of_work?.drain_line_included,

    // Electrical (v10: support flat electrical fields OR nested electrical object)
    electrical_panel_assessment_included: (v8Bid as any).electrical_panel_assessment_included ?? v8Bid.electrical?.panel_assessment_included,
    electrical_panel_upgrade_included: (v8Bid as any).electrical_panel_upgrade_included ?? v8Bid.electrical?.panel_upgrade_included,
    electrical_panel_upgrade_cost: (v8Bid as any).electrical_panel_upgrade_cost || v8Bid.electrical?.panel_upgrade_cost,
    electrical_existing_panel_amps: (v8Bid as any).electrical_existing_panel_amps || v8Bid.electrical?.existing_panel_amps,
    electrical_proposed_panel_amps: (v8Bid as any).electrical_proposed_panel_amps || v8Bid.electrical?.proposed_panel_amps,
    electrical_breaker_size_required: (v8Bid as any).electrical_breaker_size_required || v8Bid.electrical?.breaker_size_required,
    electrical_dedicated_circuit_included: (v8Bid as any).electrical_dedicated_circuit_included ?? v8Bid.electrical?.dedicated_circuit_included,
    electrical_permit_included: (v8Bid as any).electrical_permit_included ?? v8Bid.electrical?.electrical_permit_included,
    electrical_load_calculation_included: (v8Bid as any).electrical_load_calculation_included ?? v8Bid.electrical?.load_calculation_included,
    electrical_notes: (v8Bid as any).electrical_notes || v8Bid.electrical?.electrical_notes,

    // Red flags and positive indicators (v8 new fields)
    red_flags: v8Bid.red_flags || [],
    positive_indicators: v8Bid.positive_indicators || [],

    // Dates (v10: support flat date fields OR nested dates object)
    bid_date: (v8Bid as any).bid_date || v8Bid.dates?.bid_date,
    quote_date: (v8Bid as any).quote_date || v8Bid.dates?.quote_date,
    valid_until: v8Bid.timeline?.bid_valid_until,

    // Metadata
    pdf_upload_id: pdfUploadId,
    extraction_confidence: confidenceLevel,
    verified_by_user: false,
    is_favorite: false,

    // Scores (v8)
    overall_score: v8Bid.scores?.overall,
    value_score: v8Bid.scores?.price,
    quality_score: v8Bid.scores?.efficiency,
    completeness_score: v8Bid.scores?.completeness,
  };
}

/**
 * Map v8 equipment to bid_equipment table structure
 */
export function mapV8EquipmentToDatabase(
  v8Equipment: V8Equipment,
  bidId: string,
  overallConfidence: number
): Record<string, any> {
  return {
    bid_id: bidId,
    equipment_type: v8Equipment.equipment_type,
    brand: v8Equipment.brand,
    model_number: v8Equipment.model_number,
    model_name: v8Equipment.model_name,
    capacity_btu: v8Equipment.capacity_btu,
    capacity_tons: v8Equipment.capacity_tons,
    seer_rating: v8Equipment.seer_rating,
    seer2_rating: v8Equipment.seer2_rating,
    hspf_rating: v8Equipment.hspf_rating,
    hspf2_rating: v8Equipment.hspf2_rating,
    eer_rating: v8Equipment.eer_rating,
    cop: v8Equipment.cop,
    variable_speed: v8Equipment.variable_speed,
    stages: v8Equipment.stages,
    refrigerant_type: v8Equipment.refrigerant_type,
    sound_level_db: v8Equipment.sound_level_db,
    voltage: v8Equipment.voltage,
    
    // v8 new fields
    amperage_draw: v8Equipment.amperage_draw,
    minimum_circuit_amperage: v8Equipment.minimum_circuit_amperage,
    
    energy_star_certified: v8Equipment.energy_star,
    energy_star_most_efficient: v8Equipment.energy_star_most_efficient,
    confidence: mapConfidenceToLevel(overallConfidence),
  };
}

/**
 * Map v8 analysis to bid_analysis table structure
 */
export function mapV8AnalysisToDatabase(
  v8Response: BidSmartV8Response,
  projectId: string
): Record<string, any> {
  return {
    project_id: projectId,
    
    // FAQs (v8 new field)
    faqs: v8Response.faqs,
    
    // Clarification questions (v8 new field)
    clarification_questions: v8Response.questions,
    
    // Scoring metadata
    scoring_weights: v8Response.analysis?.scoring_metadata?.weights_used,
    
    // Recommendations
    recommended_bid_id: null, // Will be set after bids are created
    recommendation_reasoning: v8Response.analysis?.comparison_insights?.best_overall
      ? `Best overall: ${v8Response.analysis.comparison_insights.best_overall.contractor_name} (score: ${v8Response.analysis.comparison_insights.best_overall.score})`
      : null,
    
    // Metadata
    analysis_version: "v8",
    analyzed_at: v8Response.extraction_timestamp,
    model_used: "mindpal_v8",
  };
}

/**
 * Map confidence number or enum to level
 * v10: Supports both numeric (0-100 or 0-1) and enum ("high"|"medium"|"low") confidence
 */
function mapConfidenceToLevel(confidence?: number | string): string {
  if (!confidence) return "manual";
  
  // v10: Handle enum strings
  if (typeof confidence === 'string') {
    const lower = confidence.toLowerCase();
    if (lower === 'high' || lower === 'medium' || lower === 'low') {
      return lower;
    }
    return "manual";
  }
  
  // Handle numeric confidence (0-1 or 0-100)
  const normalized = confidence > 1 ? confidence / 100 : confidence;
  if (normalized >= 0.8) return "high";
  if (normalized >= 0.5) return "medium";
  return "low";
}
