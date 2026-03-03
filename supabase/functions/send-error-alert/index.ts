import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const ADMIN_ALERT_EMAIL = Deno.env.get("ADMIN_ALERT_EMAIL") || "dangolden@pandotic.ai";
const APP_URL = Deno.env.get("APP_URL") || "https://bidsmart.theswitchison.org";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";

interface ErrorAlertRequest {
  project_id: string | null;
  error_type: "workflow_failure" | "bid_processing_error" | "internal_error";
  error_details: string;
  failed_bid_ids: string[];
}

/**
 * Send an email via Resend
 */
async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text: string
): Promise<{ success: boolean; error?: string }> {
  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY not configured");
    return { success: false, error: "Email service not configured" };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "BidSmart <bidsmart@theswitchison.org>",
      to: [to],
      subject,
      html,
      text,
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error("Resend API error:", errorData);
    return { success: false, error: `Failed to send email: ${response.status}` };
  }

  return { success: true };
}

/**
 * Build admin alert email HTML
 */
function buildAdminEmailHtml(
  projectName: string,
  projectId: string | null,
  userEmail: string | null,
  errorType: string,
  errorDetails: string,
  failedBidIds: string[],
  bidErrors: Array<{ id: string; contractor_name: string | null; last_error: string | null }>
): string {
  const supabaseDashboardUrl = SUPABASE_URL
    ? `${SUPABASE_URL.replace('.supabase.co', '')}`
    : "";

  const timestamp = new Date().toISOString();

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
        <h1 style="color: #dc2626; margin: 0 0 8px 0; font-size: 20px;">⚠️ BidSmart Analysis Failed</h1>
        <p style="color: #991b1b; margin: 0; font-size: 14px;">Error Type: <strong>${errorType}</strong></p>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <tr>
          <td style="padding: 8px 12px; background: #f9fafb; border: 1px solid #e5e7eb; font-weight: 600; width: 140px;">Project</td>
          <td style="padding: 8px 12px; border: 1px solid #e5e7eb;">${projectName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 12px; background: #f9fafb; border: 1px solid #e5e7eb; font-weight: 600;">Project ID</td>
          <td style="padding: 8px 12px; border: 1px solid #e5e7eb; font-family: monospace; font-size: 12px;">${projectId || "unknown"}</td>
        </tr>
        <tr>
          <td style="padding: 8px 12px; background: #f9fafb; border: 1px solid #e5e7eb; font-weight: 600;">User Email</td>
          <td style="padding: 8px 12px; border: 1px solid #e5e7eb;">${userEmail || "not provided"}</td>
        </tr>
        <tr>
          <td style="padding: 8px 12px; background: #f9fafb; border: 1px solid #e5e7eb; font-weight: 600;">Timestamp</td>
          <td style="padding: 8px 12px; border: 1px solid #e5e7eb;">${timestamp}</td>
        </tr>
      </table>

      <div style="background-color: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
        <h3 style="color: #9a3412; margin: 0 0 8px 0; font-size: 14px;">Error Details</h3>
        <p style="color: #7c2d12; margin: 0; font-size: 13px; white-space: pre-wrap;">${errorDetails}</p>
      </div>

      ${failedBidIds.length > 0 ? `
        <div style="margin-bottom: 20px;">
          <h3 style="margin: 0 0 12px 0; font-size: 14px; color: #374151;">Failed Bids (${failedBidIds.length})</h3>
          ${bidErrors.map((bid) => `
            <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; margin-bottom: 8px;">
              <div style="font-weight: 600; font-size: 13px;">${bid.contractor_name || "Unknown Contractor"}</div>
              <div style="font-family: monospace; font-size: 11px; color: #6b7280; margin-top: 4px;">ID: ${bid.id}</div>
              ${bid.last_error ? `<div style="color: #dc2626; font-size: 12px; margin-top: 4px;">Error: ${bid.last_error}</div>` : ""}
            </div>
          `).join("")}
        </div>
      ` : ""}

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">

      <p style="color: #9ca3af; font-size: 11px; text-align: center;">
        BidSmart Admin Alert — ${timestamp}
      </p>
    </body>
    </html>
  `;
}

/**
 * Build user reassurance email HTML
 */
function buildUserEmailHtml(projectName: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #16a34a; margin: 0; font-size: 24px;">We're Working On It</h1>
      </div>

      <p style="margin-bottom: 20px;">
        Hi! We hit a snag analyzing your bids for <strong>"${projectName}"</strong>.
      </p>

      <p style="margin-bottom: 20px;">
        We're automatically retrying the analysis — you'll receive an email as soon as your results are ready. <strong>No action needed on your end.</strong>
      </p>

      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 24px 0;">
        <p style="color: #166534; margin: 0; font-size: 14px;">
          💡 Most issues resolve automatically within a few hours. We'll email you when your analysis is complete.
        </p>
      </div>

      <p style="color: #666; font-size: 14px; margin-top: 30px;">
        If you have questions or need help, contact us at <a href="mailto:support@theswitchison.org" style="color: #16a34a;">support@theswitchison.org</a>
      </p>

      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

      <p style="color: #999; font-size: 12px; text-align: center;">
        This email was sent by BidSmart, a project of TheSwitchIsOn.org<br>
        Helping homeowners make informed decisions about heat pumps.
      </p>
    </body>
    </html>
  `;
}

Deno.serve(async (req: Request) => {
  try {
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    if (req.method !== "POST") {
      return errorResponse("Method not allowed", 405);
    }

    const { project_id, error_type, error_details, failed_bid_ids }: ErrorAlertRequest = await req.json();

    if (!error_type || !error_details) {
      return errorResponse("Missing required fields: error_type, error_details");
    }

    // Fetch project info if we have a project_id
    let project: Record<string, unknown> | null = null;
    if (project_id) {
      const { data } = await supabaseAdmin
        .from("projects")
        .select("id, project_name, notification_email, notify_on_completion, error_notification_sent_at")
        .eq("id", project_id)
        .maybeSingle();
      project = data;
    }

    const projectName = (project?.project_name as string) || "Unknown Project";
    const userEmail = (project?.notification_email as string) || null;

    // Fetch failed bid details for admin email
    let bidErrors: Array<{ id: string; contractor_name: string | null; last_error: string | null }> = [];
    if (failed_bid_ids && failed_bid_ids.length > 0) {
      const { data: bids } = await supabaseAdmin
        .from("bids")
        .select("id, contractor_name, last_error")
        .in("id", failed_bid_ids);
      bidErrors = (bids || []) as typeof bidErrors;
    }

    const results: { admin: boolean; user: boolean } = { admin: false, user: false };

    // ---- EMAIL 1: Admin Alert (always sent) ----
    const adminHtml = buildAdminEmailHtml(
      projectName,
      project_id,
      userEmail,
      error_type,
      error_details,
      failed_bid_ids || [],
      bidErrors
    );

    const adminText = `[BidSmart Alert] Analysis failed: ${projectName}
Error Type: ${error_type}
Project ID: ${project_id || "unknown"}
User Email: ${userEmail || "not provided"}
Error: ${error_details}
Failed Bids: ${failed_bid_ids?.join(", ") || "none"}
Timestamp: ${new Date().toISOString()}`;

    const adminResult = await sendEmail(
      ADMIN_ALERT_EMAIL,
      `[BidSmart Alert] Analysis failed: ${projectName}`,
      adminHtml,
      adminText
    );
    results.admin = adminResult.success;

    if (!adminResult.success) {
      console.error("Failed to send admin alert:", adminResult.error);
    }

    // ---- EMAIL 2: User Reassurance (opt-in only, idempotent) ----
    if (
      project &&
      project.notify_on_completion &&
      userEmail &&
      !project.error_notification_sent_at // Idempotency: only send once
    ) {
      const userHtml = buildUserEmailHtml(projectName);
      const userText = `We're Working On It

Hi! We hit a snag analyzing your bids for "${projectName}".

We're automatically retrying the analysis — you'll receive an email as soon as your results are ready. No action needed on your end.

Most issues resolve automatically within a few hours. We'll email you when your analysis is complete.

If you have questions, contact us at support@theswitchison.org

---
This email was sent by BidSmart, a project of TheSwitchIsOn.org`;

      const userResult = await sendEmail(
        userEmail,
        "We're working on your bid analysis",
        userHtml,
        userText
      );
      results.user = userResult.success;

      if (userResult.success && project_id) {
        // Mark that we've sent the error notification (idempotency)
        await supabaseAdmin
          .from("projects")
          .update({
            error_notification_sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", project_id);
      }

      if (!userResult.success) {
        console.error("Failed to send user reassurance email:", userResult.error);
      }
    }

    return jsonResponse({
      success: true,
      admin_email_sent: results.admin,
      user_email_sent: results.user,
      project_id,
      error_type,
    });

  } catch (error) {
    console.error("Error in send-error-alert:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Internal server error",
      500
    );
  }
});
