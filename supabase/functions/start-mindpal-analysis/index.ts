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
// V2: documents_json field — paired bid_id + doc_url for MindPal Loop Node
const DOCUMENTS_JSON_FIELD_ID = Deno.env.get("MINDPAL_DOCUMENTS_JSON_FIELD_ID") || "699d42f8f6f83a173c0b6d4a";

// V2 request body: accepts documents array with bid_ids
interface DocumentInput {
  bid_id: string;
  pdf_upload_id: string;
}

interface RequestBody {
  projectId: string;
  // V2: documents with pre-created bid_ids
  documents?: DocumentInput[];
  // V1 compat: flat pdfUploadIds (still supported)
  pdfUploadIds?: string[];
  userPriorities: Record<string, number>;
}

// MindPal v2 payload structure
interface MindPalV2Payload {
  data: Record<string, string>;
}

interface DocumentJsonItem {
  bid_id: string;
  doc_url: string;
  mime_type: string;
}

function generateUUID(): string {
  return crypto.randomUUID();
}

async function getSignedUrlForPdf(
  projectId: string,
  pdfUploadId: string
): Promise<{ signedUrl: string; filePath: string }> {
  const { data: pdfUpload, error: pdfError } = await supabaseAdmin
    .from("pdf_uploads")
    .select("file_path, project_id, file_name")
    .eq("id", pdfUploadId)
    .maybeSingle();

  if (pdfError) {
    throw new Error(`PDF query error for ${pdfUploadId}: ${pdfError.message}`);
  }

  if (!pdfUpload) {
    throw new Error(`PDF upload ${pdfUploadId} not found in database`);
  }

  if (pdfUpload.project_id !== projectId) {
    throw new Error(`PDF ${pdfUploadId} belongs to project ${pdfUpload.project_id}, not ${projectId}`);
  }

  // Generate signed URL (1 hour expiry)
  const { data: signedUrlData, error: urlError } = await supabaseAdmin
    .storage
    .from("bid-pdfs")
    .createSignedUrl(pdfUpload.file_path, 3600);

  if (urlError || !signedUrlData?.signedUrl) {
    throw new Error(`Failed to generate signed URL for ${pdfUploadId}`);
  }

  return { signedUrl: signedUrlData.signedUrl, filePath: pdfUpload.file_path };
}

