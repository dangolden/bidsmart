import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { createUserClient } from "../_shared/supabase.ts";
import { verifyAuth } from "../_shared/auth.ts";

Deno.serve(async (req: Request) => {
  try {
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    if (req.method !== "GET") {
      return errorResponse("Method not allowed", 405);
    }

    const authResult = await verifyAuth(req);
    if (authResult instanceof Response) {
      return authResult;
    }
    const authHeader = req.headers.get("Authorization")!;

    const url = new URL(req.url);
    const pdfUploadId = url.searchParams.get("pdfUploadId");

    if (!pdfUploadId) {
      return errorResponse("Missing pdfUploadId parameter");
    }

    const supabase = createUserClient(authHeader);

    const { data: pdfUpload, error } = await supabase
      .from("pdf_uploads")
      .select(`
        id,
        status,
        extraction_confidence,
        extracted_bid_id,
        error_message,
        mindpal_status,
        processing_started_at,
        processing_completed_at,
        retry_count,
        project_id
      `)
      .eq("id", pdfUploadId)
      .maybeSingle();

    if (error) {
      console.error("Database error:", error);
      return errorResponse("Failed to fetch extraction status", 500);
    }

    if (!pdfUpload) {
      return errorResponse("PDF upload not found", 404);
    }

    let progress = 0;
    switch (pdfUpload.status) {
      case "uploaded":
        progress = 0;
        break;
      case "processing":
        progress = 50;
        break;
      case "extracted":
      case "verified":
        progress = 100;
        break;
      case "review_needed":
        progress = 90;
        break;
      case "failed":
        progress = 0;
        break;
    }

    return jsonResponse({
      pdfUploadId: pdfUpload.id,
      status: pdfUpload.status,
      progress,
      confidence: pdfUpload.extraction_confidence,
      bidId: pdfUpload.extracted_bid_id,
      error: pdfUpload.error_message,
      mindpalStatus: pdfUpload.mindpal_status,
      processingStartedAt: pdfUpload.processing_started_at,
      processingCompletedAt: pdfUpload.processing_completed_at,
      retryCount: pdfUpload.retry_count,
    });

  } catch (error) {
    console.error("Error in extraction-status:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Internal server error",
      500
    );
  }
});
