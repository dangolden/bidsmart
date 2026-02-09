import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { verifyEmailAuth, verifyProjectOwnership } from "../_shared/auth.ts";

const MINDPAL_API_BASE = Deno.env.get("MINDPAL_API_BASE") || "https://api.mindpal.io/v1";
const MINDPAL_API_KEY = Deno.env.get("MINDPAL_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");

// MindPal v11 workflow configuration - set via environment variables
// Workflow: BidSmart Analyzer v11 (69860fd696be27d5d9cb4252)
const WORKFLOW_ID = Deno.env.get("MINDPAL_WORKFLOW_ID") || "69860fd696be27d5d9cb4252";

// Field IDs for v11 API
const DOCUMENTS_FIELD_ID = Deno.env.get("MINDPAL_DOCUMENTS_FIELD_ID") || "69860fd696be27d5d9cb4258";
const USER_PRIORITIES_FIELD_ID = Deno.env.get("MINDPAL_USER_PRIORITIES_FIELD_ID") || "69860fd696be27d5d9cb4255";
const REQUEST_ID_FIELD_ID = Deno.env.get("MINDPAL_REQUEST_ID_FIELD_ID") || "69860fd696be27d5d9cb4257";
const CALLBACK_URL_FIELD_ID = Deno.env.get("MINDPAL_CALLBACK_URL_FIELD_ID") || "69860fd696be27d5d9cb4256";

// Base64 document structure (v11 format)
interface Base64Document {
  filename: string;
  mime_type: string;
  base64_content: string;
  size?: number;
}

// Request body - supports both URL-based and Base64 modes
interface RequestBody {
  projectId: string;
  pdfUploadIds?: string[]; // Legacy URL-based mode
  documents?: Base64Document[]; // New Base64 mode
  userPriorities: Record<string, number>;
  useBase64?: boolean; // Flag to indicate Base64 mode
}

interface MindPalPayload {
  [key: string]: any;
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
  documents: Base64Document[],
  userPriorities: Record<string, number>,
  requestId: string,
  callbackUrl: string
): MindPalPayload {
  return {
    [DOCUMENTS_FIELD_ID]: documents,
    [USER_PRIORITIES_FIELD_ID]: userPriorities,
    [REQUEST_ID_FIELD_ID]: requestId,
    [CALLBACK_URL_FIELD_ID]: callbackUrl,
  };
}

async function callMindPalAPI(payload: MindPalPayload): Promise<{
  workflow_run_id: string;
}> {
  if (!MINDPAL_API_KEY) {
    throw new Error("MindPal API key not configured");
  }
  if (!WORKFLOW_ID || !DOCUMENTS_FIELD_ID || !USER_PRIORITIES_FIELD_ID || !REQUEST_ID_FIELD_ID || !CALLBACK_URL_FIELD_ID) {
    throw new Error("MindPal workflow configuration incomplete - check environment variables");
  }

  const apiUrl = `${MINDPAL_API_BASE}/workflows/${WORKFLOW_ID}/run`;
  
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
      "Authorization": `Bearer ${MINDPAL_API_KEY}`,
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
    
    // DEBUG: Log the incoming request body
    console.log("Incoming request body:", JSON.stringify({
      projectId: body.projectId,
      hasDocuments: !!body.documents,
      documentsType: typeof body.documents,
      documentsIsArray: Array.isArray(body.documents),
      documentsLength: body.documents?.length,
      hasPdfUploadIds: !!body.pdfUploadIds,
      hasUserPriorities: !!body.userPriorities,
      useBase64: body.useBase64,
      bodyKeys: Object.keys(body)
    }, null, 2));
    
    const { projectId, pdfUploadIds, documents, userPriorities, useBase64 } = body;

    // Validate project ID
    if (!projectId) {
      return errorResponse("Missing projectId");
    }

    // Validate we have documents (Base64 mode only for v11)
    const isBase64Mode = documents && Array.isArray(documents) && documents.length > 0;

    if (!isBase64Mode) {
      console.error("Documents validation failed:", {
        documents,
        isArray: Array.isArray(documents),
        length: documents?.length
      });
      return errorResponse("Missing or invalid documents array");
    }

    if (!userPriorities || typeof userPriorities !== "object") {
      return errorResponse("Missing or invalid userPriorities");
    }

    const isOwner = await verifyProjectOwnership(userExtId, projectId);
    if (!isOwner) {
      return errorResponse("Not authorized to access this project", 403);
    }

    const requestId = generateUUID();
    const callbackUrl = `${SUPABASE_URL}/functions/v1/mindpal-callback`;

    console.log("Analysis mode: Base64");
    console.log("Callback URL:", callbackUrl);
    console.log("Processing Base64 documents:", documents!.length);

    const payload = constructMindPalPayload(documents!, userPriorities, requestId, callbackUrl);
    const documentCount = documents!.length;

    const mindpalResult = await callMindPalAPI(payload);
    const workflowRunId = mindpalResult.workflow_run_id;

    // Update project status
    await supabaseAdmin
      .from("projects")
      .update({
        status: "analyzing",
        updated_at: new Date().toISOString(),
      })
      .eq("id", projectId);

    // Note: In Base64 mode, we don't track individual PDF uploads in the database
    // The documents are sent directly without storage

    return jsonResponse({
      success: true,
      projectId,
      requestId,
      workflowRunId,
      callbackUrl,
      pdfCount: documentCount,
      mode: "base64",
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
