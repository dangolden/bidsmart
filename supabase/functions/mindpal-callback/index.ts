import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { verifyHmacSignature, createCallbackPayload } from "../_shared/hmac.ts";
import {
  type MindPalCallbackPayload,
  type MindPalFaqItem,
  type MindPalQuestionItem,
  mapConfidenceToLevel,
  mapLineItemType,
} from "../_shared/types.ts";

interface ExtendedCallbackPayload extends MindPalCallbackPayload {
  faqs?: MindPalFaqItem[];
  questions?: MindPalQuestionItem[];
}

const MINDPAL_CALLBACK_SECRET = Deno.env.get("MINDPAL_CALLBACK_SECRET");

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
    const { request_id: pdfUploadId, signature, timestamp } = payload;

    if (!pdfUploadId || !signature || !timestamp) {
      return errorResponse("Missing required fields: request_id, signature, or timestamp");
    }

    const expectedPayload = createCallbackPayload(pdfUploadId, timestamp);
    const isValid = await verifyHmacSignature(expectedPayload, signature, MINDPAL_CALLBACK_SECRET);

    if (!isValid) {
      console.error("Invalid HMAC signature for request:", pdfUploadId);
      return errorResponse("Invalid signature", 401);
    }

    const timestampDate = new Date(timestamp);
    const now = new Date();
    const ageMs = now.getTime() - timestampDate.getTime();
    const maxAgeMs = 60 * 60 * 1000;

    if (ageMs > maxAgeMs) {
      console.error("Expired timestamp for request:", pdfUploadId);
      return errorResponse("Expired request", 401);
    }

    const { data: pdfUpload, error: pdfError } = await supabaseAdmin
      .from("pdf_uploads")
      .select("*, projects!inner(id)")
      .eq("id", pdfUploadId)
      .maybeSingle();

    if (pdfError || !pdfUpload) {
      console.error("PDF upload not found:", pdfUploadId);
      return errorResponse("PDF upload not found", 404);
    }

    const projectId = pdfUpload.project_id;

    const { data: extraction, error: extractionError } = await supabaseAdmin
      .from("mindpal_extractions")
      .insert({
        pdf_upload_id: pdfUploadId,
        raw_json: payload,
        parsed_successfully: false,
        extracted_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (extractionError) {
      console.error("Failed to store extraction:", extractionError);
    }

    if (payload.status === "failed") {
      await supabaseAdmin
        .from("pdf_uploads")
        .update({
          status: "failed",
          error_message: payload.error?.message || "Extraction failed",
          mindpal_status: "failed",
          processing_completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", pdfUploadId);

      if (extraction) {
        await supabaseAdmin
          .from("mindpal_extractions")
          .update({
            parsed_successfully: false,
            parsing_errors: [payload.error?.message || "Extraction failed"],
          })
          .eq("id", extraction.id);
      }

      return jsonResponse({ success: true, status: "failed" });
    }

    const confidenceLevel = mapConfidenceToLevel(payload.overall_confidence);

    const bidData: Record<string, unknown> = {
      project_id: projectId,
      contractor_name: payload.contractor_info?.company_name || "Unknown Contractor",
      contractor_company: payload.contractor_info?.company_name,
      contractor_phone: payload.contractor_info?.phone,
      contractor_email: payload.contractor_info?.email,
      contractor_license: payload.contractor_info?.license_number,
      contractor_license_state: payload.contractor_info?.license_state,
      contractor_website: payload.contractor_info?.website,
      total_bid_amount: payload.pricing?.total_amount || 0,
      labor_cost: payload.pricing?.labor_cost,
      equipment_cost: payload.pricing?.equipment_cost,
      materials_cost: payload.pricing?.materials_cost,
      permit_cost: payload.pricing?.permit_cost,
      total_before_rebates: payload.pricing?.price_before_rebates,
      estimated_rebates: payload.pricing?.rebates_mentioned?.reduce(
        (sum, r) => sum + (r.amount || 0),
        0
      ),
      total_after_rebates: payload.pricing?.price_after_rebates,
      estimated_days: payload.timeline?.estimated_days,
      start_date_available: payload.timeline?.start_date_available,
      labor_warranty_years: payload.warranty?.labor_warranty_years,
      equipment_warranty_years: payload.warranty?.equipment_warranty_years,
      additional_warranty_details: payload.warranty?.warranty_details,
      deposit_required: payload.payment_terms?.deposit_amount,
      deposit_percentage: payload.payment_terms?.deposit_percentage,
      payment_schedule: payload.payment_terms?.payment_schedule,
      financing_offered: payload.payment_terms?.financing_offered || false,
      financing_terms: payload.payment_terms?.financing_terms,
      scope_summary: payload.scope_of_work?.summary,
      inclusions: payload.scope_of_work?.inclusions,
      exclusions: payload.scope_of_work?.exclusions,
      scope_permit_included: payload.scope_of_work?.permit_included,
      scope_disposal_included: payload.scope_of_work?.disposal_included,
      scope_electrical_included: payload.scope_of_work?.electrical_work_included,
      scope_ductwork_included: payload.scope_of_work?.ductwork_included,
      scope_thermostat_included: payload.scope_of_work?.thermostat_included,
      scope_manual_j_included: payload.scope_of_work?.manual_j_included,
      scope_commissioning_included: payload.scope_of_work?.commissioning_included,
      scope_air_handler_included: payload.scope_of_work?.air_handler_included,
      scope_line_set_included: payload.scope_of_work?.line_set_included,
      scope_disconnect_included: payload.scope_of_work?.disconnect_included,
      scope_pad_included: payload.scope_of_work?.pad_included,
      scope_drain_line_included: payload.scope_of_work?.drain_line_included,
      bid_date: payload.dates?.bid_date || payload.dates?.quote_date,
      valid_until: payload.dates?.valid_until || payload.timeline?.bid_valid_until,
      pdf_upload_id: pdfUploadId,
      extraction_confidence: confidenceLevel,
      extraction_notes: payload.extraction_notes
        ?.map((n) => `[${n.type}] ${n.message}`)
        .join("\n"),
      verified_by_user: false,
      is_favorite: false,
    };

    const { data: bid, error: bidError } = await supabaseAdmin
      .from("contractor_bids")
      .insert(bidData)
      .select()
      .single();

    if (bidError) {
      console.error("Failed to create bid:", bidError);
      await supabaseAdmin
        .from("pdf_uploads")
        .update({
          status: "failed",
          error_message: `Failed to create bid: ${bidError.message}`,
          processing_completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", pdfUploadId);

      return errorResponse("Failed to create bid record", 500);
    }

    if (payload.line_items && payload.line_items.length > 0) {
      const lineItems = payload.line_items.map((item, index) => ({
        bid_id: bid.id,
        item_type: mapLineItemType(item.item_type),
        description: item.description,
        quantity: item.quantity || 1,
        unit_price: item.unit_price,
        total_price: item.total_price,
        brand: item.brand,
        model_number: item.model_number,
        confidence: mapConfidenceToLevel(item.confidence || payload.overall_confidence),
        source_text: item.source_text,
        line_order: index,
      }));

      const { error: lineItemsError } = await supabaseAdmin
        .from("bid_line_items")
        .insert(lineItems);

      if (lineItemsError) {
        console.error("Failed to create line items:", lineItemsError);
      }
    }

    if (payload.equipment && payload.equipment.length > 0) {
      const equipment = payload.equipment.map((eq) => ({
        bid_id: bid.id,
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
        confidence: mapConfidenceToLevel(eq.confidence || payload.overall_confidence),
      }));

      const { error: equipmentError } = await supabaseAdmin
        .from("bid_equipment")
        .insert(equipment);

      if (equipmentError) {
        console.error("Failed to create equipment:", equipmentError);
      }
    }

    if (payload.faqs && payload.faqs.length > 0) {
      const faqRecords = payload.faqs.map((faq) => ({
        bid_id: bid.id,
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

    if (payload.questions && payload.questions.length > 0) {
      const questionRecords = payload.questions.map((q) => ({
        bid_id: bid.id,
        question_text: q.question_text,
        question_category: q.question_category,
        priority: q.priority,
        is_answered: false,
        auto_generated: true,
        missing_field: q.missing_field,
        display_order: q.display_order,
      }));

      const { error: questionsError } = await supabaseAdmin
        .from("bid_questions")
        .insert(questionRecords);

      if (questionsError) {
        console.error("Failed to create questions:", questionsError);
      }
    }

    const needsReview = payload.overall_confidence < 70 || payload.status === "partial";

    await supabaseAdmin
      .from("pdf_uploads")
      .update({
        status: needsReview ? "review_needed" : "extracted",
        extracted_bid_id: bid.id,
        extraction_confidence: payload.overall_confidence,
        mindpal_status: "completed",
        processing_completed_at: new Date().toISOString(),
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", pdfUploadId);

    if (extraction) {
      await supabaseAdmin
        .from("mindpal_extractions")
        .update({
          parsed_successfully: true,
          mapped_bid_id: bid.id,
          overall_confidence: payload.overall_confidence,
          field_confidences: payload.field_confidences,
          processed_at: new Date().toISOString(),
        })
        .eq("id", extraction.id);
    }

    try {
      await supabaseAdmin.rpc("calculate_bid_scores", { p_bid_id: bid.id });
    } catch (scoreError) {
      console.error("Failed to calculate scores:", scoreError);
    }

    const { data: allProjectPdfs } = await supabaseAdmin
      .from("pdf_uploads")
      .select("id, status")
      .eq("project_id", projectId);

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
        .eq("id", projectId);

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
              body: JSON.stringify({ project_id: projectId }),
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
      status: needsReview ? "review_needed" : "extracted",
      bidId: bid.id,
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
