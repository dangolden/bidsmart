import { createClient } from "npm:@supabase/supabase-js@2.39.0";
import { corsHeaders } from "../_shared/cors.ts";

const CATEGORY_INFO: Record<string, { label: string; description: string; icon: string }> = {
  pre_installation: {
    label: 'Pre-Installation',
    description: 'Verify these items before work begins',
    icon: '📋',
  },
  equipment: {
    label: 'Equipment Verification',
    description: 'Confirm the right equipment was delivered and installed',
    icon: '🔧',
  },
  airflow: {
    label: 'Airflow',
    description: 'Proper airflow is critical for efficiency and comfort',
    icon: '💨',
  },
  refrigerant: {
    label: 'Refrigerant',
    description: 'Correct refrigerant charge affects efficiency and equipment life',
    icon: '❄️',
  },
  electrical: {
    label: 'Electrical',
    description: 'Safe and proper electrical connections',
    icon: '⚡',
  },
  commissioning: {
    label: 'Commissioning & Closeout',
    description: 'Final steps to ensure everything is documented',
    icon: '✅',
  },
};

interface ChecklistItem {
  id: string;
  category: string;
  item_text: string;
  description: string | null;
  why_it_matters: string | null;
  is_critical: boolean;
  display_order: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const projectId = url.searchParams.get("project_id");

