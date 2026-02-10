import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { verifyEmailAuth, verifyProjectOwnership } from "../_shared/auth.ts";

// MindPal v3 API configuration
const MINDPAL_API_ENDPOINT = Deno.env.get("MINDPAL_API_ENDPOINT") || "https://api-v3.mindpal.io/api/workflow-v3/execute";
const MINDPAL_API_KEY = Deno.env.get("MINDPAL_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");

// Workflow ID for BidSmart Analyzer
const WORKFLOW_ID = Deno.env.get("MINDPAL_WORKFLOW_ID") || "697fc84945bf3484d9a860fb";

// Request body from frontend
interface RequestBody {
  projectId: string;
  pdfUploadIds: string[];
  userPriorities: Record<string, number>;
}

// MindPal v3 simplified payload (no field IDs needed)
interface MindPalV3Payload {
  document_urls: string[];
  user_priorities: Record<string, number>;
  request_id: string;
  callback_url: string;
}

function generateUUID(): string {
  return crypto.randomUUID();
}

async function getPublicUrlsForPdfs(
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

async function callMindPalV3API(payload: MindPalV3Payload): Promise<{
  workflowRunId: string;
}> {
  if (!MINDPAL_API_KEY) {
    throw new Error("MindPal API key not configured");
  }
  if (!WORKFLOW_ID) {
    throw new Error("MindPal workflow ID not configured");
  }

  // v3 API uses query parameter for workflow_id
  const apiUrl = `${MINDPAL_API_ENDPOINT}?workflow_id=${WORKFLOW_ID}`;
  
  console.log("MindPal v3 API Request:", {
    url: apiUrl,
    workflow_id: WORKFLOW_ID,
    document_count: payload.document_urls.length,
    request_id: payload.request_id,
    callback_url: payload.callback_url
  });

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${MINDPAL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  console.log("MindPal v3 API Response:", {
    status: response.status,
    statusText: response.statusText
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("MindPal v3 API error:", errorText);
    throw new Error(`MindPal API failed: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  
  // v3 response format: { "data": { "workflowRunId": "..." }, "status": "success" }
  const workflowRunId = result.data?.workflowRunId || result.workflowRunId;
  
  console.log("✅ MindPal v3 API Success:", {
    workflowRunId,
    status: result.status,
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

    // Construct v3 payload with simplified field names
    const payload: MindPalV3Payload = {
      document_urls: documentUrls,
      user_priorities: userPriorities,
      request_id: requestId,
      callback_url: callbackUrl
    };

    console.log("Calling MindPal v3 API with", documentUrls.length, "documents");
    console.log("Full payload:", JSON.stringify(payload, null, 2));
    
    let mindpalResult: { workflowRunId: string };
    try {
      mindpalResult = await callMindPalV3API(payload);
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
