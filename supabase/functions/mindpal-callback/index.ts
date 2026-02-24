import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { verifyHmacSignature, createCallbackPayload } from "../_shared/hmac.ts";
import {
  type MindPalCallbackPayloadV2,
  type MindPalBidResult,
  type MindPalFaqItem,
  type MindPalQuestionItem,
  mapConfidenceToLevel,
  mapLineItemType,
} from "../_shared/types.ts";

interface ExtendedCallbackPayload extends MindPalCallbackPayloadV2 {
  faqs?: MindPalFaqItem[];
  questions?: MindPalQuestionItem[];
}

const MINDPAL_CALLBACK_SECRET = Deno.env.get("MINDPAL_CALLBACK_SECRET");

/**
 * Process a single bid result from the MindPal callback.
 * - UPDATE bids: status → 'completed', contractor_name, processing_attempts
 * - UPSERT bid_scope: ALL extracted pricing/scope/warranty/timeline data
 * - UPSERT bid_contractors: contractor info
 * - INSERT bid_equipment: equipment records
 * - INSERT bid_scores: score records
 */
async function processBidResult(
  bidResult: MindPalBidResult,
  projectId: string
): Promise<{ bidId: string; success: boolean; error?: string }> {
  const { bid_id } = bidResult;

  try {
    // Verify the bid exists and belongs to this project
    const { data: existingBid, error: bidLookupError } = await supabaseAdmin
      .from("bids")
      .select("id, project_id, processing_attempts")
      .eq("id", bid_id)
      .maybeSingle();

    if (bidLookupError || !existingBid) {
      throw new Error(`Bid ${bid_id} not found`);
    }

    if (existingBid.project_id !== projectId) {
      throw new Error(`Bid ${bid_id} does not belong to project ${projectId}`);
    }

    const confidenceLevel = mapConfidenceToLevel(bidResult.overall_confidence);
    const contractorName = bidResult.contractor_info?.company_name || "Unknown Contractor";

    // 1. UPDATE bids stub: status → completed, contractor_name
    const { error: bidUpdateError } = await supabaseAdmin
      .from("bids")
      .update({
        status: "completed",
        contractor_name: contractorName,
        processing_attempts: (existingBid.processing_attempts || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bid_id);

    if (bidUpdateError) {
      throw new Error(`Failed to update bid ${bid_id}: ${bidUpdateError.message}`);
    }

    // 2. UPSERT bid_scope: ALL extracted data
    const scopeData: Record<string, unknown> = {
      bid_id,
      // System type
      system_type: bidResult.scope_of_work ? "heat_pump" : null,

      // Pricing
      total_bid_amount: bidResult.pricing?.total_amount,
      labor_cost: bidResult.pricing?.labor_cost,
      equipment_cost: bidResult.pricing?.equipment_cost,
      materials_cost: bidResult.pricing?.materials_cost,
      permit_cost: bidResult.pricing?.permit_cost,
      disposal_cost: bidResult.pricing?.disposal_cost,
      electrical_cost: bidResult.pricing?.electrical_cost,
      total_before_rebates: bidResult.pricing?.price_before_rebates,
      estimated_rebates: bidResult.pricing?.rebates_mentioned?.reduce(
        (sum, r) => sum + (r.amount || 0),
        0
      ),
      total_after_rebates: bidResult.pricing?.price_after_rebates,

      // Payment terms
      deposit_required: bidResult.payment_terms?.deposit_amount,
      deposit_percentage: bidResult.payment_terms?.deposit_percentage,
      payment_schedule: bidResult.payment_terms?.payment_schedule,
      financing_offered: bidResult.payment_terms?.financing_offered || false,
      financing_terms: bidResult.payment_terms?.financing_terms,

      // Warranty
      labor_warranty_years: bidResult.warranty?.labor_warranty_years,
      equipment_warranty_years: bidResult.warranty?.equipment_warranty_years,
      compressor_warranty_years: bidResult.warranty?.compressor_warranty_years,
      additional_warranty_details: bidResult.warranty?.warranty_details,

      // Timeline
      estimated_days: bidResult.timeline?.estimated_days,
      start_date_available: bidResult.timeline?.start_date_available,
      bid_date: bidResult.dates?.bid_date || bidResult.dates?.quote_date,
      valid_until: bidResult.dates?.valid_until || bidResult.timeline?.bid_valid_until,

      // Extraction metadata
      extraction_confidence: confidenceLevel,
      extraction_notes: bidResult.extraction_notes
        ?.map((n) => `[${n.type}] ${n.message}`)
        .join("\n"),

      // Scope summary
      summary: bidResult.scope_of_work?.summary,
      inclusions: bidResult.scope_of_work?.inclusions,
      exclusions: bidResult.scope_of_work?.exclusions,

      // Scope booleans
      permit_included: bidResult.scope_of_work?.permit_included,
      disposal_included: bidResult.scope_of_work?.disposal_included,
      electrical_included: bidResult.scope_of_work?.electrical_work_included,
      ductwork_included: bidResult.scope_of_work?.ductwork_included,
      thermostat_included: bidResult.scope_of_work?.thermostat_included,
      manual_j_included: bidResult.scope_of_work?.manual_j_included,
      commissioning_included: bidResult.scope_of_work?.commissioning_included,
      air_handler_included: bidResult.scope_of_work?.air_handler_included,
      line_set_included: bidResult.scope_of_work?.line_set_included,
      disconnect_included: bidResult.scope_of_work?.disconnect_included,
      pad_included: bidResult.scope_of_work?.pad_included,
      drain_line_included: bidResult.scope_of_work?.drain_line_included,

      updated_at: new Date().toISOString(),
    };

    const { error: scopeError } = await supabaseAdmin
      .from("bid_scope")
      .upsert(scopeData, { onConflict: "bid_id" });

    if (scopeError) {
      console.error(`Failed to upsert bid_scope for ${bid_id}:`, scopeError);
    }

    // 3. UPSERT bid_contractors
    if (bidResult.contractor_info) {
      const contractorData: Record<string, unknown> = {
        bid_id,
        name: bidResult.contractor_info.company_name,
        company: bidResult.contractor_info.company_name,
        contact_name: bidResult.contractor_info.contact_name,
        phone: bidResult.contractor_info.phone,
        email: bidResult.contractor_info.email,
        website: bidResult.contractor_info.website,
        license: bidResult.contractor_info.license_number,
        license_state: bidResult.contractor_info.license_state,
        updated_at: new Date().toISOString(),
      };

      const { error: contractorError } = await supabaseAdmin
        .from("bid_contractors")
        .upsert(contractorData, { onConflict: "bid_id" });

      if (contractorError) {
        console.error(`Failed to upsert bid_contractors for ${bid_id}:`, contractorError);
      }
    }

    // 4. INSERT bid_equipment (delete existing first for idempotency)
    if (bidResult.equipment && bidResult.equipment.length > 0) {
      // Remove existing equipment for this bid (idempotent re-runs)
      await supabaseAdmin
        .from("bid_equipment")
        .delete()
        .eq("bid_id", bid_id);

      const equipment = bidResult.equipment.map((eq) => ({
        bid_id,
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
        stages: eq.stages === "single" ? 1 : eq.stages === "two" ? 2 : eq.stages === "variable" ? 99 : null,
        refrigerant_type: eq.refrigerant,
        sound_level_db: eq.sound_level_db,
        voltage: eq.voltage,
        energy_star_certified: eq.energy_star,
        energy_star_most_efficient: eq.energy_star_most_efficient,
        equipment_cost: eq.equipment_cost,
        confidence: mapConfidenceToLevel(eq.confidence || bidResult.overall_confidence),
      }));

      const { error: equipmentError } = await supabaseAdmin
        .from("bid_equipment")
        .insert(equipment);

      if (equipmentError) {
        console.error(`Failed to create equipment for ${bid_id}:`, equipmentError);
      }
    }

    return { bidId: bid_id, success: true };
  } catch (error) {
    // On failure: update bid status to 'failed' with error details
    const errorMessage = error instanceof Error ? error.message : String(error);

    try {
      const { data: currentBid } = await supabaseAdmin
        .from("bids")
        .select("processing_attempts")
        .eq("id", bid_id)
        .maybeSingle();

      await supabaseAdmin
        .from("bids")
        .update({
          status: "failed",
          last_error: errorMessage,
          processing_attempts: ((currentBid?.processing_attempts as number) || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", bid_id);
    } catch (updateError) {
      console.error(`Failed to mark bid ${bid_id} as failed:`, updateError);
    }

    return { bidId: bid_id, success: false, error: errorMessage };
  }
}

Deno.serve(async (req: Request) => {
  try {
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    if (req.method !== "POST") {
      return errorResponse("Method not allowed", 405);
    }

    if (!MINDPAL_CALLBACK_SECRET) {
      console.error("MINDPAL_CALLBACK_SECRET not configured");
      return errorResponse("Server configuration error", 500);
    }

    const payload: ExtendedCallbackPayload = await req.json();
    const { request_id, project_id, signature, timestamp } = payload;

    if (!request_id || !signature || !timestamp) {
      return errorResponse("Missing required fields: request_id, signature, or timestamp");
    }

    // HMAC verification
    const expectedPayload = createCallbackPayload(request_id, timestamp);
    const isValid = await verifyHmacSignature(expectedPayload, signature, MINDPAL_CALLBACK_SECRET);

    if (!isValid) {
      console.error("Invalid HMAC signature for request:", request_id);
      return errorResponse("Invalid signature", 401);
    }

    // Timestamp freshness check
    const timestampDate = new Date(timestamp);
    const now = new Date();
    const ageMs = now.getTime() - timestampDate.getTime();
    const maxAgeMs = 60 * 60 * 1000; // 1 hour

    if (ageMs > maxAgeMs) {
      console.error("Expired timestamp for request:", request_id);
      return errorResponse("Expired request", 401);
    }

    // Store raw extraction for debugging
    const { data: extraction, error: extractionError } = await supabaseAdmin
      .from("mindpal_extractions")
      .insert({
        pdf_upload_id: request_id, // Use request_id as reference
        raw_json: payload,
        parsed_successfully: false,
        extracted_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (extractionError) {
      console.error("Failed to store extraction:", extractionError);
    }

    // Handle top-level failure
    if (payload.status === "failed") {
      console.error("MindPal extraction failed:", payload.error);

      // Mark all bids in this batch as failed
      if (payload.bids && payload.bids.length > 0) {
        for (const bidResult of payload.bids) {
          await supabaseAdmin
            .from("bids")
            .update({
              status: "failed",
              last_error: payload.error?.message || "Extraction failed",
              updated_at: new Date().toISOString(),
            })
            .eq("id", bidResult.bid_id);
        }
      }

      return jsonResponse({ success: true, status: "failed" });
    }

    // Resolve projectId — use from payload or look up from first bid
    let resolvedProjectId = project_id;
    if (!resolvedProjectId && payload.bids?.length > 0) {
      const { data: firstBid } = await supabaseAdmin
        .from("bids")
        .select("project_id")
        .eq("id", payload.bids[0].bid_id)
        .maybeSingle();
      resolvedProjectId = firstBid?.project_id;
    }

    if (!resolvedProjectId) {
      return errorResponse("Could not resolve project_id", 400);
    }

    // Process each bid result
    const results: Array<{ bidId: string; success: boolean; error?: string }> = [];

    if (payload.bids && payload.bids.length > 0) {
      for (const bidResult of payload.bids) {
        const result = await processBidResult(bidResult, resolvedProjectId);
        results.push(result);
        console.log(`Bid ${bidResult.bid_id}: ${result.success ? "✅" : "❌"} ${result.error || ""}`);
      }
    }

    // Process batch-level FAQs (if any)
    if (payload.faqs && payload.faqs.length > 0) {
      const faqRecords = payload.faqs.map((faq) => ({
        bid_id: faq.bid_id,
        faq_key: faq.faq_key,
        question_text: faq.question_text,
        answer_text: faq.answer_text,
        answer_confidence: faq.answer_confidence,
        is_answered: faq.is_answered,
        display_order: faq.display_order,
      }));

      const { error: faqsError } = await supabaseAdmin
        .from("bid_faqs")
        .insert(faqRecords);

      if (faqsError) {
        console.error("Failed to create FAQs:", faqsError);
      }
    }

    // Process batch-level questions (if any)
    if (payload.questions && payload.questions.length > 0) {
      const questionRecords = payload.questions.map((q) => ({
        bid_id: q.bid_id,
        question_text: q.question_text,
        question_category: q.question_category,
        priority: q.priority,
        is_answered: false,
        auto_generated: true,
        missing_field: q.missing_field,
        display_order: q.display_order,
      }));

      const { error: questionsError } = await supabaseAdmin
        .from("contractor_questions")
        .insert(questionRecords);

      if (questionsError) {
        console.error("Failed to create questions:", questionsError);
      }
    }

    // Update mindpal_extractions as successful
    if (extraction) {
      const successCount = results.filter((r) => r.success).length;
      await supabaseAdmin
        .from("mindpal_extractions")
        .update({
          parsed_successfully: successCount > 0,
          overall_confidence: payload.bids?.[0]?.overall_confidence,
          processed_at: new Date().toISOString(),
        })
        .eq("id", extraction.id);
    }

    // Update pdf_uploads status for completed bids
    for (const result of results) {
      if (result.success) {
        // Find and update the pdf_upload linked to this bid
        const { data: bid } = await supabaseAdmin
          .from("bids")
          .select("pdf_upload_id")
          .eq("id", result.bidId)
          .maybeSingle();

        if (bid?.pdf_upload_id) {
          const bidResult = payload.bids?.find((b) => b.bid_id === result.bidId);
          const needsReview = (bidResult?.overall_confidence || 0) < 70;

          await supabaseAdmin
            .from("pdf_uploads")
            .update({
              status: needsReview ? "review_needed" : "extracted",
              extracted_bid_id: result.bidId,
              extraction_confidence: bidResult?.overall_confidence,
              mindpal_status: "completed",
              error_message: null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", bid.pdf_upload_id);
        }
      }
    }

    // Check if all project PDFs are done → update project status
    const successfulBids = results.filter((r) => r.success).length;

    const { data: allProjectPdfs } = await supabaseAdmin
      .from("pdf_uploads")
      .select("id, status")
      .eq("project_id", resolvedProjectId);

    const allComplete = allProjectPdfs?.every(
      (pdf) => pdf.status === "extracted" || pdf.status === "verified" || pdf.status === "review_needed" || pdf.status === "failed"
    );

    const successfulCount = allProjectPdfs?.filter(
      (pdf) => pdf.status === "extracted" || pdf.status === "verified" || pdf.status === "review_needed"
    ).length ?? 0;

    if (allComplete && successfulCount >= 2) {
      await supabaseAdmin
        .from("projects")
        .update({
          status: "comparing",
          updated_at: new Date().toISOString(),
        })
        .eq("id", resolvedProjectId);

      // Trigger completion notification
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

      if (supabaseUrl && supabaseServiceKey) {
        try {
          const notificationResponse = await fetch(
            `${supabaseUrl}/functions/v1/send-completion-notification`,
            {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${supabaseServiceKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ project_id: resolvedProjectId }),
            }
          );

          if (!notificationResponse.ok) {
            console.error("Failed to trigger notification:", await notificationResponse.text());
          }
        } catch (notifyError) {
          console.error("Error triggering notification:", notifyError);
        }
      }
    }

    return jsonResponse({
      success: true,
      status: "processed",
      bidsProcessed: results.length,
      bidsSuccessful: successfulBids,
      bidsFailed: results.length - successfulBids,
      results,
      projectComplete: allComplete && successfulCount >= 2,
    });

  } catch (error) {
    console.error("Error in mindpal-callback:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Internal server error",
      500
    );
  }
});
