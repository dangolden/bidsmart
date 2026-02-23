import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { verifyEmailAuth, verifyProjectOwnership } from "../_shared/auth.ts";

// MindPal API configuration (v18 workflow — app.mindpal.space v2 API + data format)
const MINDPAL_API_ENDPOINT = Deno.env.get("MINDPAL_API_ENDPOINT") || "https://app.mindpal.space/api/v2/workflow/run";
const MINDPAL_API_KEY = Deno.env.get("MINDPAL_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");

// Workflow ID for BidSmart Analyzer
const WORKFLOW_ID = Deno.env.get("MINDPAL_WORKFLOW_ID") || "699a33ac6787d2e1b0e9ed93";

// MindPal field IDs for the workflow inputs (v18 workflow — updated 2026-02-22)
const DOCUMENT_URLS_FIELD_ID = Deno.env.get("MINDPAL_DOCUMENT_URLS_FIELD_ID") || "699a33ad6787d2e1b0e9ed96";
const USER_PRIORITIES_FIELD_ID = Deno.env.get("MINDPAL_USER_PRIORITIES_FIELD_ID") || "699a33ad6787d2e1b0e9ed98";
const USER_NOTES_FIELD_ID = Deno.env.get("MINDPAL_USER_NOTES_FIELD_ID") || "699a33ad6787d2e1b0e9ed9a";
const PROJECT_ID_FIELD_ID = Deno.env.get("MINDPAL_PROJECT_ID_FIELD_ID") || "699a33ad6787d2e1b0e9ed99";
const CALLBACK_URL_FIELD_ID = Deno.env.get("MINDPAL_CALLBACK_URL_FIELD_ID") || "699a33ad6787d2e1b0e9ed9b";
const REQUEST_ID_FIELD_ID = Deno.env.get("MINDPAL_REQUEST_ID_FIELD_ID") || "699a33ad6787d2e1b0e9ed97";

// Request body from frontend
interface RequestBody {
  projectId: string;
  pdfUploadIds: string[];
  userPriorities: Record<string, number>;
}

// MindPal payload structure (v18 data format — same as v10)
interface MindPalPayload {
  data: Record<string, string>;
}

function generateUUID(): string {
  return crypto.randomUUID();
}

async function getPublicUrlsForPdfs(
  projectId: string,
  pdfUploadIds: string[]
): Promise<string[]> {
  const pdfUrls: string[] = [];

  console.log("Looking up PDFs:", { projectId, pdfUploadIds });

  for (const pdfUploadId of pdfUploadIds) {
    console.log(`Querying pdf_uploads for id=${pdfUploadId}, project_id=${projectId}`);
    
    const { data: pdfUpload, error: pdfError } = await supabaseAdmin
      .from("pdf_uploads")
      .select("file_path, project_id, file_name")
      .eq("id", pdfUploadId)
      .maybeSingle();

    console.log("Query result:", { pdfUpload, pdfError });

    if (pdfError) {
      throw new Error(`PDF query error for ${pdfUploadId}: ${pdfError.message}`);
    }
    
    if (!pdfUpload) {
      throw new Error(`PDF upload ${pdfUploadId} not found in database`);
    }
    
    if (pdfUpload.project_id !== projectId) {
      throw new Error(`PDF ${pdfUploadId} belongs to project ${pdfUpload.project_id}, not ${projectId}`);
    }

    // Generate public URL (1 hour expiry)
    const { data: signedUrlData, error: urlError } = await supabaseAdmin
      .storage
      .from("bid-pdfs")
      .createSignedUrl(pdfUpload.file_path, 3600);

    if (urlError || !signedUrlData?.signedUrl) {
      throw new Error(`Failed to generate signed URL for ${pdfUploadId}`);
    }

    pdfUrls.push(signedUrlData.signedUrl);
  }

  return pdfUrls;
}

