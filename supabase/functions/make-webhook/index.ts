import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { isV8Response, mapV8BidToDatabase, mapV8EquipmentToDatabase, mapV8AnalysisToDatabase } from "../_shared/v8Mapper.ts";
import type { BidSmartV8Response } from "../_shared/v8Types.ts";

const MAKE_WEBHOOK_SECRET = Deno.env.get("MAKE_WEBHOOK_SECRET");

/**
 * Make.com Webhook Receiver
 * 
 * This endpoint receives MindPal v8 responses from Make.com automation.
 * Make.com acts as a middleware layer for data transformation and validation.
 * 
 * Flow: MindPal v8 → Make.com → This endpoint → Database
 */
Deno.serve(async (req: Request) => {
  try {
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    if (req.method !== "POST") {
      return errorResponse("Method not allowed", 405);
    }

    // Verify Make.com authentication
    const authHeader = req.headers.get("Authorization");
    if (MAKE_WEBHOOK_SECRET && authHeader !== `Bearer ${MAKE_WEBHOOK_SECRET}`) {
      console.error("Invalid Make.com webhook authentication");
      return errorResponse("Unauthorized", 401);
    }

    const payload: BidSmartV8Response = await req.json();

    // Validate v8 response structure
    if (!isV8Response(payload)) {
      console.error("Invalid v8 response structure from Make.com");
      return errorResponse("Invalid payload structure - expected v8 format", 400);
    }

    const { request_id, status, bids, analysis, faqs, questions } = payload;

    if (!request_id) {
      return errorResponse("Missing request_id in payload", 400);
    }

    console.log(`[Make.com] Processing v8 response for request: ${request_id}`);
    console.log(`[Make.com] Status: ${status}, Bids: ${bids?.length || 0}`);

    // Find the project associated with this request_id
    // The request_id should match a pdf_upload or be stored in projects table
    const { data: pdfUploads, error: pdfError } = await supabaseAdmin
      .from("pdf_uploads")
      .select("id, project_id, mindpal_run_id")
      .eq("mindpal_run_id", request_id)
      .order("created_at", { ascending: false });

    if (pdfError || !pdfUploads || pdfUploads.length === 0) {
      console.error("No PDF uploads found for request_id:", request_id);
      return errorResponse("Request ID not found", 404);
    }

    const projectId = pdfUploads[0].project_id;

    console.log(`[Make.com] Found project: ${projectId}, PDF uploads: ${pdfUploads.length}`);

    // Handle failed extraction
    if (status === "failed") {
      await supabaseAdmin
        .from("pdf_uploads")
        .update({
          status: "failed",
          error_message: payload.error?.message || "Extraction failed",
          mindpal_status: "failed",
          processing_completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .in("id", pdfUploads.map((p: any) => p.id));

      return jsonResponse({ success: true, status: "failed", message: "Extraction failed" });
    }

    // v10: Extract customer_info from first bid (if present) and update projects table
    if (bids.length > 0 && bids[0].customer_info) {
      const customerInfo = bids[0].customer_info;
      const updateData: Record<string, any> = {};
      
      if (customerInfo.property_address) updateData.property_address = customerInfo.property_address;
      if (customerInfo.property_city) updateData.property_city = customerInfo.property_city;
      if (customerInfo.property_state) updateData.property_state = customerInfo.property_state;
      if (customerInfo.property_zip) updateData.property_zip = customerInfo.property_zip;
      
      if (Object.keys(updateData).length > 0) {
        updateData.updated_at = new Date().toISOString();
        
        const { error: projectUpdateError } = await supabaseAdmin
          .from("projects")
          .update(updateData)
          .eq("id", projectId);
        
        if (projectUpdateError) {
          console.error(`[Make.com] Failed to update project with customer_info:`, projectUpdateError);
        } else {
          console.log(`[Make.com] Updated project ${projectId} with customer_info`);
        }
      }
    }

    // Process each bid
    const createdBidIds: string[] = [];

    for (let i = 0; i < bids.length; i++) {
      const v8Bid = bids[i];
      const pdfUploadId = pdfUploads[i]?.id || pdfUploads[0].id; // Match by index or use first

      // v10: Support flat contractor_name OR nested contractor_info.company_name
      const contractorName = (v8Bid as any).contractor_name || v8Bid.contractor_info?.company_name || "Unknown";
      console.log(`[Make.com] Processing bid ${i + 1}/${bids.length}: ${contractorName}`);

      // Map v8 bid to database structure
      const bidData = mapV8BidToDatabase(v8Bid, projectId, pdfUploadId, payload.overall_confidence);

      // Insert bid
      const { data: bid, error: bidError } = await supabaseAdmin
        .from("contractor_bids")
        .insert(bidData)
        .select()
        .single();

      if (bidError) {
        console.error(`[Make.com] Failed to create bid ${i}:`, bidError);
        continue;
      }

      createdBidIds.push(bid.id);
      console.log(`[Make.com] Created bid: ${bid.id}`);

      // Insert equipment
      if (v8Bid.equipment && v8Bid.equipment.length > 0) {
        const equipmentData = v8Bid.equipment.map(eq =>
          mapV8EquipmentToDatabase(eq, bid.id, payload.overall_confidence)
        );

        const { error: equipmentError } = await supabaseAdmin
          .from("bid_equipment")
          .insert(equipmentData);

        if (equipmentError) {
          console.error(`[Make.com] Failed to create equipment for bid ${bid.id}:`, equipmentError);
        } else {
          console.log(`[Make.com] Created ${equipmentData.length} equipment records for bid ${bid.id}`);
        }
      }

      // Update PDF upload status
      await supabaseAdmin
        .from("pdf_uploads")
        .update({
          status: "extracted",
          extracted_bid_id: bid.id,
          extraction_confidence: payload.overall_confidence,
          processing_completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", pdfUploadId);
    }

    // Create or update bid_analysis with FAQs and questions
    const analysisData = mapV8AnalysisToDatabase(payload, projectId);

    const { data: existingAnalysis } = await supabaseAdmin
      .from("bid_analysis")
      .select("id")
      .eq("project_id", projectId)
      .maybeSingle();

    if (existingAnalysis) {
      // Update existing analysis
      await supabaseAdmin
        .from("bid_analysis")
        .update({
          ...analysisData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingAnalysis.id);

      console.log(`[Make.com] Updated analysis: ${existingAnalysis.id}`);
    } else {
      // Create new analysis
      const { data: newAnalysis, error: analysisError } = await supabaseAdmin
        .from("bid_analysis")
        .insert(analysisData)
        .select()
        .single();

      if (analysisError) {
        console.error("[Make.com] Failed to create analysis:", analysisError);
      } else {
        console.log(`[Make.com] Created analysis: ${newAnalysis.id}`);
      }
    }

    // Update project status
    await supabaseAdmin
      .from("projects")
      .update({
        status: "comparing",
        updated_at: new Date().toISOString(),
      })
      .eq("id", projectId);

    console.log(`[Make.com] Successfully processed ${createdBidIds.length} bids for project ${projectId}`);

    return jsonResponse({
      success: true,
      projectId,
      requestId: request_id,
      bidsCreated: createdBidIds.length,
      bidIds: createdBidIds,
      faqsStored: !!faqs,
      questionsStored: !!questions,
      message: "v8 data processed successfully",
    });

  } catch (error) {
    console.error("[Make.com] Error processing webhook:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Internal server error",
      500
    );
  }
});
