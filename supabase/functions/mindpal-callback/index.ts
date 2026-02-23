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
  isAccessory,
  inferSystemRole,
  inferFuelType,
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

    // ── V2 Insert 1: bids (core bid record) ──
    const { data: bid, error: bidError } = await supabaseAdmin
      .from("bids")
      .insert({
        project_id: projectId,
        pdf_upload_id: pdfUploadId,
        contractor_name: payload.contractor_info?.company_name || "Unknown Contractor",
        system_type: "heat_pump",
        total_bid_amount: payload.pricing?.total_amount || 0,
        labor_cost: payload.pricing?.labor_cost,
        equipment_cost: payload.pricing?.equipment_cost,
        materials_cost: payload.pricing?.materials_cost,
        permit_cost: payload.pricing?.permit_cost,
        disposal_cost: payload.pricing?.disposal_cost,
        electrical_cost: payload.pricing?.electrical_cost,
        total_before_rebates: payload.pricing?.price_before_rebates,
        estimated_rebates: payload.pricing?.rebates_mentioned?.reduce(
          (sum, r) => sum + (r.amount || 0),
          0
        ),
        total_after_rebates: payload.pricing?.price_after_rebates,
        deposit_required: payload.payment_terms?.deposit_amount,
        deposit_percentage: payload.payment_terms?.deposit_percentage,
        payment_schedule: payload.payment_terms?.payment_schedule,
        financing_offered: payload.payment_terms?.financing_offered || false,
        financing_terms: payload.payment_terms?.financing_terms,
        labor_warranty_years: payload.warranty?.labor_warranty_years,
        equipment_warranty_years: payload.warranty?.equipment_warranty_years,
        compressor_warranty_years: payload.warranty?.compressor_warranty_years,
        additional_warranty_details: payload.warranty?.warranty_details,
        estimated_days: payload.timeline?.estimated_days,
        start_date_available: payload.timeline?.start_date_available,
        bid_date: payload.dates?.bid_date || payload.dates?.quote_date,
        valid_until: payload.dates?.valid_until || payload.timeline?.bid_valid_until,
        extraction_confidence: confidenceLevel,
        extraction_notes: payload.extraction_notes
          ?.map((n) => `[${n.type}] ${n.message}`)
          .join("\n"),
        verified_by_user: false,
        is_favorite: false,
      })
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

    // ── V2 Insert 2: bid_contractors (1:1 contractor identity) ──
    const { error: contractorError } = await supabaseAdmin
      .from("bid_contractors")
      .insert({
        bid_id: bid.id,
        name: payload.contractor_info?.company_name || "Unknown Contractor",
        company: payload.contractor_info?.company_name,
        contact_name: payload.contractor_info?.contact_name,
        phone: payload.contractor_info?.phone,
        email: payload.contractor_info?.email,
        website: payload.contractor_info?.website,
        license: payload.contractor_info?.license_number,
        license_state: payload.contractor_info?.license_state,
      });

    if (contractorError) {
      console.error("Failed to create bid_contractor:", contractorError);
    }

    // ── V2 Insert 3: bid_scope (1:1 scope + line_items + electrical + accessories JSONB) ──
    const lineItemsJsonb = payload.line_items?.map((item) => ({
      item_type: mapLineItemType(item.item_type),
      description: item.description,
      amount: item.total_price,
      quantity: item.quantity || 1,
      unit_price: item.unit_price,
      is_included: true,
      notes: item.source_text,
    })) ?? [];

    // Build accessories JSONB from equipment items classified as accessories
    const accessoriesJsonb = payload.equipment
      ?.filter((eq) => isAccessory(eq.equipment_type))
      .map((eq) => ({
        type: eq.equipment_type,
        name: eq.model_name || eq.equipment_type,
        brand: eq.brand,
        model_number: eq.model_number,
        description: eq.model_name,
        cost: eq.equipment_cost,
      })) ?? [];

    const { error: scopeError } = await supabaseAdmin
      .from("bid_scope")
      .insert({
        bid_id: bid.id,
        summary: payload.scope_of_work?.summary,
        inclusions: payload.scope_of_work?.inclusions || [],
        exclusions: payload.scope_of_work?.exclusions || [],
        permit_included: payload.scope_of_work?.permit_included,
        disposal_included: payload.scope_of_work?.disposal_included,
        electrical_included: payload.scope_of_work?.electrical_work_included,
        ductwork_included: payload.scope_of_work?.ductwork_included,
        thermostat_included: payload.scope_of_work?.thermostat_included,
        manual_j_included: payload.scope_of_work?.manual_j_included,
        commissioning_included: payload.scope_of_work?.commissioning_included,
        air_handler_included: payload.scope_of_work?.air_handler_included,
        line_set_included: payload.scope_of_work?.line_set_included,
        disconnect_included: payload.scope_of_work?.disconnect_included,
        pad_included: payload.scope_of_work?.pad_included,
        drain_line_included: payload.scope_of_work?.drain_line_included,
        // Electrical sub-fields (from payload.electrical)
        panel_assessment_included: payload.electrical?.panel_assessment_included,
        panel_upgrade_included: payload.electrical?.panel_upgrade_included,
        dedicated_circuit_included: payload.electrical?.dedicated_circuit_included,
        electrical_permit_included: payload.electrical?.electrical_permit_included,
        load_calculation_included: payload.electrical?.load_calculation_included,
        existing_panel_amps: payload.electrical?.existing_panel_amps,
        proposed_panel_amps: payload.electrical?.proposed_panel_amps,
        breaker_size_required: payload.electrical?.breaker_size_required,
        panel_upgrade_cost: payload.electrical?.panel_upgrade_cost,
        electrical_notes: payload.electrical?.electrical_notes,
        // JSONB columns
        accessories: accessoriesJsonb.length > 0 ? accessoriesJsonb : null,
        line_items: lineItemsJsonb,
      });

    if (scopeError) {
      console.error("Failed to create bid_scope:", scopeError);
    }

    // ── V2 Insert 4: bid_scores (calculated via RPC) ──
    try {
      const { error: scoresError } = await supabaseAdmin
        .rpc("calculate_bid_scores", { p_bid_id: bid.id });

      if (scoresError) {
        console.error("Failed to calculate bid_scores:", scoresError);
        // Fallback: create empty row so views don't break
        await supabaseAdmin.from("bid_scores").insert({ bid_id: bid.id });
      }
    } catch (scoreErr) {
      console.error("Error calling calculate_bid_scores RPC:", scoreErr);
      // Fallback: create empty row so views don't break
      await supabaseAdmin.from("bid_scores").insert({ bid_id: bid.id });
    }

    // ── bid_equipment (1:N — major equipment only, accessories go to bid_scope.accessories) ──
    const majorEquipment = payload.equipment?.filter((eq) => !isAccessory(eq.equipment_type)) ?? [];

    if (majorEquipment.length > 0) {
      const equipment = majorEquipment.map((eq) => ({
        bid_id: bid.id,
        equipment_type: eq.equipment_type,
        system_role: inferSystemRole(eq.equipment_type),
        fuel_type: inferFuelType(eq.equipment_type),
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
        afue_rating: eq.afue_rating,
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

    // ── bid_faqs (V2 column names) ──
    if (payload.faqs && payload.faqs.length > 0) {
      const faqRecords = payload.faqs.map((faq) => ({
        bid_id: bid.id,
        question: faq.question,
        answer: faq.answer,
        category: faq.category,
        answer_confidence: faq.answer_confidence,
        sources: faq.sources,
        display_order: faq.display_order,
      }));

      const { error: faqsError } = await supabaseAdmin
        .from("bid_faqs")
        .insert(faqRecords);

      if (faqsError) {
        console.error("Failed to create FAQs:", faqsError);
      }
    }

    // ── contractor_questions (renamed from bid_questions, v8 fields restored) ──
    if (payload.questions && payload.questions.length > 0) {
      const questionRecords = payload.questions.map((q) => ({
        bid_id: bid.id,
        question_text: q.question_text,
        question_category: q.question_category,
        question_tier: q.question_tier || "clarification",
        priority: q.priority,
        context: q.context,
        triggered_by: q.triggered_by,
        good_answer_looks_like: q.good_answer_looks_like,
        concerning_answer_looks_like: q.concerning_answer_looks_like,
        missing_field: q.missing_field,
        generation_notes: q.generation_notes,
        is_answered: false,
        auto_generated: true,
        display_order: q.display_order,
      }));

      const { error: questionsError } = await supabaseAdmin
        .from("contractor_questions")
        .upsert(questionRecords, { onConflict: "bid_id,question_text" });

      if (questionsError) {
        console.error("Failed to create questions:", questionsError);
      }
    }

    // ── project_incentives (stub — populated when MindPal Incentive Finder is configured) ──
    if (payload.incentives && payload.incentives.length > 0) {
      const incentiveRecords = payload.incentives.map((inc) => ({
        project_id: projectId,
        source: "ai_discovered" as const,
        program_name: inc.program_name,
        program_type: inc.program_type,
        amount_min: inc.amount_min,
        amount_max: inc.amount_max,
        amount_description: inc.amount_description,
        equipment_types_eligible: inc.equipment_types_eligible || ["heat_pump"],
        eligibility_requirements: inc.eligibility_requirements,
        income_qualified: inc.income_qualified || false,
        application_url: inc.application_url,
        verification_source: inc.verification_source,
        can_stack: inc.can_stack,
        confidence: inc.confidence || "medium",
      }));

      const { error: incentiveError } = await supabaseAdmin
        .from("project_incentives")
        .insert(incentiveRecords);

      if (incentiveError) {
        console.error("Failed to create incentives:", incentiveError);
      }
    } else if (payload.incentives === undefined) {
      // Incentive data not present in payload — expected until Incentive Finder node is configured
      console.log("No incentive data in payload (Incentive Finder not configured yet)");
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