async function callMindPalAPI(payload: MindPalPayload): Promise<{
  workflowRunId: string;
}> {
  if (!MINDPAL_API_KEY) {
    throw new Error("MindPal API key not configured");
  }
  if (!WORKFLOW_ID) {
    throw new Error("MindPal workflow ID not configured");
  }

  // v2 API uses query parameter for workflow_id
  const apiUrl = `${MINDPAL_API_ENDPOINT}?workflow_id=${WORKFLOW_ID}`;

  console.log("MindPal API Request:", {
    url: apiUrl,
    workflow_id: WORKFLOW_ID,
    field_ids: {
      document_urls: DOCUMENT_URLS_FIELD_ID,
      user_priorities: USER_PRIORITIES_FIELD_ID,
      user_notes: USER_NOTES_FIELD_ID,
      project_id: PROJECT_ID_FIELD_ID,
      callback_url: CALLBACK_URL_FIELD_ID,
      request_id: REQUEST_ID_FIELD_ID
    },
    payload: JSON.stringify(payload, null, 2)
  });

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "accept": "application/json",
      "x-api-key": MINDPAL_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  console.log("MindPal API Response:", {
    status: response.status,
    statusText: response.statusText
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("MindPal API error:", errorText);
    throw new Error(`MindPal API failed: ${response.status} - ${errorText}`);
  }

  const result = await response.json();

  const workflowRunId = result.workflowRunId || result.workflow_run_id || result.data?.workflow_run_id || result.id;

  console.log("✅ MindPal API Success:", {
    workflowRunId,
    full_response: JSON.stringify(result, null, 2)
  });

  return { workflowRunId };
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
    
    console.log("Incoming request body:", JSON.stringify({
      projectId: body.projectId,
      pdfUploadIdsCount: body.pdfUploadIds?.length,
      hasUserPriorities: !!body.userPriorities,
      bodyKeys: Object.keys(body)
    }, null, 2));
    
    const { projectId, pdfUploadIds, userPriorities } = body;

    // Validate inputs
    if (!projectId) {
      return errorResponse("Missing projectId");
    }

    if (!pdfUploadIds || !Array.isArray(pdfUploadIds) || pdfUploadIds.length === 0) {
      return errorResponse("Missing or invalid pdfUploadIds array");
    }

    if (!userPriorities || typeof userPriorities !== "object") {
      return errorResponse("Missing or invalid userPriorities");
    }

    const isOwner = await verifyProjectOwnership(userExtId, projectId);
    if (!isOwner) {
      return errorResponse("Not authorized to access this project", 403);
    }

    // Generate public URLs for the uploaded PDFs
    console.log("Generating URLs for", pdfUploadIds.length, "PDFs");
    let documentUrls: string[];
    try {
      documentUrls = await getPublicUrlsForPdfs(projectId, pdfUploadIds);
      console.log("Generated URLs:", documentUrls.length, documentUrls);
    } catch (urlError) {
      console.error("Failed to generate URLs:", urlError);
      return errorResponse(`URL generation failed: ${urlError instanceof Error ? urlError.message : String(urlError)}`);
    }

    const requestId = generateUUID();
    const callbackUrl = `${SUPABASE_URL}/functions/v1/mindpal-callback`;

    // Extract user_notes from userPriorities.project_details if present
    const userNotes = String(userPriorities.project_details || '');
    
    // Construct v18 payload with data format (field ID → value map)
    const payload: MindPalPayload = {
      data: {
        [DOCUMENT_URLS_FIELD_ID]: JSON.stringify(documentUrls),
        [USER_PRIORITIES_FIELD_ID]: JSON.stringify(userPriorities),
        [USER_NOTES_FIELD_ID]: userNotes,
        [PROJECT_ID_FIELD_ID]: projectId,
        [CALLBACK_URL_FIELD_ID]: callbackUrl,
        [REQUEST_ID_FIELD_ID]: requestId,
      }
    };

    console.log("Calling MindPal API with", documentUrls.length, "documents");
    console.log("Full payload:", JSON.stringify(payload, null, 2));

    let mindpalResult: { workflowRunId: string };
    try {
      mindpalResult = await callMindPalAPI(payload);
    } catch (apiError) {
      console.error("MindPal API call failed:", apiError);
      return errorResponse(`MindPal API failed: ${apiError instanceof Error ? apiError.message : String(apiError)}`);
    }

    // Update project status
    await supabaseAdmin
      .from("projects")
      .update({
        status: "analyzing",
        updated_at: new Date().toISOString(),
      })
      .eq("id", projectId);

    // Update PDF upload records with processing status
    for (const pdfUploadId of pdfUploadIds) {
      await supabaseAdmin
        .from("pdf_uploads")
        .update({
          status: "processing",
          updated_at: new Date().toISOString(),
        })
        .eq("id", pdfUploadId);
    }

    return jsonResponse({
      success: true,
      projectId,
      requestId,
      workflowRunId: mindpalResult.workflowRunId,
      callbackUrl,
      pdfCount: pdfUploadIds.length,
      mode: "url",
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
