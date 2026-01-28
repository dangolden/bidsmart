import { createClient } from "npm:@supabase/supabase-js@2.39.0";
import { corsHeaders } from "../_shared/cors.ts";
import { getUserIdFromRequest } from "../_shared/auth.ts";

interface ReviewSubmission {
  project_id: string;
  contractor_bid_id: string;
  overall_rating: number;
  quality_of_work_rating: number;
  professionalism_rating: number;
  communication_rating: number;
  timeliness_rating: number;
  used_checklist: boolean;
  checklist_completeness_rating?: number | null;
  would_recommend: boolean;
  completed_on_time: boolean;
  stayed_within_budget: boolean;
  critical_items_verified: boolean;
  photo_documentation_provided: boolean;
  issues_encountered?: string[];
  positive_comments?: string;
  improvement_suggestions?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const userId = await getUserIdFromRequest(req);

    const reviewData: ReviewSubmission = await req.json();

    if (
      !reviewData.project_id ||
      !reviewData.contractor_bid_id ||
      reviewData.overall_rating === undefined ||
      reviewData.quality_of_work_rating === undefined ||
      reviewData.professionalism_rating === undefined ||
      reviewData.communication_rating === undefined ||
      reviewData.timeliness_rating === undefined ||
      reviewData.would_recommend === undefined ||
      reviewData.completed_on_time === undefined ||
      reviewData.stayed_within_budget === undefined ||
      reviewData.critical_items_verified === undefined ||
      reviewData.photo_documentation_provided === undefined
    ) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const ratings = [
      reviewData.overall_rating,
      reviewData.quality_of_work_rating,
      reviewData.professionalism_rating,
      reviewData.communication_rating,
      reviewData.timeliness_rating,
    ];

    if (ratings.some(r => r < 1 || r > 5)) {
      return new Response(
        JSON.stringify({ error: "Ratings must be between 1 and 5" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (
      reviewData.used_checklist &&
      reviewData.checklist_completeness_rating !== undefined &&
      reviewData.checklist_completeness_rating !== null
    ) {
      if (reviewData.checklist_completeness_rating < 1 || reviewData.checklist_completeness_rating > 5) {
        return new Response(
          JSON.stringify({ error: "Checklist completeness rating must be between 1 and 5" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("user_id, selected_bid_id")
      .eq("id", reviewData.project_id)
      .single();

    if (projectError || !project) {
      return new Response(
        JSON.stringify({ error: "Project not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (project.user_id !== userId) {
      return new Response(
        JSON.stringify({ error: "Not authorized to review this project" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: existingReview } = await supabase
      .from("contractor_installation_reviews")
      .select("id")
      .eq("project_id", reviewData.project_id)
      .maybeSingle();

    let result;
    if (existingReview) {
      const { data, error } = await supabase
        .from("contractor_installation_reviews")
        .update({
          contractor_bid_id: reviewData.contractor_bid_id,
          overall_rating: reviewData.overall_rating,
          quality_of_work_rating: reviewData.quality_of_work_rating,
          professionalism_rating: reviewData.professionalism_rating,
          communication_rating: reviewData.communication_rating,
          timeliness_rating: reviewData.timeliness_rating,
          used_checklist: reviewData.used_checklist,
          checklist_completeness_rating: reviewData.checklist_completeness_rating || null,
          would_recommend: reviewData.would_recommend,
          completed_on_time: reviewData.completed_on_time,
          stayed_within_budget: reviewData.stayed_within_budget,
          critical_items_verified: reviewData.critical_items_verified,
          photo_documentation_provided: reviewData.photo_documentation_provided,
          issues_encountered: reviewData.issues_encountered || [],
          positive_comments: reviewData.positive_comments || null,
          improvement_suggestions: reviewData.improvement_suggestions || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingReview.id)
        .select()
        .single();

      if (error) throw error;
      result = { data, updated: true };
    } else {
      const { data, error } = await supabase
        .from("contractor_installation_reviews")
        .insert({
          project_id: reviewData.project_id,
          contractor_bid_id: reviewData.contractor_bid_id,
          user_id: userId,
          overall_rating: reviewData.overall_rating,
          quality_of_work_rating: reviewData.quality_of_work_rating,
          professionalism_rating: reviewData.professionalism_rating,
          communication_rating: reviewData.communication_rating,
          timeliness_rating: reviewData.timeliness_rating,
          used_checklist: reviewData.used_checklist,
          checklist_completeness_rating: reviewData.checklist_completeness_rating || null,
          would_recommend: reviewData.would_recommend,
          completed_on_time: reviewData.completed_on_time,
          stayed_within_budget: reviewData.stayed_within_budget,
          critical_items_verified: reviewData.critical_items_verified,
          photo_documentation_provided: reviewData.photo_documentation_provided,
          issues_encountered: reviewData.issues_encountered || [],
          positive_comments: reviewData.positive_comments || null,
          improvement_suggestions: reviewData.improvement_suggestions || null,
        })
        .select()
        .single();

      if (error) throw error;
      result = { data, updated: false };
    }

    return new Response(
      JSON.stringify({
        success: true,
        review: result.data,
        message: result.updated
          ? "Review updated successfully"
          : "Thank you for your feedback! Your review helps other homeowners make informed decisions.",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error submitting review:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
