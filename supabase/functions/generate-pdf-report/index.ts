import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { verifyEmailAuth } from "../_shared/auth.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

interface GenerateReportRequest {
  project_id: string;
  send_email?: boolean;
}

interface ProjectData {
  project: Record<string, unknown>;
  bids: Array<Record<string, unknown>>;
  requirements: Record<string, unknown> | null;
  user: Record<string, unknown>;
}

async function fetchProjectData(projectId: string): Promise<ProjectData> {
  const { data: project, error: projectError } = await supabaseAdmin
    .from("projects")
    .select(`
      *,
      users_ext!inner(*)
    `)
    .eq("id", projectId)
    .maybeSingle();

  if (projectError || !project) {
    throw new Error("Project not found");
  }

  const { data: bids, error: bidsError } = await supabaseAdmin
    .from("contractor_bids")
    .select(`
      *,
      bid_equipment(*),
      bid_line_items(*)
    `)
    .eq("project_id", projectId)
    .order("total_bid_amount", { ascending: true });

  if (bidsError) {
    throw new Error("Failed to fetch bids");
  }

  const { data: requirements } = await supabaseAdmin
    .from("project_requirements")
    .select("*")
    .eq("project_id", projectId)
    .maybeSingle();

  return {
    project,
    bids: bids || [],
    requirements,
    user: project.users_ext,
  };
}

function generateHTMLReport(data: ProjectData): string {
  const { project, bids, requirements, user } = data;
  const projectName = project.project_name as string || "My Heat Pump Project";
  const userName = (user.full_name as string) || (user.email as string) || "Homeowner";

  const formatCurrency = (val: unknown): string => {
    if (val === null || val === undefined) return "N/A";
    return `$${Number(val).toLocaleString()}`;
  };

  const formatPriority = (val: unknown): string => {
    if (val === null || val === undefined) return "N/A";
    const num = Number(val);
    return `${num}/5`;
  };

  const bidRows = bids.map((bid, idx) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${idx + 1}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${bid.contractor_name || "Unknown"}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${formatCurrency(bid.total_bid_amount)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${bid.equipment_warranty_years || "N/A"} years</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${bid.estimated_days || "N/A"} days</td>
    </tr>
  `).join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${projectName} - BidSmart Report</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    h1 {
      color: #16a34a;
      font-size: 28px;
      margin-bottom: 8px;
    }
    h2 {
      color: #16a34a;
      font-size: 20px;
      margin-top: 32px;
      margin-bottom: 16px;
      border-bottom: 2px solid #16a34a;
      padding-bottom: 8px;
    }
    h3 {
      color: #374151;
      font-size: 16px;
      margin-top: 24px;
      margin-bottom: 12px;
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 3px solid #16a34a;
    }
    .subtitle {
      color: #6b7280;
      font-size: 14px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      background: white;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    th {
      background: #f3f4f6;
      padding: 12px;
      text-align: left;
      font-weight: 600;
      border-bottom: 2px solid #e5e7eb;
    }
    td {
      padding: 12px;
      border-bottom: 1px solid #e5e7eb;
    }
    .priority-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin: 20px 0;
    }
    .priority-item {
      background: #f9fafb;
      padding: 12px;
      border-radius: 8px;
    }
    .priority-label {
      font-weight: 600;
      color: #374151;
      margin-bottom: 4px;
    }
    .priority-value {
      color: #16a34a;
      font-size: 18px;
      font-weight: 700;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      color: #6b7280;
      font-size: 12px;
    }
    .summary-box {
      background: #f0fdf4;
      border-left: 4px solid #16a34a;
      padding: 16px;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${projectName}</h1>
    <p class="subtitle">Heat Pump Bid Analysis Report</p>
    <p class="subtitle">Generated ${new Date().toLocaleDateString()} for ${userName}</p>
  </div>

  <div class="summary-box">
    <strong>Report Summary:</strong> This report compares ${bids.length} contractor bids for your heat pump installation project.
  </div>

  <h2>Your Priorities</h2>
  ${requirements ? `
  <div class="priority-grid">
    <div class="priority-item">
      <div class="priority-label">Upfront Cost</div>
      <div class="priority-value">${formatPriority(requirements.priority_price)}</div>
    </div>
    <div class="priority-item">
      <div class="priority-label">Energy Efficiency</div>
      <div class="priority-value">${formatPriority(requirements.priority_efficiency)}</div>
    </div>
    <div class="priority-item">
      <div class="priority-label">Warranty Length</div>
      <div class="priority-value">${formatPriority(requirements.priority_warranty)}</div>
    </div>
    <div class="priority-item">
      <div class="priority-label">Contractor Reputation</div>
      <div class="priority-value">${formatPriority(requirements.priority_reputation)}</div>
    </div>
    <div class="priority-item">
      <div class="priority-label">Installation Timeline</div>
      <div class="priority-value">${formatPriority(requirements.priority_timeline)}</div>
    </div>
  </div>
  ` : "<p>No priorities set</p>"}

  <h2>Bid Comparison</h2>
  ${bids.length > 0 ? `
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Contractor</th>
        <th>Total Cost</th>
        <th>Warranty</th>
        <th>Timeline</th>
      </tr>
    </thead>
    <tbody>
      ${bidRows}
    </tbody>
  </table>
  ` : "<p>No bids available</p>"}

  <h2>Next Steps</h2>
  <ol>
    <li>Review the detailed comparison in BidSmart</li>
    <li>Ask contractors any outstanding questions</li>
    <li>Consider financing options if needed</li>
    <li>Make your final decision</li>
  </ol>

  <div class="footer">
    <p>Generated by BidSmart - A project of TheSwitchIsOn.org</p>
    <p>Helping homeowners make informed decisions about heat pumps</p>
  </div>
</body>
</html>
  `;
}

async function sendReportEmail(
  email: string,
  projectName: string,
  htmlContent: string
): Promise<{ success: boolean; error?: string }> {
  if (!RESEND_API_KEY) {
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
      to: [email],
      subject: `Your ${projectName} Analysis Report`,
      html: htmlContent,
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

    const authResult = await verifyEmailAuth(req);
    if (authResult instanceof Response) {
      console.error("Authentication failed");
      return authResult;
    }

    console.log("Authenticated user:", authResult.email);

    const { project_id, send_email }: GenerateReportRequest = await req.json();

    if (!project_id) {
      return errorResponse("Missing project_id");
    }

    console.log("Generating report for project:", project_id, "send_email:", send_email);

    const projectData = await fetchProjectData(project_id);
    const htmlReport = generateHTMLReport(projectData);

    if (send_email) {
      const userEmail = (projectData.user.email as string) || authResult.email;
      const projectName = (projectData.project.project_name as string) || "Your Heat Pump Project";

      const emailResult = await sendReportEmail(userEmail, projectName, htmlReport);

      if (!emailResult.success) {
        return errorResponse(emailResult.error || "Failed to send email", 500);
      }

      return jsonResponse({
        success: true,
        message: "Report sent successfully",
        email: userEmail,
      });
    }

    return new Response(htmlReport, {
      headers: {
        "Content-Type": "text/html",
        "Content-Disposition": `attachment; filename="bidsmart-report-${project_id}.html"`,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, X-User-Email",
      },
    });

  } catch (error) {
    console.error("Error in generate-pdf-report:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Internal server error",
      500
    );
  }
});
