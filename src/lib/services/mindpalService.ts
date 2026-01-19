/**
 * MindPal Integration Service
 * 
 * Handles communication with MindPal for PDF extraction
 * and processing of extraction results.
 */

import { supabase } from '../supabaseClient';
import * as db from '../database/bidsmartService';
import type {
  MindPalExtractionRequest,
  MindPalExtractionResponse,
  ContractorBid,
  BidLineItem,
  BidEquipment,
  PdfUpload,
  Project,
  ConfidenceLevel,
  LineItemType,
} from '../types';

// Configuration
const MINDPAL_WEBHOOK_URL = import.meta.env.VITE_MINDPAL_WEBHOOK_URL;
const MINDPAL_API_KEY = import.meta.env.VITE_MINDPAL_API_KEY;
const CALLBACK_BASE_URL = import.meta.env.VITE_CALLBACK_BASE_URL || window.location.origin;

interface TriggerExtractionResult {
  success: boolean;
  pdfUploadId: string;
  error?: string;
}

/**
 * Upload a PDF and trigger MindPal extraction
 */
export async function uploadAndExtract(
  projectId: string,
  file: File
): Promise<TriggerExtractionResult> {
  try {
    // 1. Upload file to storage
    const { path, url } = await db.uploadPdfToStorage(projectId, file);

    // 2. Create PDF upload record
    const pdfUpload = await db.createPdfUpload(projectId, {
      file_name: file.name,
      file_path: path,
      file_size_bytes: file.size,
      status: 'uploaded',
    });

    // 3. Get project context
    const project = await db.getProject(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    // 4. Build extraction request
    const request = buildExtractionRequest(pdfUpload.id, url, project);

    // 5. Trigger MindPal extraction
    await triggerMindPalExtraction(request);

    // 6. Update status
    await db.updatePdfUploadStatus(pdfUpload.id, 'processing', {
      mindpal_status: 'triggered',
    });

    return {
      success: true,
      pdfUploadId: pdfUpload.id,
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

/**
 * Build the extraction request for MindPal
 */
function buildExtractionRequest(
  pdfUploadId: string,
  pdfUrl: string,
  project: Project
): MindPalExtractionRequest {
  // Get user's property info from project's user
  // In a real app, you'd also fetch the user record
  
  return {
    request_id: pdfUploadId,
    pdf_url: pdfUrl,
    callback_url: `${CALLBACK_BASE_URL}/api/mindpal/callback`,
    project_context: {
      project_id: project.id,
      heat_pump_type: project.heat_pump_type,
      system_size_tons: project.system_size_tons ?? undefined,
      property_state: undefined, // Would come from user record
      property_zip: undefined, // Would come from user record
      square_footage: undefined, // Would come from user record
      preferred_brands: project.preferred_brands ?? undefined,
    },
    extraction_options: {
      extract_line_items: true,
      extract_equipment_specs: true,
      include_raw_text: false,
    },
  };
}

/**
 * Send extraction request to MindPal webhook
 */
async function triggerMindPalExtraction(
  request: MindPalExtractionRequest
): Promise<void> {
  if (!MINDPAL_WEBHOOK_URL) {
    console.warn('MindPal webhook URL not configured, skipping trigger');
    return;
  }

  const response = await fetch(MINDPAL_WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-BidSmart-API-Key': MINDPAL_API_KEY || '',
      'X-BidSmart-Timestamp': new Date().toISOString(),
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`MindPal trigger failed: ${response.status} ${response.statusText}`);
  }
}

/**
 * Process callback from MindPal with extraction results
 */
export async function processMindPalCallback(
  extraction: MindPalExtractionResponse
): Promise<{ success: boolean; bidId?: string; error?: string }> {
  const { request_id } = extraction;

  try {
    // 1. Get the PDF upload record
    const pdfUpload = await db.getPdfUpload(request_id);
    if (!pdfUpload) {
      throw new Error(`PDF upload not found: ${request_id}`);
    }

    // 2. Store the raw extraction
    const storedExtraction = await db.createMindPalExtraction(
      pdfUpload.id,
      extraction as unknown as Record<string, unknown>
    );

    // 3. Check extraction status
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

    // 4. Map extraction to bid
    const bid = await mapExtractionToBid(pdfUpload.project_id, extraction);

    // 5. Update PDF upload with result
    const needsReview = extraction.overall_confidence < 70 || extraction.status === 'partial';
    await db.updatePdfUploadStatus(
      pdfUpload.id,
      needsReview ? 'review_needed' : 'extracted',
      {
        extracted_bid_id: bid.id,
        extraction_confidence: extraction.overall_confidence,
      }
    );

    // 6. Update extraction record
    await db.updateMindPalExtraction(storedExtraction.id, {
      parsed_successfully: true,
      mapped_bid_id: bid.id,
      overall_confidence: extraction.overall_confidence,
      field_confidences: extraction.field_confidences,
      processed_at: new Date().toISOString(),
    });

    // 7. Recalculate project scores
    await recalculateProjectScores(pdfUpload.project_id);

    return { success: true, bidId: bid.id };
  } catch (error) {
    console.error('Error processing MindPal callback:', error);
    
    // Update status to failed
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

/**
 * Map MindPal extraction response to our database models
 */
async function mapExtractionToBid(
  projectId: string,
  extraction: MindPalExtractionResponse
): Promise<ContractorBid> {
  // Determine confidence level
  const confidenceLevel = mapConfidenceToLevel(extraction.overall_confidence);

  // Create the bid
  const bid = await db.createBid(projectId, {
    // Contractor info
    contractor_name: extraction.contractor_info?.company_name || 'Unknown Contractor',
    contractor_company: extraction.contractor_info?.company_name,
    contractor_phone: extraction.contractor_info?.phone,
    contractor_email: extraction.contractor_info?.email,
    contractor_license: extraction.contractor_info?.license_number,
    contractor_website: extraction.contractor_info?.website,

    // Pricing
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

    // Timeline
    estimated_days: extraction.timeline?.estimated_days,
    start_date_available: extraction.timeline?.start_date_available,

    // Warranty
    labor_warranty_years: extraction.warranty?.labor_warranty_years,
    equipment_warranty_years: extraction.warranty?.equipment_warranty_years,
    additional_warranty_details: extraction.warranty?.warranty_details,

    // Payment
    deposit_required: extraction.payment_terms?.deposit_amount,
    deposit_percentage: extraction.payment_terms?.deposit_percentage,
    payment_schedule: extraction.payment_terms?.payment_schedule,
    financing_offered: extraction.payment_terms?.financing_offered || false,
    financing_terms: extraction.payment_terms?.financing_terms,

    // Scope
    scope_summary: extraction.scope_of_work?.summary,
    inclusions: extraction.scope_of_work?.inclusions,
    exclusions: extraction.scope_of_work?.exclusions,

    // Dates
    bid_date: extraction.dates?.bid_date || extraction.dates?.quote_date,
    valid_until: extraction.dates?.valid_until || extraction.timeline?.bid_valid_until,

    // Extraction metadata
    extraction_confidence: confidenceLevel,
    extraction_notes: extraction.extraction_notes
      ?.map((n) => `[${n.type}] ${n.message}`)
      .join('\n'),
  });

  // Create line items
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

  // Create equipment records
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

/**
 * Map numeric confidence to our enum
 */
function mapConfidenceToLevel(confidence: number | undefined): ConfidenceLevel {
  if (confidence === undefined) return 'low';
  if (confidence >= 90) return 'high';
  if (confidence >= 70) return 'medium';
  return 'low';
}

/**
 * Map extracted line item type to our enum
 */
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

/**
 * Recalculate scores for all bids in a project
 * This triggers the database function
 */
async function recalculateProjectScores(projectId: string): Promise<void> {
  const bids = await db.getBidsByProject(projectId);
  
  for (const bid of bids) {
    // The database trigger handles this, but we can manually call the function
    await supabase.rpc('calculate_bid_scores', { p_bid_id: bid.id });
  }
}

/**
 * Retry a failed extraction
 */
export async function retryExtraction(pdfUploadId: string): Promise<TriggerExtractionResult> {
  const pdfUpload = await db.getPdfUpload(pdfUploadId);
  if (!pdfUpload) {
    return { success: false, pdfUploadId, error: 'PDF upload not found' };
  }

  // Check retry count
  if (pdfUpload.retry_count >= 3) {
    return { success: false, pdfUploadId, error: 'Maximum retries exceeded' };
  }

  // Increment retry count
  await db.incrementPdfRetryCount(pdfUploadId);

  // Get signed URL
  const url = await db.getPdfSignedUrl(pdfUpload.file_path);

  // Get project
  const project = await db.getProject(pdfUpload.project_id);
  if (!project) {
    return { success: false, pdfUploadId, error: 'Project not found' };
  }

  // Build and send request
  const request = buildExtractionRequest(pdfUploadId, url, project);
  
  try {
    await triggerMindPalExtraction(request);
    await db.updatePdfUploadStatus(pdfUploadId, 'processing', {
      mindpal_status: 'retry_triggered',
      error_message: null,
    });
    return { success: true, pdfUploadId };
  } catch (error) {
    return {
      success: false,
      pdfUploadId,
      error: error instanceof Error ? error.message : 'Retry failed',
    };
  }
}

/**
 * Get extraction status for a PDF upload
 */
export async function getExtractionStatus(pdfUploadId: string): Promise<{
  status: string;
  confidence?: number;
  bidId?: string;
  error?: string;
}> {
  const pdfUpload = await db.getPdfUpload(pdfUploadId);
  if (!pdfUpload) {
    return { status: 'not_found' };
  }

  return {
    status: pdfUpload.status,
    confidence: pdfUpload.extraction_confidence ?? undefined,
    bidId: pdfUpload.extracted_bid_id ?? undefined,
    error: pdfUpload.error_message ?? undefined,
  };
}
