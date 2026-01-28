import { supabase } from '../supabaseClient';
import * as db from '../database/bidsmartService';
import type { ConfidenceLevel, LineItemType, MindPalExtractionResponse } from '../types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

interface TriggerExtractionResult {
  success: boolean;
  pdfUploadId: string;
  runId?: string;
  error?: string;
}

export interface UserPriorities {
  price: number;
  efficiency: number;
  warranty: number;
  reputation: number;
  timeline: number;
}

export interface BatchAnalysisResult {
  success: boolean;
  projectId: string;
  requestId?: string;
  workflowRunId?: string;
  pdfCount?: number;
  error?: string;
}

export interface UploadedFile {
  id: string;
  file: File;
  status: 'uploading' | 'uploaded' | 'error';
  progress: number;
  error?: string;
}

interface ExtractionStatusResult {
  pdfUploadId: string;
  status: string;
  progress: number;
  confidence?: number;
  bidId?: string;
  error?: string;
  mindpalStatus?: string;
  processingStartedAt?: string;
  processingCompletedAt?: string;
  retryCount?: number;
}

interface PollOptions {
  intervalMs?: number;
  maxAttempts?: number;
  onStatusChange?: (status: ExtractionStatusResult) => void;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  return {
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
  };
}

export async function uploadAndExtract(
  projectId: string,
  file: File
): Promise<TriggerExtractionResult> {
  try {
    const { path } = await db.uploadPdfToStorage(projectId, file);

    const pdfUpload = await db.createPdfUpload(projectId, {
      file_name: file.name,
      file_path: path,
      file_size_bytes: file.size,
      status: 'uploaded',
    });

    const result = await triggerExtraction(projectId, pdfUpload.id);

    return {
      success: result.success,
      pdfUploadId: pdfUpload.id,
      runId: result.runId,
      error: result.error,
    };
  } catch (error) {
    console.error('Error in uploadAndExtract:', error);
    return {
      success: false,
      pdfUploadId: '',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function triggerExtraction(
  projectId: string,
  pdfUploadId: string
): Promise<TriggerExtractionResult> {
  try {
    const headers = await getAuthHeaders();

    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-to-mindpal`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ projectId, pdfUploadId }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        pdfUploadId,
        error: data.error || `Request failed: ${response.status}`,
      };
    }

    return {
      success: true,
      pdfUploadId,
      runId: data.runId,
    };
  } catch (error) {
    console.error('Error triggering extraction:', error);
    return {
      success: false,
      pdfUploadId,
      error: error instanceof Error ? error.message : 'Failed to trigger extraction',
    };
  }
}

export async function getExtractionStatus(
  pdfUploadId: string
): Promise<ExtractionStatusResult> {
  try {
    const headers = await getAuthHeaders();

    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/extraction-status?pdfUploadId=${encodeURIComponent(pdfUploadId)}`,
      {
        method: 'GET',
        headers,
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        pdfUploadId,
        status: 'error',
        progress: 0,
        error: data.error || `Request failed: ${response.status}`,
      };
    }

    return data;
  } catch (error) {
    console.error('Error getting extraction status:', error);
    return {
      pdfUploadId,
      status: 'error',
      progress: 0,
      error: error instanceof Error ? error.message : 'Failed to get status',
    };
  }
}

export async function pollExtractionStatus(
  pdfUploadId: string,
  options: PollOptions = {}
): Promise<ExtractionStatusResult> {
  const {
    intervalMs = 5000,
    maxAttempts = 60,
    onStatusChange,
  } = options;

  let attempts = 0;
  let lastStatus = '';

  return new Promise((resolve, reject) => {
    const poll = async () => {
      attempts++;

      try {
        const status = await getExtractionStatus(pdfUploadId);

        if (status.status !== lastStatus) {
          lastStatus = status.status;
          onStatusChange?.(status);
        }

        if (
          status.status === 'extracted' ||
          status.status === 'verified' ||
          status.status === 'review_needed'
        ) {
          resolve(status);
          return;
        }

        if (status.status === 'failed' || status.status === 'error') {
          resolve(status);
          return;
        }

        if (attempts >= maxAttempts) {
          resolve({
            ...status,
            status: 'timeout',
            error: 'Extraction timed out',
          });
          return;
        }

        setTimeout(poll, intervalMs);
      } catch (error) {
        if (attempts >= maxAttempts) {
          reject(error);
          return;
        }
        setTimeout(poll, intervalMs);
      }
    };

    poll();
  });
}

export async function retryExtraction(pdfUploadId: string): Promise<TriggerExtractionResult> {
  const pdfUpload = await db.getPdfUpload(pdfUploadId);
  if (!pdfUpload) {
    return { success: false, pdfUploadId, error: 'PDF upload not found' };
  }

  if (pdfUpload.retry_count >= 3) {
    return { success: false, pdfUploadId, error: 'Maximum retries exceeded' };
  }

  await db.incrementPdfRetryCount(pdfUploadId);

  return triggerExtraction(pdfUpload.project_id, pdfUploadId);
}

export async function processMindPalCallback(
  extraction: MindPalExtractionResponse
): Promise<{ success: boolean; bidId?: string; error?: string }> {
  const { request_id } = extraction;

  try {
    const pdfUpload = await db.getPdfUpload(request_id);
    if (!pdfUpload) {
      throw new Error(`PDF upload not found: ${request_id}`);
    }

    const storedExtraction = await db.createMindPalExtraction(
      pdfUpload.id,
      extraction as unknown as Record<string, unknown>
    );

    if (extraction.status === 'failed') {
      await db.updatePdfUploadStatus(pdfUpload.id, 'failed', {
        error_message: extraction.error?.message || 'Extraction failed',
      });
      await db.updateMindPalExtraction(storedExtraction.id, {
        parsed_successfully: false,
        parsing_errors: [extraction.error?.message || 'Extraction failed'],
      });
      return { success: false, error: extraction.error?.message };
    }

    const bid = await mapExtractionToBid(pdfUpload.project_id, extraction);

    const needsReview = extraction.overall_confidence < 70 || extraction.status === 'partial';
    await db.updatePdfUploadStatus(
      pdfUpload.id,
      needsReview ? 'review_needed' : 'extracted',
      {
        extracted_bid_id: bid.id,
        extraction_confidence: extraction.overall_confidence,
      }
    );

    await db.updateMindPalExtraction(storedExtraction.id, {
      parsed_successfully: true,
      mapped_bid_id: bid.id,
      overall_confidence: extraction.overall_confidence,
      field_confidences: extraction.field_confidences,
      processed_at: new Date().toISOString(),
    });

    await recalculateProjectScores(pdfUpload.project_id);

    return { success: true, bidId: bid.id };
  } catch (error) {
    console.error('Error processing MindPal callback:', error);

    try {
      await db.updatePdfUploadStatus(request_id, 'failed', {
        error_message: error instanceof Error ? error.message : 'Processing failed',
      });
    } catch (e) {
      console.error('Failed to update PDF status:', e);
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Processing failed',
    };
  }
}

async function mapExtractionToBid(
  projectId: string,
  extraction: MindPalExtractionResponse
): Promise<{ id: string }> {
  const confidenceLevel = mapConfidenceToLevel(extraction.overall_confidence);

  const bid = await db.createBid(projectId, {
    contractor_name: extraction.contractor_info?.company_name || 'Unknown Contractor',
    contractor_company: extraction.contractor_info?.company_name,
    contractor_phone: extraction.contractor_info?.phone,
    contractor_email: extraction.contractor_info?.email,
    contractor_license: extraction.contractor_info?.license_number,
    contractor_website: extraction.contractor_info?.website,
    total_bid_amount: extraction.pricing?.total_amount || 0,
    labor_cost: extraction.pricing?.labor_cost,
    equipment_cost: extraction.pricing?.equipment_cost,
    materials_cost: extraction.pricing?.materials_cost,
    permit_cost: extraction.pricing?.permit_cost,
    total_before_rebates: extraction.pricing?.price_before_rebates,
    estimated_rebates: extraction.pricing?.rebates_mentioned?.reduce(
      (sum, r) => sum + (r.amount || 0),
      0
    ),
    total_after_rebates: extraction.pricing?.price_after_rebates,
    estimated_days: extraction.timeline?.estimated_days,
    start_date_available: extraction.timeline?.start_date_available,
    labor_warranty_years: extraction.warranty?.labor_warranty_years,
    equipment_warranty_years: extraction.warranty?.equipment_warranty_years,
    additional_warranty_details: extraction.warranty?.warranty_details,
    deposit_required: extraction.payment_terms?.deposit_amount,
    deposit_percentage: extraction.payment_terms?.deposit_percentage,
    payment_schedule: extraction.payment_terms?.payment_schedule,
    financing_offered: extraction.payment_terms?.financing_offered || false,
    financing_terms: extraction.payment_terms?.financing_terms,
    scope_summary: extraction.scope_of_work?.summary,
    inclusions: extraction.scope_of_work?.inclusions,
    exclusions: extraction.scope_of_work?.exclusions,
    bid_date: extraction.dates?.bid_date || extraction.dates?.quote_date,
    valid_until: extraction.dates?.valid_until || extraction.timeline?.bid_valid_until,
    extraction_confidence: confidenceLevel,
    extraction_notes: extraction.extraction_notes
      ?.map((n) => `[${n.type}] ${n.message}`)
      .join('\n'),
  });

  if (extraction.line_items && extraction.line_items.length > 0) {
    const lineItems = extraction.line_items.map((item, index) => ({
      item_type: mapLineItemType(item.item_type),
      description: item.description,
      quantity: item.quantity || 1,
      unit_price: item.unit_price,
      total_price: item.total_price,
      brand: item.brand,
      model_number: item.model_number,
      confidence: mapConfidenceToLevel(item.confidence || extraction.overall_confidence),
      source_text: item.source_text,
      line_order: index,
    }));

    await db.bulkCreateLineItems(bid.id, lineItems);
  }

  if (extraction.equipment && extraction.equipment.length > 0) {
    const equipment = extraction.equipment.map((eq) => ({
      equipment_type: eq.equipment_type,
      brand: eq.brand,
      model_number: eq.model_number,
      model_name: eq.model_name,
      capacity_btu: eq.capacity_btu,
      capacity_tons: eq.capacity_tons,
      seer_rating: eq.seer_rating,
      seer2_rating: eq.seer2_rating,
      hspf_rating: eq.hspf_rating,
      hspf2_rating: eq.hspf2_rating,
      eer_rating: eq.eer_rating,
      variable_speed: eq.variable_speed,
      stages: eq.stages === 'single' ? 1 : eq.stages === 'two' ? 2 : eq.stages === 'variable' ? 99 : undefined,
      refrigerant_type: eq.refrigerant,
      sound_level_db: eq.sound_level_db,
      voltage: eq.voltage,
      energy_star_certified: eq.energy_star,
      energy_star_most_efficient: eq.energy_star_most_efficient,
      equipment_cost: eq.equipment_cost,
      confidence: mapConfidenceToLevel(eq.confidence || extraction.overall_confidence),
    }));

    await db.bulkCreateEquipment(bid.id, equipment);
  }

  return bid;
}

function mapConfidenceToLevel(confidence: number | undefined): ConfidenceLevel {
  if (confidence === undefined) return 'low';
  if (confidence >= 90) return 'high';
  if (confidence >= 70) return 'medium';
  return 'low';
}

function mapLineItemType(type: string | undefined): LineItemType {
  if (!type) return 'other';

  const typeMap: Record<string, LineItemType> = {
    equipment: 'equipment',
    labor: 'labor',
    materials: 'materials',
    permit: 'permit',
    disposal: 'disposal',
    electrical: 'electrical',
    ductwork: 'ductwork',
    thermostat: 'thermostat',
    rebate_processing: 'rebate_processing',
    warranty: 'warranty',
  };

  return typeMap[type.toLowerCase()] || 'other';
}

async function recalculateProjectScores(projectId: string): Promise<void> {
  const bids = await db.getBidsByProject(projectId);

  for (const bid of bids) {
    await supabase.rpc('calculate_bid_scores', { p_bid_id: bid.id });
  }
}

export async function uploadPdfFile(
  projectId: string,
  file: File
): Promise<{ pdfUploadId: string; error?: string }> {
  try {
    const { path } = await db.uploadPdfToStorage(projectId, file);

    const pdfUpload = await db.createPdfUpload(projectId, {
      file_name: file.name,
      file_path: path,
      file_size_bytes: file.size,
      status: 'uploaded',
    });

    return { pdfUploadId: pdfUpload.id };
  } catch (error) {
    console.error('Error uploading PDF:', error);
    return {
      pdfUploadId: '',
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

export async function startBatchAnalysis(
  projectId: string,
  pdfUploadIds: string[],
  userPriorities: UserPriorities,
  projectDetails?: string
): Promise<BatchAnalysisResult> {
  try {
    const headers = await getAuthHeaders();

    const prioritiesPayload = {
      upfront_cost: userPriorities.price,
      energy_efficiency: userPriorities.efficiency,
      warranty_length: userPriorities.warranty,
      contractor_reputation: userPriorities.reputation,
      installation_timeline: userPriorities.timeline,
      project_details: projectDetails || '',
    };

    const response = await fetch(`${SUPABASE_URL}/functions/v1/start-mindpal-analysis`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        projectId,
        pdfUploadIds,
        userPriorities: prioritiesPayload,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        projectId,
        error: data.error || `Request failed: ${response.status}`,
      };
    }

    return {
      success: true,
      projectId,
      requestId: data.requestId,
      workflowRunId: data.workflowRunId,
      pdfCount: data.pdfCount,
    };
  } catch (error) {
    console.error('Error starting batch analysis:', error);
    return {
      success: false,
      projectId,
      error: error instanceof Error ? error.message : 'Failed to start analysis',
    };
  }
}

export interface BatchExtractionStatus {
  projectId: string;
  totalPdfs: number;
  completedPdfs: number;
  failedPdfs: number;
  processingPdfs: number;
  isComplete: boolean;
  allSuccessful: boolean;
  pdfStatuses: Array<{
    id: string;
    fileName: string;
    status: string;
    bidId?: string;
    error?: string;
  }>;
}

export async function getBatchExtractionStatus(
  projectId: string
): Promise<BatchExtractionStatus> {
  const pdfUploads = await db.getPdfUploadsByProject(projectId);

  const pdfStatuses = pdfUploads.map(pdf => ({
    id: pdf.id,
    fileName: pdf.file_name,
    status: pdf.status,
    bidId: pdf.extracted_bid_id || undefined,
    error: pdf.error_message || undefined,
  }));

  const completedPdfs = pdfUploads.filter(
    p => p.status === 'extracted' || p.status === 'verified' || p.status === 'review_needed'
  ).length;
  const failedPdfs = pdfUploads.filter(p => p.status === 'failed').length;
  const processingPdfs = pdfUploads.filter(
    p => p.status === 'processing' || p.status === 'uploaded'
  ).length;

  const isComplete = processingPdfs === 0;
  const allSuccessful = isComplete && failedPdfs === 0 && completedPdfs > 0;

  return {
    projectId,
    totalPdfs: pdfUploads.length,
    completedPdfs,
    failedPdfs,
    processingPdfs,
    isComplete,
    allSuccessful,
    pdfStatuses,
  };
}

export async function pollBatchExtractionStatus(
  projectId: string,
  options: {
    intervalMs?: number;
    maxAttempts?: number;
    onProgress?: (status: BatchExtractionStatus) => void;
  } = {}
): Promise<BatchExtractionStatus> {
  const { intervalMs = 5000, maxAttempts = 120, onProgress } = options;

  let attempts = 0;

  return new Promise((resolve, reject) => {
    const poll = async () => {
      attempts++;

      try {
        const status = await getBatchExtractionStatus(projectId);
        onProgress?.(status);

        if (status.isComplete) {
          resolve(status);
          return;
        }

        if (attempts >= maxAttempts) {
          resolve({
            ...status,
            isComplete: true,
            allSuccessful: false,
          });
          return;
        }

        setTimeout(poll, intervalMs);
      } catch (error) {
        if (attempts >= maxAttempts) {
          reject(error);
          return;
        }
        setTimeout(poll, intervalMs);
      }
    };

    poll();
  });
}
