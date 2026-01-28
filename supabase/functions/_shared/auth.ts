import { supabaseAdmin } from "./supabase.ts";
import { errorResponse } from "./cors.ts";

export interface AuthResult {
  userId: string;
  userExtId: string;
  email: string;
}

export async function verifyEmailAuth(req: Request): Promise<AuthResult | Response> {
  const userEmail = req.headers.get("X-User-Email");

  if (!userEmail) {
    return errorResponse("Missing X-User-Email header", 401);
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(userEmail)) {
    return errorResponse("Invalid email format", 400);
  }

  const { data: userExt, error: userExtError } = await supabaseAdmin
    .from("users_ext")
    .select("id, email, auth_user_id")
    .eq("email", userEmail)
    .maybeSingle();

  if (userExtError) {
    console.error("Error fetching user:", userExtError);
    return errorResponse("Database error", 500);
  }

  if (!userExt) {
    return errorResponse("User not found", 404);
  }

  return {
    userId: userExt.auth_user_id || userExt.id,
    userExtId: userExt.id,
    email: userExt.email,
  };
}

export async function verifyProjectOwnership(
  userExtId: string,
  projectId: string
): Promise<boolean> {
  const { data: project, error } = await supabaseAdmin
    .from("projects")
    .select("id, user_id")
    .eq("id", projectId)
    .maybeSingle();

  if (error || !project) {
    return false;
  }

  return project.user_id === userExtId;
}
