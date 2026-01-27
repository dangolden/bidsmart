import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";

interface FeedbackRequest {
  type: 'liked' | 'wishlist' | 'bug';
  message: string;
  url?: string;
  userAgent?: string;
  timestamp?: string;
}

Deno.serve(async (req: Request) => {
  try {
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    if (req.method !== "POST") {
      return errorResponse("Method not allowed", 405);
    }

    const feedback: FeedbackRequest = await req.json();

    if (!feedback.type || !feedback.message || feedback.message.trim().length === 0) {
      return errorResponse("Missing required fields: type and message");
    }

    if (!['liked', 'wishlist', 'bug'].includes(feedback.type)) {
      return errorResponse("Invalid feedback type");
    }

    if (feedback.message.length > 500) {
      return errorResponse("Message too long (max 500 characters)");
    }

    const { data, error } = await supabaseAdmin
      .from("user_feedback")
      .insert({
        type: feedback.type,
        message: feedback.message.trim(),
        url: feedback.url || null,
        user_agent: feedback.userAgent || null,
        timestamp: feedback.timestamp || new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to store feedback:", error);
      return errorResponse("Failed to submit feedback", 500);
    }

    return jsonResponse({
      success: true,
      message: "Thank you for your feedback!",
      id: data.id,
    });

  } catch (error) {
    console.error("Error in submit-feedback:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Internal server error",
      500
    );
  }
});
