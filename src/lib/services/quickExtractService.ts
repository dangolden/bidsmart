import { getAuthHeaders as getParentAuthHeaders } from '../parentAuth';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export interface QuickExtractResult {
  success: boolean;
  bid_id: string;
  extracted: {
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
  };
  elapsed_ms: number;
}

/**
 * Calls the quick-extract Edge Function to extract contractor identity
 * from a bid PDF using Gemini 2.0 Flash. Non-blocking — designed to be
 * called fire-and-forget after each PDF upload.
 */
export async function quickExtractContractorInfo(
  bidId: string,
  pdfUploadId: string,
  projectId: string,
  userEmail: string
): Promise<QuickExtractResult | null> {
  try {
    const authHeaders = getParentAuthHeaders(userEmail);

    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/quick-extract`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
          ...authHeaders,
        },
        body: JSON.stringify({
          bid_id: bidId,
          pdf_upload_id: pdfUploadId,
          project_id: projectId,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`Quick-extract failed (${response.status}):`, errorText);
      return null;
    }

    const result: QuickExtractResult = await response.json();
    return result;
  } catch (error) {
    console.warn('Quick-extract error (non-critical):', error);
    return null;
  }
}
