import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const APP_URL = Deno.env.get("APP_URL") || "https://bidsmart.theswitchison.org";

interface NotificationRequest {
  project_id: string;
}

async function sendEmailViaResend(
  to: string,
  projectName: string,
  projectId: string
): Promise<{ success: boolean; error?: string }> {
  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY not configured");
    return { success: false, error: "Email service not configured" };
  }

  const lookupUrl = `${APP_URL}`;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "BidSmart <bidsmart@theswitchison.org>",
      to: [to],
      subject: "Your Heat Pump Bid Analysis is Ready",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #16a34a; margin: 0; font-size: 24px;">Your Analysis is Ready!</h1>
          </div>

          <p style="margin-bottom: 20px;">Good news! The analysis for <strong>${projectName}</strong> is complete and ready for you to review.</p>

          <p style="margin-bottom: 20px;">Our AI has extracted and compared the data from your contractor bids. You can now:</p>

          <ul style="margin-bottom: 30px; padding-left: 20px;">
            <li>Compare pricing, warranties, and equipment across all bids</li>
            <li>See which contractor offers the best value for your priorities</li>
            <li>Review questions to ask each contractor</li>
          </ul>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${lookupUrl}" style="display: inline-block; background-color: #16a34a; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">View Your Analysis</a>
          </div>

          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            When you visit BidSmart, use the "Find My Analysis" button and enter this email address to access your results.
          </p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

          <p style="color: #999; font-size: 12px; text-align: center;">
            This email was sent by BidSmart, a project of TheSwitchIsOn.org<br>
            Helping homeowners make informed decisions about heat pumps.
          </p>
        </body>
        </html>
      `,
      text: `Your Heat Pump Bid Analysis is Ready!

Good news! The analysis for "${projectName}" is complete and ready for you to review.

Our AI has extracted and compared the data from your contractor bids. You can now:
- Compare pricing, warranties, and equipment across all bids
- See which contractor offers the best value for your priorities
- Review questions to ask each contractor

View your analysis at: ${lookupUrl}

When you visit BidSmart, use the "Find My Analysis" button and enter this email address to access your results.

---
This email was sent by BidSmart, a project of TheSwitchIsOn.org
Helping homeowners make informed decisions about heat pumps.
      `,
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error("Resend API error:", errorData);
    return { success: false, error: `Failed to send email: ${response.status}` };
  }

  return { success: true };
}

Deno.serve(async (req: Request) => {
  try {
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    if (req.method !== "POST") {
      return errorResponse("Method not allowed", 405);
    }

    const { project_id }: NotificationRequest = await req.json();

    if (!project_id) {
      return errorResponse("Missing project_id");
    }

    const { data: project, error: projectError } = await supabaseAdmin
      .from("projects")
      .select("*")
      .eq("id", project_id)
      .maybeSingle();

    if (projectError || !project) {
      console.error("Project not found:", project_id);
      return errorResponse("Project not found", 404);
    }

    if (!project.notify_on_completion) {
      return jsonResponse({
        success: true,
        skipped: true,
        reason: "User did not opt in for notifications"
      });
    }

    if (!project.notification_email) {
      return jsonResponse({
        success: true,
        skipped: true,
        reason: "No notification email provided"
      });
    }

    if (project.notification_sent_at) {
      return jsonResponse({
        success: true,
        skipped: true,
        reason: "Notification already sent"
      });
    }

    const emailResult = await sendEmailViaResend(
      project.notification_email,
      project.project_name,
      project.id
    );

    if (!emailResult.success) {
      console.error("Failed to send notification email:", emailResult.error);
      return errorResponse(emailResult.error || "Failed to send email", 500);
    }

    await supabaseAdmin
      .from("projects")
      .update({
        notification_sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", project_id);

    return jsonResponse({
      success: true,
      message: "Notification sent successfully",
      email: project.notification_email,
    });

  } catch (error) {
    console.error("Error in send-completion-notification:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Internal server error",
      500
    );
  }
});