async function callMindPalV2API(payload: MindPalV2Payload): Promise<{
  workflowRunId: string;
}> {
  if (!MINDPAL_API_KEY) {
    throw new Error("MindPal API key not configured");
  }
  if (!WORKFLOW_ID) {
    throw new Error("MindPal workflow ID not configured");
  }

  // v2 API uses query parameter for workflow_id and x-api-key header
  const apiUrl = `${MINDPAL_API_ENDPOINT}?workflow_id=${WORKFLOW_ID}`;

  console.log("MindPal v2 API Request:", {
    url: apiUrl,
    workflow_id: WORKFLOW_ID,
    field_ids: {
      document_urls: DOCUMENT_URLS_FIELD_ID,
      documents_json: DOCUMENTS_JSON_FIELD_ID,
      user_priorities: USER_PRIORITIES_FIELD_ID,
      user_notes: USER_NOTES_FIELD_ID,
      project_id: PROJECT_ID_FIELD_ID,
      callback_url: CALLBACK_URL_FIELD_ID,
      request_id: REQUEST_ID_FIELD_ID,
    },
    payload: JSON.stringify(payload, null, 2),
  });

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "accept": "application/json",
      "x-api-key": MINDPAL_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  console.log("MindPal v2 API Response:", {
    status: response.status,
    statusText: response.statusText,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("MindPal v2 API error:", errorText);
    throw new Error(`MindPal API failed: ${response.status} - ${errorText}`);
  }

  const result = await response.json();

  // v2 response format
  const workflowRunId = result.workflow_run_id || result.data?.workflow_run_id || result.id;

  console.log("✅ MindPal v2 API Success:", {
    workflowRunId,
    full_response: JSON.stringify(result, null, 2),
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
      documentsCount: body.documents?.length,
      pdfUploadIdsCount: body.pdfUploadIds?.length,
      hasUserPriorities: !!body.userPriorities,
      bodyKeys: Object.keys(body),
    }, null, 2));

    const { projectId, userPriorities } = body;

    // Validate inputs
    if (!projectId) {
      return errorResponse("Missing projectId");
    }

    if (!userPriorities || typeof userPriorities !== "object") {
      return errorResponse("Missing or invalid userPriorities");
    }

    // Support both V2 (documents[]) and V1 (pdfUploadIds[]) formats
    const documents: DocumentInput[] = body.documents || [];
    if (documents.length === 0 && body.pdfUploadIds && body.pdfUploadIds.length > 0) {
      // V1 compat: caller only provided pdfUploadIds without bid_ids
      // This path should not be used in production V2 — bids should be pre-created
      console.warn("V1 compat: pdfUploadIds without bid_ids — bids will not be pre-created");
      for (const pdfUploadId of body.pdfUploadIds) {
        documents.push({ bid_id: "", pdf_upload_id: pdfUploadId });
      }
    }

    if (documents.length === 0) {
      return errorResponse("Missing documents or pdfUploadIds array");
    }

    const isOwner = await verifyProjectOwnership(userExtId, projectId);
    if (!isOwner) {
      return errorResponse("Not authorized to access this project", 403);
    }

    const requestId = generateUUID();
    const callbackUrl = `${SUPABASE_URL}/functions/v1/mindpal-callback`;

    // Build documents_json: paired bid_id + signed URL for each PDF
    console.log("Generating signed URLs for", documents.length, "PDFs");
    const documentsArray: DocumentJsonItem[] = [];
    const documentUrls: string[] = [];

    for (const doc of documents) {
      try {
        const { signedUrl, filePath } = await getSignedUrlForPdf(projectId, doc.pdf_upload_id);
        documentUrls.push(signedUrl);

        documentsArray.push({
          bid_id: doc.bid_id,
          doc_url: signedUrl,
          mime_type: "application/pdf",
        });

        // Update bid stub with processing metadata
        if (doc.bid_id) {
          await supabaseAdmin
            .from("bids")
            .update({
              status: "processing",
              request_id: requestId,
              source_doc_url: signedUrl,
              storage_key: filePath,
              updated_at: new Date().toISOString(),
            })
            .eq("id", doc.bid_id);
        }
      } catch (urlError) {
        console.error(`Failed to generate URL for PDF ${doc.pdf_upload_id}:`, urlError);

        // Mark this bid as failed if we can't get the URL
        if (doc.bid_id) {
          await supabaseAdmin
            .from("bids")
            .update({
              status: "failed",
              last_error: `URL generation failed: ${urlError instanceof Error ? urlError.message : String(urlError)}`,
              updated_at: new Date().toISOString(),
            })
            .eq("id", doc.bid_id);
        }

        return errorResponse(`URL generation failed: ${urlError instanceof Error ? urlError.message : String(urlError)}`);
      }
    }

    console.log("Generated", documentUrls.length, "signed URLs");

    // Extract user_notes from userPriorities.project_details if present
    const userNotes = String(userPriorities.project_details || "");

    // Construct v2 payload with field IDs
    const payload: MindPalV2Payload = {
      data: {
        // Keep V1 document_urls for backward compat (flat URL array)
        [DOCUMENT_URLS_FIELD_ID]: JSON.stringify(documentUrls),
        [USER_PRIORITIES_FIELD_ID]: JSON.stringify(userPriorities),
        [USER_NOTES_FIELD_ID]: userNotes,
        [PROJECT_ID_FIELD_ID]: projectId,
        [CALLBACK_URL_FIELD_ID]: callbackUrl,
        [REQUEST_ID_FIELD_ID]: requestId,
      },
    };

    // Add documents_json if we have the field ID configured
    if (DOCUMENTS_JSON_FIELD_ID) {
      payload.data[DOCUMENTS_JSON_FIELD_ID] = JSON.stringify(documentsArray);
    } else {
      // Fallback: overwrite document_urls with the paired format
      // MindPal Parse Documents JSON CODE node will handle either format
      console.warn("DOCUMENTS_JSON_FIELD_ID not configured — using document_urls field for paired format");
      payload.data[DOCUMENT_URLS_FIELD_ID] = JSON.stringify(documentsArray);
    }

    console.log("Calling MindPal v2 API with", documentUrls.length, "documents");

    let mindpalResult: { workflowRunId: string };
    try {
      mindpalResult = await callMindPalV2API(payload);
    } catch (apiError) {
      console.error("MindPal API call failed:", apiError);

      // Mark all bids as failed
      for (const doc of documents) {
        if (doc.bid_id) {
          await supabaseAdmin
            .from("bids")
            .update({
              status: "failed",
              last_error: `MindPal API failed: ${apiError instanceof Error ? apiError.message : String(apiError)}`,
              updated_at: new Date().toISOString(),
            })
            .eq("id", doc.bid_id);
        }
      }

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
    for (const doc of documents) {
      await supabaseAdmin
        .from("pdf_uploads")
        .update({
          status: "processing",
          updated_at: new Date().toISOString(),
        })
        .eq("id", doc.pdf_upload_id);
    }

    return jsonResponse({
      success: true,
      projectId,
      requestId,
      workflowRunId: mindpalResult.workflowRunId,
      callbackUrl,
      pdfCount: documents.length,
      bidIds: documents.map((d) => d.bid_id).filter(Boolean),
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
