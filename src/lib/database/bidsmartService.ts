/**
 * BidSmart V2 Database Service
 *
 * All queries target V2 normalized tables and views.
 * V2 schema: bids + bid_contractors + bid_scope + bid_scores + bid_equipment (1:N)
 * Views: v_bid_summary, v_bid_compare_equipment, v_bid_compare_contractors,
 *        v_bid_compare_scope, v_bid_full
 */

import { supabase } from '../supabaseClient';
import type {
  Project,
  Bid,
  BidContractor,
  BidScope,
  BidScores,
  BidEquipment,
  BidWithChildren,
  BidSummaryView,
  BidAnalysis,
  PdfUpload,
  MindPalExtraction,
  ProjectIncentive,
  ContractorQuestion,
  BidFaq,
  ProjectFaq,
  ProjectQIIChecklist,
  ProjectRequirements,
  UserExt,
  ProjectStatus,
  PdfStatus,
  ProjectSummary,
  BidComparisonTableRow,
  ProjectFaqData,
  // Deprecated V1 types — kept for backward compat during migration
  RebateProgram,
  ProjectRebate,
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
// BIDS (V2 — normalized)
// ============================================

export async function createBid(
  projectId: string,
  bidData: Partial<Bid>
): Promise<Bid> {
  const { data, error } = await supabase
    .from('bids')
    .insert({
      project_id: projectId,
      contractor_name: bidData.contractor_name || 'Unknown Contractor',
      total_bid_amount: bidData.total_bid_amount || 0,
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
    .order('bid_index', { ascending: true, nullsFirst: false });

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
// BID CONTRACTORS (V2 — 1:1 per bid)
// ============================================

export async function createBidContractor(
  bidId: string,
  contractorData: Partial<BidContractor>
): Promise<BidContractor> {
  const { data, error } = await supabase
    .from('bid_contractors')
    .insert({
      bid_id: bidId,
      name: contractorData.name || 'Unknown',
      ...contractorData,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getBidContractor(bidId: string): Promise<BidContractor | null> {
  const { data, error } = await supabase
    .from('bid_contractors')
    .select('*')
    .eq('bid_id', bidId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function updateBidContractor(
  bidId: string,
  updates: Partial<BidContractor>
): Promise<BidContractor | null> {
  const { data, error } = await supabase
    .from('bid_contractors')
    .update(updates)
    .eq('bid_id', bidId)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}

// ============================================
// BID SCOPE (V2 — 1:1 per bid)
// ============================================

export async function createBidScope(
  bidId: string,
  scopeData: Partial<BidScope>
): Promise<BidScope> {
  const { data, error } = await supabase
    .from('bid_scope')
    .insert({
      bid_id: bidId,
      ...scopeData,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getBidScope(bidId: string): Promise<BidScope | null> {
  const { data, error } = await supabase
    .from('bid_scope')
    .select('*')
    .eq('bid_id', bidId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function updateBidScope(
  bidId: string,
  updates: Partial<BidScope>
): Promise<BidScope | null> {
  const { data, error } = await supabase
    .from('bid_scope')
    .update(updates)
    .eq('bid_id', bidId)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}

// ============================================
// BID SCORES (V2 — 1:1 per bid)
// ============================================

export async function createBidScores(
  bidId: string,
  scoresData: Partial<BidScores>
): Promise<BidScores> {
  const { data, error } = await supabase
    .from('bid_scores')
    .insert({
      bid_id: bidId,
      ...scoresData,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getBidScores(bidId: string): Promise<BidScores | null> {
  const { data, error } = await supabase
    .from('bid_scores')
    .select('*')
    .eq('bid_id', bidId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function updateBidScores(
  bidId: string,
  updates: Partial<BidScores>
): Promise<BidScores | null> {
  const { data, error } = await supabase
    .from('bid_scores')
    .update(updates)
    .eq('bid_id', bidId)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}

// ============================================
// BID EQUIPMENT (V2 — 1:N per bid)
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
// CONTRACTOR QUESTIONS (V2 — replaces bid_questions)
// ============================================

export async function getQuestionsByBid(bidId: string): Promise<ContractorQuestion[]> {
  const { data, error } = await supabase
    .from('contractor_questions')
    .select('*')
    .eq('bid_id', bidId)
    .order('display_order', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createContractorQuestion(
  bidId: string,
  questionData: Partial<ContractorQuestion>
): Promise<ContractorQuestion> {
  const { data, error } = await supabase
    .from('contractor_questions')
    .insert({
      bid_id: bidId,
      question_text: questionData.question_text || '',
      ...questionData,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function bulkCreateContractorQuestions(
  bidId: string,
  questions: Partial<ContractorQuestion>[]
): Promise<ContractorQuestion[]> {
  const questionsToInsert = questions.map((q) => ({
    bid_id: bidId,
    question_text: q.question_text || '',
    ...q,
  }));

  const { data, error } = await supabase
    .from('contractor_questions')
    .insert(questionsToInsert)
    .select();

  if (error) throw error;
  return data || [];
}

export async function updateContractorQuestion(
  questionId: string,
  updates: Partial<ContractorQuestion>
): Promise<ContractorQuestion | null> {
  const { data, error } = await supabase
    .from('contractor_questions')
    .update(updates)
    .eq('id', questionId)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function markQuestionAnswered(
  questionId: string,
  answerText: string
): Promise<ContractorQuestion | null> {
  return updateContractorQuestion(questionId, {
    is_answered: true,
    answer_text: answerText,
    answered_at: new Date().toISOString(),
  });
}

// ============================================
// PROJECT INCENTIVES (V2 — replaces rebate_programs + project_rebates)
// ============================================

export async function getProjectIncentives(projectId: string): Promise<ProjectIncentive[]> {
  const { data, error } = await supabase
    .from('project_incentives')
    .select('*')
    .eq('project_id', projectId)
    .order('program_type', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createProjectIncentive(
  projectId: string,
  incentiveData: Partial<ProjectIncentive>
): Promise<ProjectIncentive> {
  const { data, error } = await supabase
    .from('project_incentives')
    .insert({
      project_id: projectId,
      source: incentiveData.source || 'ai_discovered',
      program_name: incentiveData.program_name || 'Unknown Program',
      program_type: incentiveData.program_type || 'federal',
      ...incentiveData,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function bulkCreateProjectIncentives(
  projectId: string,
  incentives: Partial<ProjectIncentive>[]
): Promise<ProjectIncentive[]> {
  const toInsert = incentives.map((inc) => ({
    project_id: projectId,
    source: inc.source || 'ai_discovered',
    program_name: inc.program_name || 'Unknown Program',
    program_type: inc.program_type || 'federal',
    ...inc,
  }));

  const { data, error } = await supabase
    .from('project_incentives')
    .insert(toInsert)
    .select();

  if (error) throw error;
  return data || [];
}

export async function updateProjectIncentive(
  incentiveId: string,
  updates: Partial<ProjectIncentive>
): Promise<ProjectIncentive | null> {
  const { data, error } = await supabase
    .from('project_incentives')
    .update(updates)
    .eq('id', incentiveId)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
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
      question: faqData.question || '',
      answer: faqData.answer || '',
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
    question: faq.question || '',
    answer: faq.answer || '',
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
    .update(updates)
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

// ============================================
// PROJECT FAQs
// ============================================

export async function getProjectFaqs(projectId: string): Promise<ProjectFaq[]> {
  const { data, error } = await supabase
    .from('project_faqs')
    .select('*')
    .eq('project_id', projectId)
    .order('display_order', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function bulkCreateProjectFaqs(
  projectId: string,
  faqs: Partial<ProjectFaq>[]
): Promise<ProjectFaq[]> {
  const toInsert = faqs.map(faq => ({
    project_id: projectId,
    question: faq.question || '',
    answer: faq.answer || '',
    ...faq,
  }));

  const { data, error } = await supabase
    .from('project_faqs')
    .insert(toInsert)
    .select();

  if (error) throw error;
  return data || [];
}

/**
 * Get all FAQs for a project — both project-level and per-bid.
 */
export async function getFaqsByProject(
  projectId: string,
  bids: Array<{ bid: Bid }>
): Promise<ProjectFaqData> {
  const overallFaqsPromise = getProjectFaqs(projectId);

  const bidFaqsPromises = bids.map(async (bidData, index) => {
    const faqs = await getFaqsByBid(bidData.bid.id);
    return {
      bid_id: bidData.bid.id,
      bid_index: index,
      contractor_name: bidData.bid.contractor_name || `Bid ${index + 1}`,
      faqs,
    };
  });

  const [overall, ...bidFaqResults] = await Promise.all([
    overallFaqsPromise,
    ...bidFaqsPromises,
  ]);

  return {
    overall,
    by_bid: bidFaqResults,
  };
}

// ============================================
// PROJECT QII CHECKLIST
// ============================================

export async function getProjectQIIChecklist(
  projectId: string
): Promise<ProjectQIIChecklist[]> {
  const { data, error } = await supabase
    .from('project_qii_checklist')
    .select('*')
    .eq('project_id', projectId);

  if (error) throw error;
  return data || [];
}

export async function upsertQIIChecklistItem(
  projectId: string,
  itemKey: string,
  isVerified: boolean,
  verifiedBy?: string
): Promise<ProjectQIIChecklist> {
  const { data, error } = await supabase
    .from('project_qii_checklist')
    .upsert(
      {
        project_id: projectId,
        checklist_item_key: itemKey,
        is_verified: isVerified,
        verified_at: isVerified ? new Date().toISOString() : null,
        verified_by: isVerified ? (verifiedBy || 'homeowner') : null,
      },
      { onConflict: 'project_id,checklist_item_key' }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
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
// V2 VIEWS — Read-Only Queries
// ============================================

/**
 * Get bid summaries for a project using v_bid_summary view.
 * Used by BidCard list views.
 */
export async function getBidSummaries(projectId: string): Promise<BidSummaryView[]> {
  const { data, error } = await supabase
    .from('v_bid_summary')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data || []) as BidSummaryView[];
}

// ============================================
// COMPOSITE QUERIES (V2)
// ============================================

/**
 * Get a single bid with all its children (contractor, scope, scores, equipment, questions).
 * This is the primary shape used by PhaseContext.
 */
export async function getBidWithChildren(bidId: string): Promise<BidWithChildren | null> {
  const bid = await getBid(bidId);
  if (!bid) return null;

  const [contractor, scope, scores, equipment, questions] = await Promise.all([
    getBidContractor(bidId),
    getBidScope(bidId),
    getBidScores(bidId),
    getEquipmentByBid(bidId),
    getQuestionsByBid(bidId),
  ]);

  return { bid, contractor, scope, scores, equipment, questions };
}

/**
 * Get all bids for a project with their children.
 * Used by PhaseContext to load all bid data.
 */
export async function getBidsWithChildren(projectId: string): Promise<BidWithChildren[]> {
  const bids = await getBidsByProject(projectId);

  return Promise.all(
    bids.map(async (bid) => {
      const [contractor, scope, scores, equipment, questions] = await Promise.all([
        getBidContractor(bid.id),
        getBidScope(bid.id),
        getBidScores(bid.id),
        getEquipmentByBid(bid.id),
        getQuestionsByBid(bid.id),
      ]);

      return { bid, contractor, scope, scores, equipment, questions };
    })
  );
}

/**
 * V2 project summary — uses normalized tables.
 */
export async function getProjectSummary(projectId: string): Promise<ProjectSummary | null> {
  const project = await getProject(projectId);
  if (!project) return null;

  const [bidsWithChildren, analysis, incentives] = await Promise.all([
    getBidsWithChildren(projectId),
    getLatestAnalysis(projectId),
    getProjectIncentives(projectId),
  ]);

  const bidsForTable: BidComparisonTableRow[] = bidsWithChildren.map((bwc) => ({
    bid: bwc.bid,
    contractor: bwc.contractor,
    scope: bwc.scope,
    equipment: bwc.equipment,
    scores: {
      overall: bwc.scores?.overall_score || 0,
      price: 0,
      quality: bwc.scores?.quality_score || 0,
      value: bwc.scores?.value_score || 0,
      completeness: bwc.scores?.completeness_score || 0,
    },
  }));

  const prices = bidsWithChildren
    .map((bwc) => bwc.bid.total_bid_amount)
    .filter((p) => p > 0);

  const stats = {
    totalBids: bidsWithChildren.length,
    averagePrice: prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0,
    lowestPrice: prices.length > 0 ? Math.min(...prices) : 0,
    highestPrice: prices.length > 0 ? Math.max(...prices) : 0,
    bestValueBidId: bidsWithChildren.reduce((best, bwc) =>
      (bwc.scores?.value_score || 0) > (best?.scores?.value_score || 0) ? bwc : best,
      bidsWithChildren[0]
    )?.bid.id || null,
    bestQualityBidId: bidsWithChildren.reduce((best, bwc) =>
      (bwc.scores?.quality_score || 0) > (best?.scores?.quality_score || 0) ? bwc : best,
      bidsWithChildren[0]
    )?.bid.id || null,
  };

  return {
    project,
    bids: bidsForTable,
    analysis,
    incentives,
    stats,
  };
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
// DEPRECATED V1 FUNCTIONS
// Kept for backward compat during Phase 2B migration.
// These will be removed once all components are retargeted.
// ============================================

/**
 * @deprecated V1 table no longer exists. Use getProjectIncentives instead.
 */
export async function getActiveRebates(): Promise<RebateProgram[]> {
  // V2 doesn't have a rebate_programs table — return empty
  console.warn('getActiveRebates() is deprecated. Use getProjectIncentives() instead.');
  return [];
}

/**
 * @deprecated V1 table no longer exists. Use getProjectIncentives instead.
 */
export async function getRebatesByState(_stateCode: string): Promise<RebateProgram[]> {
  console.warn('getRebatesByState() is deprecated. Use getProjectIncentives() instead.');
  return [];
}

/**
 * @deprecated V1 table no longer exists. Use getProjectIncentives instead.
 */
export async function getProjectRebates(_projectId: string): Promise<Array<{
  program: RebateProgram;
  projectRebate: ProjectRebate;
}>> {
  console.warn('getProjectRebates() is deprecated. Use getProjectIncentives() instead.');
  return [];
}

/**
 * @deprecated V1 table no longer exists. Use createProjectIncentive instead.
 */
export async function addProjectRebate(
  _projectId: string,
  _rebateProgramId: string,
  _estimatedAmount?: number
): Promise<ProjectRebate> {
  throw new Error('addProjectRebate() is deprecated. Use createProjectIncentive() instead.');
}

/**
 * @deprecated V1 bid_line_items table removed. Line items are now JSONB in bid_scope.line_items.
 */
export async function getLineItemsByBid(_bidId: string): Promise<never[]> {
  console.warn('getLineItemsByBid() is deprecated. Line items are now in bid_scope.line_items JSONB.');
  return [];
}
