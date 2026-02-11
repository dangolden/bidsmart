import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Super admin emails allowed to perform cleanup
const SUPER_ADMIN_EMAILS = [
  "dan@theswitchison.org",
  "admin@theswitchison.org",
];

interface CleanupRequest {
  action: "list_projects" | "delete_project" | "delete_projects_batch" | "list_failed";
  projectIds?: string[];
  projectId?: string;
  userEmail: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: CleanupRequest = await req.json();
    const { action, projectIds, projectId, userEmail } = body;

    // Verify super admin
    if (!userEmail || !SUPER_ADMIN_EMAILS.includes(userEmail.toLowerCase())) {
      return new Response(
        JSON.stringify({ error: "Unauthorized. Super admin access required." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // List all projects with their status
    if (action === "list_projects") {
      const { data: projects, error } = await supabaseAdmin
        .from("projects")
        .select(`
          id,
          project_name,
          status,
          created_at,
          updated_at,
          notification_email,
          pdf_uploads (id, filename, status, created_at),
          contractor_bids (id, contractor_name, created_at)
        `)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        console.error("Error listing projects:", error);
        return new Response(
          JSON.stringify({ error: "Failed to list projects" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ projects }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // List failed/incomplete projects
    if (action === "list_failed") {
      const { data: projects, error } = await supabaseAdmin
        .from("projects")
        .select(`
          id,
          project_name,
          status,
          created_at,
          updated_at,
          notification_email,
          pdf_uploads (id, filename, status, created_at),
          contractor_bids (id, contractor_name, created_at)
        `)
        .in("status", ["draft", "uploading", "analyzing"])
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error listing failed projects:", error);
        return new Response(
          JSON.stringify({ error: "Failed to list projects" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Filter to only show projects that look stuck/failed
      const failedProjects = projects?.filter((p: any) => {
        const createdAt = new Date(p.created_at);
        const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
        // Projects older than 1 hour that are still in draft/uploading/analyzing
        return createdAt < hourAgo;
      });

      return new Response(
        JSON.stringify({ projects: failedProjects }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Delete a single project and all related data
    if (action === "delete_project" && projectId) {
      const result = await deleteProject(supabaseAdmin, projectId);
      return new Response(
        JSON.stringify(result),
        { status: result.success ? 200 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Delete multiple projects
    if (action === "delete_projects_batch" && projectIds && projectIds.length > 0) {
      const results = await Promise.all(
        projectIds.map((id) => deleteProject(supabaseAdmin, id))
      );
      
      const successCount = results.filter((r) => r.success).length;
      const failCount = results.filter((r) => !r.success).length;

      return new Response(
        JSON.stringify({ 
          success: failCount === 0,
          message: `Deleted ${successCount} projects. ${failCount} failed.`,
          results 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in admin-cleanup:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function deleteProject(supabaseAdmin: any, projectId: string): Promise<{ success: boolean; projectId: string; error?: string }> {
  try {
    console.log(`Deleting project ${projectId} and all related data...`);

    // Delete in order of dependencies (child tables first)
    
    // 1. Delete project_qii_checklist
    await supabaseAdmin
      .from("project_qii_checklist")
      .delete()
      .eq("project_id", projectId);

    // 2. Delete project_rebates
    await supabaseAdmin
      .from("project_rebates")
      .delete()
      .eq("project_id", projectId);

    // 3. Delete bid_questions
    await supabaseAdmin
      .from("bid_questions")
      .delete()
      .eq("project_id", projectId);

    // 4. Delete mindpal_extractions (via pdf_uploads)
    const { data: pdfUploads } = await supabaseAdmin
      .from("pdf_uploads")
      .select("id")
      .eq("project_id", projectId);
    
    if (pdfUploads && pdfUploads.length > 0) {
      const pdfIds = pdfUploads.map((p: any) => p.id);
      await supabaseAdmin
        .from("mindpal_extractions")
        .delete()
        .in("pdf_upload_id", pdfIds);
    }

    // 5. Delete pdf_uploads
    await supabaseAdmin
      .from("pdf_uploads")
      .delete()
      .eq("project_id", projectId);

    // 6. Delete contractor_bids
    await supabaseAdmin
      .from("contractor_bids")
      .delete()
      .eq("project_id", projectId);

    // 7. Delete project_requirements
    await supabaseAdmin
      .from("project_requirements")
      .delete()
      .eq("project_id", projectId);

    // 8. Delete analytics_events for this project
    await supabaseAdmin
      .from("analytics_events")
      .delete()
      .eq("project_id", projectId);

    // 9. Finally delete the project itself
    const { error: projectError } = await supabaseAdmin
      .from("projects")
      .delete()
      .eq("id", projectId);

    if (projectError) {
      console.error(`Error deleting project ${projectId}:`, projectError);
      return { success: false, projectId, error: projectError.message };
    }

    console.log(`Successfully deleted project ${projectId}`);
    return { success: true, projectId };

  } catch (error: any) {
    console.error(`Error deleting project ${projectId}:`, error);
    return { success: false, projectId, error: error.message };
  }
}