    if (!projectId) {
      return new Response(
        JSON.stringify({ error: "project_id is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: project } = await supabase
      .from("projects")
      .select("*, users_ext(*), contractor_bids!projects_selected_bid_id_fkey(*)")
      .eq("id", projectId)
      .single();

    const { data: items } = await supabase
      .from("qii_checklist_items")
      .select("*")
      .order("display_order", { ascending: true });

    if (!items || items.length === 0) {
      return new Response(
        JSON.stringify({ error: "No checklist items found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const groupedItems: Record<string, ChecklistItem[]> = {};
    items.forEach((item: ChecklistItem) => {
      if (!groupedItems[item.category]) {
        groupedItems[item.category] = [];
      }
      groupedItems[item.category].push(item);
    });

    const html = generateChecklistHTML(project, groupedItems);

    return new Response(html, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="contractor-checklist-${projectId}.html"`,
      },
    });
  } catch (error) {
    console.error("Error generating checklist:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function generateChecklistHTML(project: any, groupedItems: Record<string, ChecklistItem[]>): string {
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const homeownerName = project?.users_ext?.full_name || 'Homeowner';
  const propertyAddress = project?.users_ext?.property_address || 'N/A';
  const propertyCity = project?.users_ext?.property_city || '';
  const propertyState = project?.users_ext?.property_state || '';
  const propertyZip = project?.users_ext?.property_zip || '';
  const contractorName = project?.contractor_bids?.contractor_name || 'Contractor';
  const contractorCompany = project?.contractor_bids?.contractor_company || '';
  const projectName = project?.project_name || 'Heat Pump Installation';

  const fullAddress = [propertyAddress, propertyCity, propertyState, propertyZip].filter(Boolean).join(', ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Heat Pump Installation Quality Checklist - TheSwitchIsOn.org</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.5;
      color: #1a1a1a;
      max-width: 8.5in;
      margin: 0 auto;
      padding: 0.5in;
      background: white;
    }

    @media print {
      body {
        padding: 0.25in;
      }
      .page-break {
        page-break-before: always;
      }
      .no-print {
        display: none;
      }
    }

    .header {
      text-align: center;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 3px solid #10b981;
    }

    .logo-text {
      font-size: 20pt;
      font-weight: bold;
      color: #10b981;
      margin-bottom: 4px;
    }

    .tagline {
      font-size: 10pt;
      color: #666;
      font-style: italic;
    }

    h1 {
      font-size: 18pt;
      margin: 16px 0 8px 0;
      color: #1a1a1a;
    }

    .project-info {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 24px;
    }

    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-top: 12px;
    }

    .info-item {
      display: flex;
      flex-direction: column;
    }

    .info-label {
      font-size: 9pt;
      color: #6b7280;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
    }

    .info-value {
      font-size: 11pt;
      color: #1a1a1a;
      font-weight: 500;
    }

    .intro {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 16px;
      margin-bottom: 24px;
      font-size: 10pt;
      line-height: 1.6;
    }

    .intro strong {
      color: #92400e;
    }

    .category {
      margin-bottom: 24px;
      page-break-inside: avoid;
    }

    .category-header {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      padding: 12px 16px;
      border-radius: 8px 8px 0 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .category-icon {
      font-size: 18pt;
    }

    .category-title {
      font-size: 13pt;
      font-weight: bold;
      flex: 1;
    }

    .category-desc {
      font-size: 9pt;
      opacity: 0.95;
      font-weight: normal;
      margin-top: 2px;
    }

    .items-container {
      border: 1px solid #e5e7eb;
      border-top: none;
      border-radius: 0 0 8px 8px;
    }

    .checklist-item {
      padding: 12px 16px;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      gap: 12px;
      align-items: flex-start;
    }

    .checklist-item:last-child {
      border-bottom: none;
    }

    .checklist-item.critical {
      background: #fef2f2;
      border-left: 3px solid #ef4444;
    }

    .checkbox {
      width: 18px;
      height: 18px;
      border: 2px solid #6b7280;
      border-radius: 3px;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .item-content {
      flex: 1;
    }

    .item-text {
      font-size: 10.5pt;
      font-weight: 600;
      color: #1a1a1a;
      margin-bottom: 4px;
    }

    .critical-badge {
      display: inline-block;
      background: #dc2626;
      color: white;
      font-size: 7pt;
      font-weight: bold;
      padding: 2px 6px;
      border-radius: 3px;
      text-transform: uppercase;
      margin-left: 8px;
      letter-spacing: 0.5px;
    }

    .item-description {
      font-size: 9pt;
      color: #4b5563;
      margin-top: 4px;
      line-height: 1.5;
    }

    .item-why {
      background: #eff6ff;
      border-left: 3px solid #3b82f6;
      padding: 8px 10px;
      margin-top: 6px;
      font-size: 8.5pt;
      color: #1e3a8a;
      line-height: 1.5;
    }

    .item-why strong {
      font-weight: 700;
    }

    .contractor-notes {
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px dashed #d1d5db;
    }

    .notes-label {
      font-size: 8pt;
      color: #6b7280;
      font-weight: 600;
      margin-bottom: 4px;
    }

    .notes-lines {
      border-bottom: 1px solid #d1d5db;
      height: 16px;
    }

    .signature-section {
      margin-top: 32px;
      padding-top: 24px;
      border-top: 2px solid #e5e7eb;
    }

    .signature-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 32px;
      margin-top: 16px;
    }

    .signature-box {
      border: 1px solid #d1d5db;
      border-radius: 8px;
      padding: 16px;
      background: #fafafa;
    }

    .signature-label {
      font-size: 10pt;
      font-weight: 600;
      color: #374151;
      margin-bottom: 12px;
    }

    .signature-line {
      border-bottom: 2px solid #1a1a1a;
      margin: 24px 0 8px 0;
    }

    .signature-text {
      font-size: 8pt;
      color: #6b7280;
    }

    .footer {
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      font-size: 8pt;
      color: #6b7280;
    }

    .print-button {
      position: fixed;
      top: 20px;
      right: 20px;
      background: #10b981;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 11pt;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      z-index: 1000;
    }

    .print-button:hover {
      background: #059669;
    }
  </style>
</head>
<body>
  <button class="print-button no-print" onclick="window.print()">🖨️ Print Checklist</button>

  <div class="header">
    <div class="logo-text">TheSwitchIsOn.org</div>
    <div class="tagline">Quality Heat Pump Installation Standards</div>
  </div>

  <h1>Heat Pump Installation Quality Checklist</h1>

  <div class="project-info">
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Project Name</div>
        <div class="info-value">${projectName}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Date Issued</div>
        <div class="info-value">${today}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Property Address</div>
        <div class="info-value">${fullAddress}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Homeowner</div>
        <div class="info-value">${homeownerName}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Contractor</div>
        <div class="info-value">${contractorName}${contractorCompany ? ` (${contractorCompany})` : ''}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Project Reference</div>
        <div class="info-value">#${projectId.substring(0, 8).toUpperCase()}</div>
      </div>
    </div>
  </div>

  <div class="intro">
    <strong>For the Contractor:</strong> This checklist outlines quality installation standards based on ACCA/ANSI guidelines.
    Please complete each item during installation and provide notes where applicable. Check each box as items are completed
    and add any relevant information (model numbers, measurements, etc.) in the notes sections. Upon completion, sign and
    return this checklist to the homeowner along with any required documentation.
  </div>

  ${Object.keys(CATEGORY_INFO).map(categoryKey => {
    const category = CATEGORY_INFO[categoryKey];
    const items = groupedItems[categoryKey] || [];

    if (items.length === 0) return '';

    return `
      <div class="category">
        <div class="category-header">
          <span class="category-icon">${category.icon}</span>
          <div class="category-title">
            ${category.label}
            <div class="category-desc">${category.description}</div>
          </div>
        </div>
        <div class="items-container">
          ${items.map(item => `
            <div class="checklist-item ${item.is_critical ? 'critical' : ''}">
              <div class="checkbox"></div>
              <div class="item-content">
                <div class="item-text">
                  ${item.item_text}
                  ${item.is_critical ? '<span class="critical-badge">Critical</span>' : ''}
                </div>
                ${item.description ? `<div class="item-description">${item.description}</div>` : ''}
                ${item.why_it_matters ? `<div class="item-why"><strong>Why it matters:</strong> ${item.why_it_matters}</div>` : ''}
                <div class="contractor-notes">
                  <div class="notes-label">CONTRACTOR NOTES / MEASUREMENTS:</div>
                  <div class="notes-lines"></div>
                  <div class="notes-lines"></div>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }).join('')}

  <div class="signature-section">
    <h2 style="font-size: 14pt; margin-bottom: 8px;">Installation Completion Certification</h2>
    <p style="font-size: 9pt; color: #4b5563; margin-bottom: 16px;">
      By signing below, the contractor certifies that all checked items have been completed according to
      industry standards and manufacturer specifications.
    </p>

    <div class="signature-grid">
      <div class="signature-box">
        <div class="signature-label">Contractor Signature</div>
        <div class="signature-line"></div>
        <div class="signature-text">Print Name: _________________________</div>
        <div class="signature-text" style="margin-top: 8px;">Date: _________________________</div>
        <div class="signature-text" style="margin-top: 8px;">License #: _________________________</div>
      </div>

      <div class="signature-box">
        <div class="signature-label">Homeowner Acceptance</div>
        <div class="signature-line"></div>
        <div class="signature-text">Print Name: _________________________</div>
        <div class="signature-text" style="margin-top: 8px;">Date: _________________________</div>
        <div class="signature-text" style="margin-top: 8px;">Final Payment Released: ☐ Yes ☐ No</div>
      </div>
    </div>
  </div>

  <div class="footer">
    <p><strong>TheSwitchIsOn.org</strong> - Helping homeowners make informed decisions about heat pump installations</p>
    <p style="margin-top: 8px;">For questions about this checklist, visit www.TheSwitchIsOn.org or email support@theswitchison.org</p>
    <p style="margin-top: 8px; font-size: 7pt;">Generated: ${today} | Project ID: ${projectId}</p>
  </div>
</body>
</html>`;
}
