import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { verifyEmailAuth, verifyProjectOwnership } from "../_shared/auth.ts";

/**
 * Quick-Extract Edge Function (V4)
 *
 * Extracts contractor identity from an HVAC bid PDF using Gemini 2.0 Flash.
 * Runs immediately after upload (before MindPal), updating bids.contractor_name
 * from 'TBD' to the extracted name within 3-5 seconds.
 *
 * Sends the ENTIRE PDF (not just page 1) because contractor info can appear
 * on any page — letterhead, cover letter, signature block, or license appendix.
 */

const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const EXTRACTION_PROMPT = `You are extracting contractor/company identity information from an HVAC bid/proposal document.

Search the ENTIRE document — check letterhead, headers, cover pages, signature blocks, license pages, and footers.

Extract ONLY these fields. Return JSON with exactly these keys:
- contractor_name: the company/business name (not the individual's name unless sole proprietor)
- company: full legal business name if different from contractor_name
- phone: primary phone number
- email: primary email address
- website: company website URL
- license_number: contractor license number (e.g., CSLB# in California)
- license_state: state of license (e.g., "CA")
- address_street: contractor's business street address
- address_city: contractor's business city
- address_state: contractor's business state
- address_zip: contractor's business zip code
- property_city: the property/job site city if different from contractor address
- property_state: the property/job site state
- property_zip: the property/job site zip code
- contact_person: individual name of the salesperson/estimator if present

Rules:
- Return null for any field not found with high confidence. Do NOT guess or infer.
- If you find the same company name in multiple places (header + signature), that increases confidence.
- Return raw JSON only, no markdown wrapping.`;

interface RequestBody {
  bid_id: string;
  pdf_upload_id: string;
  project_id: string;
}

interface ExtractedData {
  contractor_name: string | null;
  company: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  license_number: string | null;
  license_state: string | null;
  address_street: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
  property_city: string | null;
  property_state: string | null;
  property_zip: string | null;
  contact_person: string | null;
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
    throw new Error(
      `PDF ${pdfUploadId} belongs to project ${pdfUpload.project_id}, not ${projectId}`
    );
  }

  const { data: signedUrlData, error: urlError } = await supabaseAdmin.storage
    .from("bid-pdfs")
    .createSignedUrl(pdfUpload.file_path, 3600);

  if (urlError || !signedUrlData?.signedUrl) {
    throw new Error(`Failed to generate signed URL for ${pdfUploadId}`);
  }

  return { signedUrl: signedUrlData.signedUrl, filePath: pdfUpload.file_path };
}

async function callGeminiWithPdf(
  signedUrl: string
): Promise<ExtractedData> {
  if (!GOOGLE_AI_API_KEY) {
    throw new Error("GOOGLE_AI_API_KEY not configured");
  }

  // Download the PDF content and convert to base64
  // Gemini's fileData with URL only works with Google Cloud Storage URIs,
  // so we fetch the PDF and send it inline as base64
  const pdfResponse = await fetch(signedUrl);
  if (!pdfResponse.ok) {
    throw new Error(`Failed to fetch PDF: ${pdfResponse.status} ${pdfResponse.statusText}`);
  }
  const pdfBuffer = await pdfResponse.arrayBuffer();
  const pdfBase64 = btoa(
    new Uint8Array(pdfBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
  );

  const requestBody = {
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType: "application/pdf",
              data: pdfBase64,
            },
          },
          {
            text: EXTRACTION_PROMPT,
          },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.1,
    },
  };

  const response = await fetch(`${GEMINI_API_URL}?key=${GOOGLE_AI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();

  // Extract the JSON response from Gemini's response structure
  const textContent =
    result.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textContent) {
    throw new Error("No text content in Gemini response");
  }

  // Parse the JSON — Gemini with responseMimeType should return clean JSON
  // but strip markdown wrappers just in case
  let jsonStr = textContent.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  const extracted: ExtractedData = JSON.parse(jsonStr);
  return extracted;
}

Deno.serve(async (req: Request) => {
  try {
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    if (req.method !== "POST") {
      return errorResponse("Method not allowed", 405, req);
    }

    const authResult = await verifyEmailAuth(req);
    if (authResult instanceof Response) {
      return authResult;
    }
    const { userExtId } = authResult;

    const body: RequestBody = await req.json();
    const { bid_id, pdf_upload_id, project_id } = body;

    if (!bid_id || !pdf_upload_id || !project_id) {
      return errorResponse(
        "Missing required fields: bid_id, pdf_upload_id, project_id",
        400,
        req
      );
    }

    const isOwner = await verifyProjectOwnership(userExtId, project_id);
    if (!isOwner) {
      return errorResponse("Not authorized to access this project", 403, req);
    }

    const startTime = Date.now();

    // 1. Get signed URL for the PDF
    const { signedUrl } = await getSignedUrlForPdf(project_id, pdf_upload_id);

    // 2. Call Gemini 2.0 Flash with the full PDF
    const extracted = await callGeminiWithPdf(signedUrl);

    const elapsedMs = Date.now() - startTime;
    console.log(
      `Quick-extract completed for bid ${bid_id}: contractor="${extracted.contractor_name}" in ${elapsedMs}ms`
    );

    // 3. Update bid stub with extracted contractor name
    if (extracted.contractor_name) {
      const { error: updateError } = await supabaseAdmin
        .from("bids")
        .update({
          contractor_name: extracted.contractor_name,
          updated_at: new Date().toISOString(),
        })
        .eq("id", bid_id);

      if (updateError) {
        console.error(
          `Failed to update bid ${bid_id} contractor_name:`,
          updateError
        );
      }
    }

    return jsonResponse(
      {
        success: true,
        bid_id,
        extracted,
        elapsed_ms: elapsedMs,
      },
      200,
      req
    );
  } catch (error) {
    console.error("Error in quick-extract:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Internal server error",
      500,
      req
    );
  }
});
