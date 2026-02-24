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
  BidFaq,
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

export async function getBid(bidId: string): Promise<Bid | null> {
  const { data, error } = await supabase
    .from('bids')
    .select('*')
    .eq('id', bidId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getBidsByProject(projectId: string): Promise<Bid[]> {
  const { data, error } = await supabase
    .from('bids')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getBidCountByProject(projectId: string): Promise<number> {
  const { count, error } = await supabase
    .from('bids')
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
  const { data, error } = await supabase
    .from('bid_scope')
    .select('*')
    .eq('bid_id', bidId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getBidScopesByProject(projectId: string): Promise<BidScope[]> {
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

// ============================================
// BID CONTRACTORS (V2)
// ============================================

export async function getBidContractor(bidId: string): Promise<BidContractor | null> {
  const { data, error } = await supabase
    .from('bid_contractors')
    .select('*')
    .eq('bid_id', bidId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

// ============================================
// BID SCORES (V2)
// ============================================

export async function getBidScore(bidId: string): Promise<BidScore | null> {
  const { data, error } = await supabase
    .from('bid_scores')
    .select('*')
    .eq('bid_id', bidId)
    .maybeSingle();

  if (error) throw error;
  return data;
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
    .from('rebate_programs')
    .select('*')
    .eq('is_active', true)
    .order('program_name');

  if (error) throw error;
  return data || [];
}

export async function getRebatesByState(stateCode: string): Promise<RebateProgram[]> {
  const { data, error } = await supabase
    .from('rebate_programs')
    .select('*')
    .eq('is_active', true)
    .or(`available_nationwide.eq.true,available_states.cs.{${stateCode}}`);

  if (error) throw error;
  return data || [];
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
