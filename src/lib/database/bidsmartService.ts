/**
 * BidSmart Database Service
 * 
 * Core CRUD operations for projects, bids, and related data.
 */

import { supabase } from '../supabaseClient';
import type {
  Project,
  Bid,
  BidScope,
  BidContractor,
  BidScore,
  BidLineItem,
  BidEquipment,
  BidAnalysis,
  PdfUpload,
  MindPalExtraction,
  RebateProgram,
  ProjectRebate,
  ProjectRequirements,
  UserExt,
  ProjectStatus,
  PdfStatus,
  ProjectSummary,
  BidComparisonTableRow,
  BidWithChildren,
  BidFaq,
  BidQuestion,
  IncentiveProgramDB,
} from '../types';

// ============================================
// USERS
// ============================================

export async function getUserById(userId: string): Promise<UserExt | null> {
  const { data, error } = await supabase
    .from('users_ext')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function updateUser(
  userId: string,
  updates: Partial<UserExt>
): Promise<UserExt | null> {
  const { data, error } = await supabase
    .from('users_ext')
    .update(updates)
    .eq('id', userId)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}

// ============================================
// PROJECTS
// ============================================

export async function createProject(
  userId: string,
  projectData: Partial<Project> = {}
): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .insert({
      user_id: userId,
      project_name: projectData.project_name || 'My Heat Pump Project',
      status: projectData.status || 'draft',
      ...projectData,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getProject(projectId: string): Promise<Project | null> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getProjectsByUser(userId: string): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getDemoProject(userId: string): Promise<Project | null> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .eq('is_demo', true)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getPublicDemoProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('is_public_demo', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getProjectsWithPublicDemos(userId: string): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .or(`user_id.eq.${userId},is_public_demo.eq.true`)
    .order('is_public_demo', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function updateProject(
  projectId: string,
  updates: Partial<Project>
): Promise<Project | null> {
  const { data, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', projectId)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function updateProjectStatus(
  projectId: string,
  status: ProjectStatus
): Promise<Project | null> {
  return updateProject(projectId, { status });
}

export async function updateProjectDataSharingConsent(
  projectId: string,
  consent: boolean
): Promise<Project | null> {
  const updates: Partial<Project> = {
    data_sharing_consent: consent,
  };
  if (consent) {
    updates.data_sharing_consented_at = new Date().toISOString();
  }
  return updateProject(projectId, updates);
}

export async function updateProjectNotificationSettings(
  projectId: string,
  email: string,
  notifyOnCompletion: boolean
): Promise<Project | null> {
  return updateProject(projectId, {
    notification_email: email,
    notify_on_completion: notifyOnCompletion,
  });
}

export async function setProjectAnalysisQueued(
  projectId: string
): Promise<Project | null> {
  return updateProject(projectId, {
    analysis_queued_at: new Date().toISOString(),
    status: 'analyzing',
  });
}

export async function incrementProjectRerunCount(
  projectId: string
): Promise<Project | null> {
  const project = await getProject(projectId);
  if (!project) return null;

  return updateProject(projectId, {
    rerun_count: (project.rerun_count || 0) + 1,
  });
}

export async function getProjectsByNotificationEmail(
  email: string
): Promise<Project[]> {
  const normalizedEmail = email.toLowerCase().trim();

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .ilike('notification_email', normalizedEmail)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function deleteProject(projectId: string): Promise<void> {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId);

  if (error) throw error;
}

export async function getProjectBySessionId(sessionId: string): Promise<Project | null> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('session_id', sessionId)
    .eq('status', 'draft')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createDraftProject(
  userId: string,
  sessionId: string
): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .insert({
      user_id: userId,
      session_id: sessionId,
      project_name: 'My Heat Pump Project',
      status: 'draft',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================
// BIDS (V2 — thin identity stubs)
// ============================================

/**
 * Create a bid stub at PDF upload time.
 * The stub is updated by the MindPal callback with status='completed'.
 */
export async function createBidStub(
  projectId: string,
  pdfUploadId: string,
  requestId: string,
  storageKey?: string
): Promise<Bid> {
  const { data, error } = await supabase
    .from('bids')
    .insert({
      project_id: projectId,
      pdf_upload_id: pdfUploadId,
      request_id: requestId,
      storage_key: storageKey || null,
      status: 'pending',
      contractor_name: 'TBD',
      verified_by_user: false,
      is_favorite: false,
      processing_attempts: 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/** @deprecated Use createBidStub for V2 flow. Kept for backward compat. */
export async function createBid(
  projectId: string,
  bidData: Partial<Bid>
): Promise<Bid> {
  const { data, error } = await supabase
    .from('bids')
    .insert({
      project_id: projectId,
      contractor_name: bidData.contractor_name || 'Unknown Contractor',
      request_id: bidData.request_id || '',
      status: bidData.status || 'pending',
      verified_by_user: bidData.verified_by_user || false,
      is_favorite: bidData.is_favorite || false,
      processing_attempts: 0,
      ...bidData,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================
// V1 COMPATIBILITY LAYER
// Production DB still uses V1 schema (contractor_bids monolith).
// These helpers detect V2 table availability and fall back to V1.
// Remove once the V2 migration is applied to production.
// ============================================

/* eslint-disable @typescript-eslint/no-explicit-any */
function v1ToBid(row: any): Bid {
  return {
    id: row.id,
    project_id: row.project_id,
    pdf_upload_id: row.pdf_upload_id ?? null,
    bid_index: row.bid_index ?? null,
    status: row.status ?? 'complete',
    request_id: row.request_id ?? row.id,
    storage_key: null,
    source_doc_url: null,
    source_doc_mime: null,
    processing_attempts: 0,
    last_error: null,
    contractor_name: row.contractor_name ?? 'Unknown',
    verified_by_user: row.verified_by_user ?? false,
    verified_at: row.verified_at ?? null,
    user_notes: row.user_notes ?? null,
    is_favorite: row.is_favorite ?? false,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function v1ToScope(row: any): BidScope {
  return {
    id: row.id, // reuse bid id as pseudo-scope id
    bid_id: row.id,
    total_bid_amount: row.total_bid_amount,
    labor_cost: row.labor_cost,
    equipment_cost: row.equipment_cost,
    materials_cost: row.materials_cost,
    permit_cost: row.permit_cost,
    disposal_cost: row.disposal_cost,
    electrical_cost: row.electrical_cost,
    total_before_rebates: row.total_before_rebates,
    estimated_rebates: row.estimated_rebates,
    total_after_rebates: row.total_after_rebates,
    deposit_required: row.deposit_required,
    deposit_percentage: row.deposit_percentage,
    payment_schedule: row.payment_schedule,
    financing_offered: row.financing_offered,
    financing_terms: row.financing_terms,
    labor_warranty_years: row.labor_warranty_years,
    equipment_warranty_years: row.equipment_warranty_years,
    compressor_warranty_years: row.compressor_warranty_years,
    additional_warranty_details: row.additional_warranty_details,
    estimated_days: row.estimated_days,
    start_date_available: row.start_date_available,
    bid_date: row.bid_date,
    valid_until: row.valid_until,
    extraction_confidence: row.extraction_confidence,
    extraction_notes: row.extraction_notes,
    summary: row.scope_summary ?? null,
    inclusions: row.inclusions,
    exclusions: row.exclusions,
    // V1 scope booleans have scope_ prefix
    permit_included: row.scope_permit_included,
    disposal_included: row.scope_disposal_included,
    electrical_included: row.scope_electrical_included,
    ductwork_included: row.scope_ductwork_included,
    thermostat_included: row.scope_thermostat_included,
    manual_j_included: row.scope_manual_j_included,
    commissioning_included: row.scope_commissioning_included,
    air_handler_included: row.scope_air_handler_included,
    line_set_included: row.scope_line_set_included,
    disconnect_included: row.scope_disconnect_included,
    pad_included: row.scope_pad_included,
    drain_line_included: row.scope_drain_line_included,
    // V1 electrical fields keep electrical_ prefix
    panel_assessment_included: row.electrical_panel_assessment_included,
    panel_upgrade_included: row.electrical_panel_upgrade_included,
    dedicated_circuit_included: row.electrical_dedicated_circuit_included,
    electrical_permit_included: row.electrical_permit_included,
    load_calculation_included: row.electrical_load_calculation_included,
    existing_panel_amps: row.electrical_existing_panel_amps,
    proposed_panel_amps: row.electrical_proposed_panel_amps,
    breaker_size_required: row.electrical_breaker_size_required,
    panel_upgrade_cost: row.electrical_panel_upgrade_cost,
    electrical_notes: row.electrical_notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function v1ToContractor(row: any): BidContractor {
  return {
    id: row.id, // reuse bid id as pseudo-contractor id
    bid_id: row.id,
    name: row.contractor_name,
    company: row.contractor_company,
    phone: row.contractor_phone,
    email: row.contractor_email,
    website: row.contractor_website,
    license: row.contractor_license,
    license_state: row.contractor_license_state,
    insurance_verified: row.contractor_insurance_verified,
    bonded: row.contractor_bonded ?? null,
    years_in_business: row.contractor_years_in_business,
    year_established: row.contractor_year_established,
    total_installs: row.contractor_total_installs,
    certifications: row.contractor_certifications,
    employee_count: row.contractor_employee_count ? Number(row.contractor_employee_count) : null,
    service_area: row.contractor_service_area,
    google_rating: row.contractor_google_rating,
    google_review_count: row.contractor_google_review_count,
    yelp_rating: row.contractor_yelp_rating,
    yelp_review_count: row.contractor_yelp_review_count,
    bbb_rating: row.contractor_bbb_rating,
    bbb_accredited: row.contractor_bbb_accredited,
    bbb_complaints_3yr: row.contractor_bbb_complaints_3yr,
    contact_name: row.contractor_contact_name ?? null,
    address: row.contractor_address ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function v1ToScore(row: any): BidScore {
  return {
    id: row.id, // reuse bid id as pseudo-score id
    bid_id: row.id,
    overall_score: row.overall_score ?? row.mindpal_overall_score,
    value_score: row.value_score ?? row.mindpal_value_score,
    quality_score: row.quality_score ?? row.mindpal_quality_score,
    completeness_score: row.completeness_score,
    ranking_recommendation: row.ranking_recommendation,
    red_flags: row.red_flags ?? [],
    positive_indicators: row.positive_indicators ?? [],
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// Cache whether V2 bids table exists to avoid repeated failed queries
let _v2Available: boolean | null = null;

async function isV2Schema(): Promise<boolean> {
  if (_v2Available !== null) return _v2Available;
  const { error } = await supabase
    .from('bids')
    .select('id', { count: 'exact', head: true })
    .limit(0);
  _v2Available = !error;
  return _v2Available;
}

async function getV1BidsByProject(projectId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('contractor_bids')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

async function getV1BidById(bidId: string): Promise<any | null> {
  const { data, error } = await supabase
    .from('contractor_bids')
    .select('*')
    .eq('id', bidId)
    .maybeSingle();
  if (error) throw error;
  return data;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ============================================

export async function getBid(bidId: string): Promise<Bid | null> {
  if (await isV2Schema()) {
    const { data, error } = await supabase
      .from('bids')
      .select('*')
      .eq('id', bidId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }
  const row = await getV1BidById(bidId);
  return row ? v1ToBid(row) : null;
}

export async function getBidsByProject(projectId: string): Promise<Bid[]> {
  if (await isV2Schema()) {
    const { data, error } = await supabase
      .from('bids')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  }
  const rows = await getV1BidsByProject(projectId);
  return rows.map(v1ToBid);
}

export async function getBidCountByProject(projectId: string): Promise<number> {
  const table = (await isV2Schema()) ? 'bids' : 'contractor_bids';
  const { count, error } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true })
    .eq('project_id', projectId);

  if (error) throw error;
  return count || 0;
}

export async function updateBid(
  bidId: string,
  updates: Partial<Bid>
): Promise<Bid | null> {
  const { data, error } = await supabase
    .from('bids')
    .update(updates)
    .eq('id', bidId)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function deleteBid(bidId: string): Promise<void> {
  const { error } = await supabase
    .from('bids')
    .delete()
    .eq('id', bidId);

  if (error) throw error;
}

export async function getBidWithChildren(bidId: string): Promise<BidWithChildren> {
  const bid = await getBid(bidId);
  if (!bid) throw new Error(`Bid not found: ${bidId}`);

  const [scope, contractor, scores, equipment, questions] = await Promise.all([
    getBidScope(bidId),
    getBidContractor(bidId),
    getBidScore(bidId),
    getEquipmentByBid(bidId),
    (async () => {
      const { data, error } = await supabase
        .from('contractor_questions')
        .select('*')
        .eq('bid_id', bidId)
        .order('display_order', { ascending: true });
      if (error) throw error;
      return (data || []) as BidQuestion[];
    })(),
  ]);

  return { bid, scope, contractor, scores, equipment, questions };
}

export async function toggleBidFavorite(bidId: string): Promise<Bid | null> {
  const bid = await getBid(bidId);
  if (!bid) return null;

  return updateBid(bidId, { is_favorite: !bid.is_favorite });
}

export async function verifyBid(bidId: string): Promise<Bid | null> {
  return updateBid(bidId, {
    verified_by_user: true,
    verified_at: new Date().toISOString(),
  });
}

// ============================================
// BID SCOPE (V2 — all extracted data)
// ============================================

export async function getBidScope(bidId: string): Promise<BidScope | null> {
  if (await isV2Schema()) {
    const { data, error } = await supabase
      .from('bid_scope')
      .select('*')
      .eq('bid_id', bidId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }
  // V1 fallback: scope fields live on contractor_bids
  const row = await getV1BidById(bidId);
  return row ? v1ToScope(row) : null;
}

export async function getBidScopesByProject(projectId: string): Promise<BidScope[]> {
  if (await isV2Schema()) {
    // Join through bids to filter by project
    const { data, error } = await supabase
      .from('bid_scope')
      .select('*, bids!inner(project_id)')
      .eq('bids.project_id', projectId);
    if (error) throw error;
    return (data || []).map((row: Record<string, unknown>) => {
      const { bids: _, ...scope } = row;
      return scope as unknown as BidScope;
    });
  }
  // V1 fallback
  const rows = await getV1BidsByProject(projectId);
  return rows.map(v1ToScope);
}

// ============================================
// BID CONTRACTORS (V2)
// ============================================

export async function getBidContractor(bidId: string): Promise<BidContractor | null> {
  if (await isV2Schema()) {
    const { data, error } = await supabase
      .from('bid_contractors')
      .select('*')
      .eq('bid_id', bidId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }
  // V1 fallback: contractor fields live on contractor_bids
  const row = await getV1BidById(bidId);
  return row ? v1ToContractor(row) : null;
}

// ============================================
// BID SCORES (V2)
// ============================================

export async function getBidScore(bidId: string): Promise<BidScore | null> {
  if (await isV2Schema()) {
    const { data, error } = await supabase
      .from('bid_scores')
      .select('*')
      .eq('bid_id', bidId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }
  // V1 fallback: score fields live on contractor_bids
  const row = await getV1BidById(bidId);
  return row ? v1ToScore(row) : null;
}

// ============================================
// BID LINE ITEMS
// ============================================

export async function createLineItem(
  bidId: string,
  itemData: Partial<BidLineItem>
): Promise<BidLineItem> {
  const { data, error } = await supabase
    .from('bid_line_items')
    .insert({
      bid_id: bidId,
      item_type: itemData.item_type || 'other',
      description: itemData.description || '',
      quantity: itemData.quantity || 1,
      total_price: itemData.total_price || 0,
      confidence: itemData.confidence || 'manual',
      ...itemData,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getLineItemsByBid(bidId: string): Promise<BidLineItem[]> {
  const { data, error } = await supabase
    .from('bid_line_items')
    .select('*')
    .eq('bid_id', bidId)
    .order('line_order', { nullsFirst: false });

  if (error) throw error;
  return data || [];
}

export async function updateLineItem(
  itemId: string,
  updates: Partial<BidLineItem>
): Promise<BidLineItem | null> {
  const { data, error } = await supabase
    .from('bid_line_items')
    .update(updates)
    .eq('id', itemId)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function deleteLineItem(itemId: string): Promise<void> {
  const { error } = await supabase
    .from('bid_line_items')
    .delete()
    .eq('id', itemId);

  if (error) throw error;
}

export async function bulkCreateLineItems(
  bidId: string,
  items: Partial<BidLineItem>[]
): Promise<BidLineItem[]> {
  const itemsToInsert = items.map((item, index) => ({
    bid_id: bidId,
    item_type: item.item_type || 'other',
    description: item.description || '',
    quantity: item.quantity || 1,
    total_price: item.total_price || 0,
    confidence: item.confidence || 'manual',
    line_order: index,
    ...item,
  }));

  const { data, error } = await supabase
    .from('bid_line_items')
    .insert(itemsToInsert)
    .select();

  if (error) throw error;
  return data || [];
}

// ============================================
// BID EQUIPMENT
// ============================================

export async function createEquipment(
  bidId: string,
  equipmentData: Partial<BidEquipment>
): Promise<BidEquipment> {
  const { data, error } = await supabase
    .from('bid_equipment')
    .insert({
      bid_id: bidId,
      equipment_type: equipmentData.equipment_type || 'other',
      brand: equipmentData.brand || 'Unknown',
      confidence: equipmentData.confidence || 'manual',
      ...equipmentData,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getEquipmentByBid(bidId: string): Promise<BidEquipment[]> {
  const { data, error } = await supabase
    .from('bid_equipment')
    .select('*')
    .eq('bid_id', bidId);

  if (error) throw error;
  return data || [];
}

export async function updateEquipment(
  equipmentId: string,
  updates: Partial<BidEquipment>
): Promise<BidEquipment | null> {
  const { data, error } = await supabase
    .from('bid_equipment')
    .update(updates)
    .eq('id', equipmentId)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function deleteEquipment(equipmentId: string): Promise<void> {
  const { error } = await supabase
    .from('bid_equipment')
    .delete()
    .eq('id', equipmentId);

  if (error) throw error;
}

export async function bulkCreateEquipment(
  bidId: string,
  equipment: Partial<BidEquipment>[]
): Promise<BidEquipment[]> {
  const equipmentToInsert = equipment.map((eq) => ({
    bid_id: bidId,
    equipment_type: eq.equipment_type || 'other',
    brand: eq.brand || 'Unknown',
    confidence: eq.confidence || 'manual',
    ...eq,
  }));

  const { data, error } = await supabase
    .from('bid_equipment')
    .insert(equipmentToInsert)
    .select();

  if (error) throw error;
  return data || [];
}

// ============================================
// BID ANALYSIS
// ============================================

export async function createAnalysis(
  projectId: string,
  analysisData: Partial<BidAnalysis>
): Promise<BidAnalysis> {
  const { data, error } = await supabase
    .from('bid_analysis')
    .insert({
      project_id: projectId,
      analysis_version: '1.0',
      ...analysisData,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getLatestAnalysis(projectId: string): Promise<BidAnalysis | null> {
  const { data, error } = await supabase
    .from('bid_analysis')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function updateAnalysis(
  analysisId: string,
  updates: Partial<BidAnalysis>
): Promise<BidAnalysis | null> {
  const { data, error } = await supabase
    .from('bid_analysis')
    .update(updates)
    .eq('id', analysisId)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}

// ============================================
// PDF UPLOADS
// ============================================

export async function createPdfUpload(
  projectId: string,
  uploadData: Partial<PdfUpload>
): Promise<PdfUpload> {
  const { data, error } = await supabase
    .from('pdf_uploads')
    .insert({
      project_id: projectId,
      file_name: uploadData.file_name || 'unknown.pdf',
      file_path: uploadData.file_path || '',
      status: uploadData.status || 'uploaded',
      retry_count: 0,
      ...uploadData,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getPdfUpload(uploadId: string): Promise<PdfUpload | null> {
  const { data, error } = await supabase
    .from('pdf_uploads')
    .select('*')
    .eq('id', uploadId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getPdfUploadsByProject(projectId: string): Promise<PdfUpload[]> {
  const { data, error } = await supabase
    .from('pdf_uploads')
    .select('*')
    .eq('project_id', projectId)
    .order('uploaded_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function updatePdfUploadStatus(
  uploadId: string,
  status: PdfStatus,
  additionalData: Partial<PdfUpload> = {}
): Promise<PdfUpload | null> {
  const updateData: Partial<PdfUpload> & { status: PdfStatus } = {
    status,
    ...additionalData,
  };
  if (status === 'processing') {
    updateData.processing_started_at = new Date().toISOString();
  }
  if (status === 'extracted' || status === 'failed') {
    updateData.processing_completed_at = new Date().toISOString();
  }
  const { data, error } = await supabase
    .from('pdf_uploads')
    .update(updateData)
    .eq('id', uploadId)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function incrementPdfRetryCount(uploadId: string): Promise<PdfUpload | null> {
  const upload = await getPdfUpload(uploadId);
  if (!upload) return null;

  const { data, error } = await supabase
    .from('pdf_uploads')
    .update({ retry_count: upload.retry_count + 1 })
    .eq('id', uploadId)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}

// ============================================
// MINDPAL EXTRACTIONS
// ============================================

export async function createMindPalExtraction(
  pdfUploadId: string,
  rawJson: Record<string, unknown>
): Promise<MindPalExtraction> {
  const { data, error } = await supabase
    .from('mindpal_extractions')
    .insert({
      pdf_upload_id: pdfUploadId,
      raw_json: rawJson,
      parsed_successfully: false,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateMindPalExtraction(
  extractionId: string,
  updates: Partial<MindPalExtraction>
): Promise<MindPalExtraction | null> {
  const { data, error } = await supabase
    .from('mindpal_extractions')
    .update(updates)
    .eq('id', extractionId)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getExtractionByPdfUpload(
  pdfUploadId: string
): Promise<MindPalExtraction | null> {
  const { data, error } = await supabase
    .from('mindpal_extractions')
    .select('*')
    .eq('pdf_upload_id', pdfUploadId)
    .order('extracted_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

// ============================================
// REBATE PROGRAMS
// ============================================

export async function getActiveRebates(): Promise<RebateProgram[]> {
  const { data, error } = await supabase
    .from('incentive_program_database')
    .select('*')
    .eq('is_active', true)
    .order('program_name');

  if (error) throw error;
  return data || [];
}

export async function getRebatesByState(stateCode: string): Promise<RebateProgram[]> {
  const { data, error } = await supabase
    .from('incentive_program_database')
    .select('*')
    .eq('is_active', true)
    .or(`available_nationwide.eq.true,available_states.cs.{${stateCode}}`);

  if (error) throw error;
  return data || [];
}

export async function getIncentivesByZip(zip: string, stateCode?: string): Promise<IncentiveProgramDB[]> {
  if (zip && zip.length === 5) {
    // Primary path: filter by zip code match OR nationwide
    // Also include state-only programs (where available_zip_codes is null but available_states matches)
    const { data, error } = await supabase
      .from('incentive_program_database')
      .select('*')
      .eq('is_active', true)
      .or(`available_nationwide.eq.true,available_zip_codes.cs.{${zip}}${stateCode ? `,and(available_zip_codes.is.null,available_states.cs.{${stateCode}})` : ''}`)
      .order('program_name');

    if (error) throw error;
    return (data || []) as IncentiveProgramDB[];
  }

  if (stateCode) {
    // Fallback: no zip but have state — use state + nationwide
    const { data, error } = await supabase
      .from('incentive_program_database')
      .select('*')
      .eq('is_active', true)
      .or(`available_nationwide.eq.true,available_states.cs.{${stateCode}}`)
      .order('program_name');

    if (error) throw error;
    return (data || []) as IncentiveProgramDB[];
  }

  // Last resort: nationwide only
  const { data, error } = await supabase
    .from('incentive_program_database')
    .select('*')
    .eq('is_active', true)
    .eq('available_nationwide', true)
    .order('program_name');

  if (error) throw error;
  return (data || []) as IncentiveProgramDB[];
}

interface ProjectRebateWithProgram {
  id: string;
  project_id: string;
  rebate_program_id: string;
  is_eligible: boolean | null;
  eligibility_notes: string | null;
  estimated_amount: number | null;
  applied_amount: number | null;
  application_status: string | null;
  application_date: string | null;
  approval_date: string | null;
  created_at: string;
  updated_at: string;
  rebate_programs: RebateProgram;
}

export async function getProjectRebates(projectId: string): Promise<Array<{
  program: RebateProgram;
  projectRebate: ProjectRebate;
}>> {
  const { data, error } = await supabase
    .from('project_rebates')
    .select(`
      *,
      rebate_programs (*)
    `)
    .eq('project_id', projectId);

  if (error) throw error;

  return (data as ProjectRebateWithProgram[] || []).map((item) => ({
    program: item.rebate_programs,
    projectRebate: {
      id: item.id,
      project_id: item.project_id,
      rebate_program_id: item.rebate_program_id,
      is_eligible: item.is_eligible ?? false,
      eligibility_notes: item.eligibility_notes,
      estimated_amount: item.estimated_amount,
      applied_amount: item.applied_amount,
      application_status: item.application_status,
      application_date: item.application_date,
      approval_date: item.approval_date,
      created_at: item.created_at,
      updated_at: item.updated_at,
    },
  }));
}

export async function addProjectRebate(
  projectId: string,
  rebateProgramId: string,
  estimatedAmount?: number
): Promise<ProjectRebate> {
  const { data, error } = await supabase
    .from('project_rebates')
    .insert({
      project_id: projectId,
      rebate_program_id: rebateProgramId,
      is_eligible: true,
      estimated_amount: estimatedAmount,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================
// COMPOSITE QUERIES
// ============================================

export async function getProjectSummary(projectId: string): Promise<ProjectSummary | null> {
  // Get project
  const project = await getProject(projectId);
  if (!project) return null;

  // Get bids with their scope, contractor, scores, line items, and equipment
  const bids = await getBidsByProject(projectId);
  const bidsWithDetails: BidComparisonTableRow[] = await Promise.all(
    bids.map(async (bid) => {
      const [scope, contractor, scores, lineItems, equipment] = await Promise.all([
        getBidScope(bid.id),
        getBidContractor(bid.id),
        getBidScore(bid.id),
        getLineItemsByBid(bid.id),
        getEquipmentByBid(bid.id),
      ]);

      return {
        bid,
        scope,
        contractor,
        scores,
        equipment,
        lineItems,
      };
    })
  );

  // Get analysis
  const analysis = await getLatestAnalysis(projectId);

  // Get rebates
  const rebates = await getProjectRebates(projectId);

  // Calculate stats from bid_scope pricing
  const prices = bidsWithDetails
    .map((b) => b.scope?.total_bid_amount)
    .filter((p): p is number => p != null && p > 0);

  const stats = {
    totalBids: bids.length,
    averagePrice: prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0,
    lowestPrice: prices.length > 0 ? Math.min(...prices) : 0,
    highestPrice: prices.length > 0 ? Math.max(...prices) : 0,
    bestValueBidId: bidsWithDetails.reduce((best, row) =>
      (row.scores?.value_score || 0) > (best?.scores?.value_score || 0) ? row : best,
      bidsWithDetails[0]
    )?.bid.id || null,
    bestQualityBidId: bidsWithDetails.reduce((best, row) =>
      (row.scores?.quality_score || 0) > (best?.scores?.quality_score || 0) ? row : best,
      bidsWithDetails[0]
    )?.bid.id || null,
  };

  return {
    project,
    bids: bidsWithDetails,
    analysis,
    rebates,
    stats,
  };
}

// ============================================
// STORAGE
// ============================================

const MAX_PDF_SIZE_BYTES = 25 * 1024 * 1024;
const ALLOWED_PDF_EXTENSIONS = ['pdf', 'doc', 'docx'];
const ALLOWED_PDF_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

export interface PdfValidationError {
  code: 'INVALID_EXTENSION' | 'INVALID_MIME_TYPE' | 'FILE_TOO_LARGE';
  message: string;
}

export function validatePdfFile(file: File): PdfValidationError | null {
  const fileExt = file.name.split('.').pop()?.toLowerCase();
  if (!fileExt || !ALLOWED_PDF_EXTENSIONS.includes(fileExt)) {
    return {
      code: 'INVALID_EXTENSION',
      message: 'Only PDF and Word documents (.pdf, .doc, .docx) are allowed.',
    };
  }

  if (!ALLOWED_PDF_MIME_TYPES.includes(file.type)) {
    return {
      code: 'INVALID_MIME_TYPE',
      message: 'Invalid file type. Please upload a valid PDF or Word document.',
    };
  }

  if (file.size > MAX_PDF_SIZE_BYTES) {
    return {
      code: 'FILE_TOO_LARGE',
      message: `File size exceeds the maximum allowed size of ${MAX_PDF_SIZE_BYTES / (1024 * 1024)}MB.`,
    };
  }

  return null;
}

export async function uploadPdfToStorage(
  projectId: string,
  file: File
): Promise<{ path: string; url: string }> {
  const validationError = validatePdfFile(file);
  if (validationError) {
    throw new Error(validationError.message);
  }

  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'pdf';
  const fileName = `${Date.now()}_${crypto.randomUUID()}.${fileExt}`;
  const filePath = `bids/${projectId}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('bid-pdfs')
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  const { data: urlData, error: urlError } = await supabase.storage
    .from('bid-pdfs')
    .createSignedUrl(filePath, 3600);

  if (urlError) throw urlError;

  return {
    path: filePath,
    url: urlData.signedUrl,
  };
}

export async function getPdfSignedUrl(filePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('bid-pdfs')
    .createSignedUrl(filePath, 3600);

  if (error) throw error;
  return data.signedUrl;
}

export async function deletePdfFromStorage(filePath: string): Promise<void> {
  const { error } = await supabase.storage
    .from('bid-pdfs')
    .remove([filePath]);

  if (error) throw error;
}

// ============================================
// PROJECT REQUIREMENTS
// ============================================

export async function getProjectRequirements(
  projectId: string
): Promise<ProjectRequirements | null> {
  const { data, error } = await supabase
    .from('project_requirements')
    .select('*')
    .eq('project_id', projectId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createProjectRequirements(
  projectId: string,
  requirements: Partial<ProjectRequirements> = {}
): Promise<ProjectRequirements> {
  const { data, error } = await supabase
    .from('project_requirements')
    .insert({
      project_id: projectId,
      priority_price: requirements.priority_price ?? 3,
      priority_warranty: requirements.priority_warranty ?? 3,
      priority_efficiency: requirements.priority_efficiency ?? 3,
      priority_timeline: requirements.priority_timeline ?? 3,
      priority_reputation: requirements.priority_reputation ?? 3,
      timeline_urgency: requirements.timeline_urgency ?? 'flexible',
      specific_concerns: requirements.specific_concerns ?? [],
      must_have_features: requirements.must_have_features ?? [],
      nice_to_have_features: requirements.nice_to_have_features ?? [],
      ...requirements,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateProjectRequirements(
  projectId: string,
  updates: Partial<ProjectRequirements>
): Promise<ProjectRequirements | null> {
  const { data, error } = await supabase
    .from('project_requirements')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('project_id', projectId)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function saveProjectRequirements(
  projectId: string,
  requirements: Partial<ProjectRequirements>
): Promise<ProjectRequirements> {
  const existing = await getProjectRequirements(projectId);

  if (existing) {
    const updated = await updateProjectRequirements(projectId, {
      ...requirements,
      completed_at: new Date().toISOString(),
    });
    if (!updated) throw new Error('Failed to update requirements');
    return updated;
  }

  return createProjectRequirements(projectId, {
    ...requirements,
    completed_at: new Date().toISOString(),
  });
}

// ============================================
// BID FAQs
// ============================================

export async function getFaqsByBid(bidId: string): Promise<BidFaq[]> {
  const { data, error } = await supabase
    .from('bid_faqs')
    .select('*')
    .eq('bid_id', bidId)
    .order('display_order', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createBidFaq(
  bidId: string,
  faqData: Partial<BidFaq>
): Promise<BidFaq> {
  const { data, error } = await supabase
    .from('bid_faqs')
    .insert({
      bid_id: bidId,
      ...faqData,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function bulkCreateBidFaqs(
  bidId: string,
  faqs: Partial<BidFaq>[]
): Promise<BidFaq[]> {
  const faqsToInsert = faqs.map(faq => ({
    bid_id: bidId,
    ...faq,
  }));

  const { data, error } = await supabase
    .from('bid_faqs')
    .insert(faqsToInsert)
    .select();

  if (error) throw error;
  return data || [];
}

export async function updateBidFaq(
  faqId: string,
  updates: Partial<BidFaq>
): Promise<BidFaq | null> {
  const { data, error } = await supabase
    .from('bid_faqs')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', faqId)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function deleteBidFaq(faqId: string): Promise<void> {
  const { error } = await supabase
    .from('bid_faqs')
    .delete()
    .eq('id', faqId);

  if (error) throw error;
}

export async function getFaqsByProject(
  projectId: string,
  bids: Array<{ bid: Bid }>
): Promise<import('../types').ProjectFaqData> {
  const overallFaqsPromise = supabase
    .from('project_faqs')
    .select('*')
    .eq('project_id', projectId)
    .order('display_order', { ascending: true });

  const bidFaqsPromises = bids.map(async (bidData, index) => {
    const faqs = await getFaqsByBid(bidData.bid.id);
    return {
      bid_id: bidData.bid.id,
      bid_index: index,
      contractor_name: bidData.bid.contractor_name || `Bid ${index + 1}`,
      faqs,
    };
  });

  const [overallResult, ...bidFaqResults] = await Promise.all([
    overallFaqsPromise,
    ...bidFaqsPromises,
  ]);

  return {
    overall: overallResult.data || [],
    by_bid: bidFaqResults,
  };
}
