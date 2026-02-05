import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { verifyEmailAuth, verifyProjectOwnership } from "../_shared/auth.ts";

const MINDPAL_API_ENDPOINT = Deno.env.get("MINDPAL_API_ENDPOINT") || "https://app.mindpal.space/api/v2/workflow/run";
const MINDPAL_API_KEY = Deno.env.get("MINDPAL_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");

// MindPal v10 workflow configuration - set via environment variables
// Workflow: BidSmart Analyzer v10 (697fc84945bf3484d9a860fb)
const WORKFLOW_ID = Deno.env.get("MINDPAL_WORKFLOW_ID") || "697fc84945bf3484d9a860fb";
const DOCUMENT_URLS_FIELD_ID = Deno.env.get("MINDPAL_DOCUMENT_URLS_FIELD_ID") || "697fc84945bf3484d9a860fe";
const USER_PRIORITIES_FIELD_ID = Deno.env.get("MINDPAL_USER_PRIORITIES_FIELD_ID") || "697fc84945bf3484d9a86100";
const REQUEST_ID_FIELD_ID = Deno.env.get("MINDPAL_REQUEST_ID_FIELD_ID") || "697fc84945bf3484d9a86101";
const CALLBACK_URL_FIELD_ID = Deno.env.get("MINDPAL_CALLBACK_URL_FIELD_ID") || "697fc84945bf3484d9a860ff";

interface RequestBody {
  projectId: string;
  pdfUploadIds: string[];
  userPriorities: Record<string, number>;
}

interface MindPalPayload {
  data: {
    [key: string]: string;
  };
}

function generateUUID(): string {
  return crypto.randomUUID();
}

async function uploadFilesToStorage(
  projectId: string,
  pdfUploadIds: string[]
): Promise<string[]> {
  const pdfUrls: string[] = [];

  for (const pdfUploadId of pdfUploadIds) {
    const { data: pdfUpload, error: pdfError } = await supabaseAdmin
      .from("pdf_uploads")
      .select("file_path")
      .eq("id", pdfUploadId)
      .eq("project_id", projectId)
      .maybeSingle();

    if (pdfError || !pdfUpload) {
      throw new Error(`PDF upload ${pdfUploadId} not found`);
    }

    const { data: publicUrlData, error: urlError } = await supabaseAdmin
      .storage
      .from("bid-pdfs")
      .createSignedUrl(pdfUpload.file_path, 3600);

    if (urlError || !publicUrlData?.signedUrl) {
      throw new Error(`Failed to generate signed URL for ${pdfUploadId}`);
    }

    pdfUrls.push(publicUrlData.signedUrl);
  }

  return pdfUrls;
}

function constructMindPalPayload(
  pdfUrls: string[],
  userPriorities: Record<string, number>,
  requestId: string,
  callbackUrl: string
): MindPalPayload {
  return {
    data: {
      [DOCUMENT_URLS_FIELD_ID]: JSON.stringify(pdfUrls),
      [USER_PRIORITIES_FIELD_ID]: JSON.stringify(userPriorities),
      [REQUEST_ID_FIELD_ID]: requestId,
      [CALLBACK_URL_FIELD_ID]: callbackUrl,
    },
  };
}

async function callMindPalAPI(payload: MindPalPayload): Promise<{
  workflow_run_id: string;
}> {
  if (!MINDPAL_API_KEY) {
    throw new Error("MindPal API key not configured");
  }
  if (!WORKFLOW_ID || !DOCUMENT_URLS_FIELD_ID || !USER_PRIORITIES_FIELD_ID || !REQUEST_ID_FIELD_ID || !CALLBACK_URL_FIELD_ID) {
    throw new Error("MindPal workflow configuration incomplete - check environment variables");
  }

  const apiUrl = `${MINDPAL_API_ENDPOINT}?workflow_id=${WORKFLOW_ID}`;
  
  console.log("MindPal API Request:", {
    url: apiUrl,
    workflow_id: WORKFLOW_ID,
    payload: JSON.stringify(payload, null, 2),
    api_key_present: !!MINDPAL_API_KEY,
    api_key_length: MINDPAL_API_KEY?.length
  });

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "x-api-key": MINDPAL_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  console.log("MindPal API Response:", {
    status: response.status,
    statusText: response.statusText,
    headers: Object.fromEntries(response.headers.entries())
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("MindPal API error:", errorText);
    throw new Error(`MindPal API failed: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  return result;
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
    const { projectId, pdfUploadIds, userPriorities } = body;

    if (!projectId || !pdfUploadIds || !Array.isArray(pdfUploadIds) || pdfUploadIds.length === 0) {
      return errorResponse("Missing or invalid projectId or pdfUploadIds");
    }

    if (!userPriorities || typeof userPriorities !== "object") {
      return errorResponse("Missing or invalid userPriorities");
    }

    const isOwner = await verifyProjectOwnership(userExtId, projectId);
    if (!isOwner) {
      return errorResponse("Not authorized to access this project", 403);
    }

    const pdfUrls = await uploadFilesToStorage(projectId, pdfUploadIds);

    const requestId = generateUUID();
    const callbackUrl = `${SUPABASE_URL}/functions/v1/mindpal-callback`;

    console.log("Callback URL:", callbackUrl);

    const payload = constructMindPalPayload(pdfUrls, userPriorities, requestId, callbackUrl);

    const mindpalResult = await callMindPalAPI(payload);

    const workflowRunId = mindpalResult.workflow_run_id;

    await supabaseAdmin
      .from("pdf_uploads")
      .update({
        status: "processing",
        mindpal_status: "processing",
        mindpal_run_id: workflowRunId,
        processing_started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .in("id", pdfUploadIds);

    await supabaseAdmin
      .from("projects")
      .update({
        status: "analyzing",
        updated_at: new Date().toISOString(),
      })
      .eq("id", projectId);

    return jsonResponse({
      success: true,
      projectId,
      requestId,
      workflowRunId,
      callbackUrl,
      pdfCount: pdfUploadIds.length,
      message: "Analysis started successfully",
    });
  } catch (error) {
    console.error("Error in start-mindpal-analysis:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Internal server error",
      500
    );
  }
});
