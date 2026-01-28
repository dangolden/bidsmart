import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { verifyEmailAuth, verifyProjectOwnership } from "../_shared/auth.ts";
import { generateHmacSignature, createCallbackPayload } from "../_shared/hmac.ts";
import type { MindPalTriggerRequest } from "../_shared/types.ts";

const MINDPAL_WEBHOOK_URL = Deno.env.get("MINDPAL_WEBHOOK_URL");
const MINDPAL_API_KEY = Deno.env.get("MINDPAL_API_KEY");
const MINDPAL_CALLBACK_SECRET = Deno.env.get("MINDPAL_CALLBACK_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");

interface RequestBody {
  projectId: string;
  pdfUploadId: string;
}

Deno.serve(async (req: Request) => {
  try {
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    if (req.method !== "POST") {
      return errorResponse("Method not allowed", 405);
    }

    const authResult = await verifyEmailAuth(req);
    if (authResult instanceof Response) {
      return authResult;
    }
    const { userExtId } = authResult;

    const body: RequestBody = await req.json();
    const { projectId, pdfUploadId } = body;

    if (!projectId || !pdfUploadId) {
      return errorResponse("Missing projectId or pdfUploadId");
    }

    const isOwner = await verifyProjectOwnership(userExtId, projectId);
    if (!isOwner) {
      return errorResponse("Not authorized to access this project", 403);
    }

    const { data: pdfUpload, error: pdfError } = await supabaseAdmin
      .from("pdf_uploads")
      .select("*")
      .eq("id", pdfUploadId)
      .eq("project_id", projectId)
      .maybeSingle();

    if (pdfError || !pdfUpload) {
      return errorResponse("PDF upload not found", 404);
    }

    if (pdfUpload.status === "processing") {
      return errorResponse("Extraction already in progress", 409);
    }

    const { data: project, error: projectError } = await supabaseAdmin
      .from("projects")
      .select(`
        *,
        users_ext!inner (
          property_state,
          property_zip,
          square_footage
        )
      `)
      .eq("id", projectId)
      .maybeSingle();

    if (projectError || !project) {
      return errorResponse("Project not found", 404);
    }

    const { data: requirements } = await supabaseAdmin
      .from("project_requirements")
      .select("*")
      .eq("project_id", projectId)
      .maybeSingle();

    const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin
      .storage
      .from("bid-pdfs")
      .createSignedUrl(pdfUpload.file_path, 3600);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      return errorResponse("Failed to generate signed URL for PDF", 500);
    }

    if (!MINDPAL_WEBHOOK_URL || !MINDPAL_API_KEY || !MINDPAL_CALLBACK_SECRET) {
      return errorResponse("MindPal configuration missing", 500);
    }

    const timestamp = new Date().toISOString();
    const signaturePayload = createCallbackPayload(pdfUploadId, timestamp);
    const signature = await generateHmacSignature(signaturePayload, MINDPAL_CALLBACK_SECRET);

    const callbackUrl = `${SUPABASE_URL}/functions/v1/mindpal-callback`;

    const mindpalRequest: MindPalTriggerRequest = {
      pdf_url: signedUrlData.signedUrl,
      callback_url: callbackUrl,
      request_id: pdfUploadId,
      signature,
      timestamp,
      project_context: {
        project_id: projectId,
        heat_pump_type: project.heat_pump_type,
        system_size_tons: project.system_size_tons,
        property_state: project.users_ext?.property_state,
        property_zip: project.users_ext?.property_zip,
        square_footage: project.users_ext?.square_footage,
        priorities: requirements ? {
          price: requirements.priority_price,
          warranty: requirements.priority_warranty,
          efficiency: requirements.priority_efficiency,
          timeline: requirements.priority_timeline,
          reputation: requirements.priority_reputation,
        } : undefined,
        concerns: requirements?.specific_concerns,
        must_have_features: requirements?.must_have_features,
      },
    };

    const mindpalResponse = await fetch(MINDPAL_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${MINDPAL_API_KEY}`,
      },
      body: JSON.stringify(mindpalRequest),
    });

    if (!mindpalResponse.ok) {
      const errorText = await mindpalResponse.text();
      console.error("MindPal API error:", errorText);

      await supabaseAdmin
        .from("pdf_uploads")
        .update({
          status: "failed",
          error_message: `MindPal API error: ${mindpalResponse.status}`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", pdfUploadId);

      return errorResponse(`MindPal API error: ${mindpalResponse.status}`, 502);
    }

    const mindpalResult = await mindpalResponse.json();

    await supabaseAdmin
      .from("pdf_uploads")
      .update({
        status: "processing",
        mindpal_run_id: mindpalResult.workflow_run_id || mindpalResult.run_id || mindpalResult.id,
        mindpal_status: "triggered",
        processing_started_at: new Date().toISOString(),
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", pdfUploadId);

    return jsonResponse({
      success: true,
      pdfUploadId,
      runId: mindpalResult.workflow_run_id || mindpalResult.run_id || mindpalResult.id,
      message: "Extraction started",
    });

  } catch (error) {
    console.error("Error in send-to-mindpal:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Internal server error",
      500
    );
  }
});
