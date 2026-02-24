import * as db from '../database/bidsmartService';
import { getAuthHeaders as getParentAuthHeaders } from '../parentAuth';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

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

async function getAuthHeaders(userEmail: string): Promise<Record<string, string>> {
  // Get auth headers (uses signed token if available, falls back to email)
  const authHeaders = getParentAuthHeaders(userEmail);
  
  return {
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'apikey': SUPABASE_ANON_KEY,
    ...authHeaders,
  };
}

// ─── V1 LEGACY CODE REMOVED ────────────────────────────────────────────
// The following V1 functions were removed (callback now handled server-side
// by the mindpal-callback edge function):
//   - uploadAndExtract()
//   - triggerExtraction()
//   - getExtractionStatus()
//   - pollExtractionStatus()
//   - retryExtraction()
//   - processMindPalCallback()
//   - mapExtractionToBid()
//   - mapConfidenceToLevel()
//   - mapLineItemType()
//   - recalculateProjectScores()
// ────────────────────────────────────────────────────────────────────────

/**
 * V2: Upload a PDF and create both a pdf_uploads record AND a bids stub.
 * Returns pdfUploadId + bidId so the frontend can track both.
 */
export async function uploadPdfFile(
  projectId: string,
  file: File,
  requestId?: string
): Promise<{ pdfUploadId: string; bidId: string; storagePath: string; error?: string }> {
  try {
    const { path } = await db.uploadPdfToStorage(projectId, file);

    const pdfUpload = await db.createPdfUpload(projectId, {
      file_name: file.name,
      file_path: path,
      file_size_bytes: file.size,
      status: 'uploaded',
    });

    // V2: Create bid stub immediately, linked to this pdf_upload
    const effectiveRequestId = requestId || crypto.randomUUID();
    const bidStub = await db.createBidStub(
      projectId,
      pdfUpload.id,
      effectiveRequestId,
      path // storage_key = stable file path
    );

    // Link pdf_upload → bid
    await db.updatePdfUploadStatus(pdfUpload.id, 'uploaded', {
      extracted_bid_id: bidStub.id,
    } as Partial<import('../types').PdfUpload>);

    return {
      pdfUploadId: pdfUpload.id,
      bidId: bidStub.id,
      storagePath: path,
    };
  } catch (error) {
    console.error('Error uploading PDF:', error);
    return {
      pdfUploadId: '',
      bidId: '',
      storagePath: '',
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

export interface DocumentForAnalysis {
  bid_id: string;
  pdf_upload_id: string;
}

export async function startBatchAnalysis(
  projectId: string,
  pdfUploadIds: string[],
  userPriorities: UserPriorities,
  userEmail: string,
  projectDetails?: string,
  documents?: DocumentForAnalysis[]
): Promise<BatchAnalysisResult> {
  try {
    const headers = await getAuthHeaders(userEmail);

    const prioritiesPayload = {
      upfront_cost: userPriorities.price,
      energy_efficiency: userPriorities.efficiency,
      warranty_length: userPriorities.warranty,
      contractor_reputation: userPriorities.reputation,
      installation_timeline: userPriorities.timeline,
      project_details: projectDetails || '',
    };

    // V2: Send documents array with bid_ids if available
    const requestBody: Record<string, unknown> = {
      projectId,
      userPriorities: prioritiesPayload,
    };

    if (documents && documents.length > 0) {
      // V2 path: documents with pre-created bid_ids
      requestBody.documents = documents;
    } else {
      // V1 compat: flat pdfUploadIds
      requestBody.pdfUploadIds = pdfUploadIds;
    }

    const response = await fetch(`${SUPABASE_URL}/functions/v1/start-mindpal-analysis`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });

    let data;
    try {
      data = await response.json();
    } catch {
      const text = await response.text();
      console.error('Failed to parse response as JSON:', text);
      return {
        success: false,
        projectId,
        error: `Server error: ${response.status} - ${text.substring(0, 200)}`,
      };
    }

    console.log('📥 Edge Function Response:', {
      status: response.status,
      ok: response.ok,
      data
    });

    if (!response.ok) {
      console.error('Edge Function error:', data);
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
