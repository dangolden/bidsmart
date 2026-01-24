import { createUserClient } from "./supabase.ts";
import { errorResponse } from "./cors.ts";

export interface AuthResult {
  userId: string;
  userExtId: string;
}

export async function verifyAuth(req: Request): Promise<AuthResult | Response> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return errorResponse("Missing Authorization header", 401);
  }

  const supabase = createUserClient(authHeader);
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return errorResponse("Invalid or expired token", 401);
  }

  const { data: userExt, error: userExtError } = await supabase
    .from("users_ext")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (userExtError || !userExt) {
    return errorResponse("User profile not found", 404);
  }

  return {
    userId: user.id,
    userExtId: userExt.id,
  };
}

export async function verifyProjectOwnership(
  userExtId: string,
  projectId: string,
  authHeader: string
): Promise<boolean> {
  const supabase = createUserClient(authHeader);

  const { data: project, error } = await supabase
    .from("projects")
    .select("id, user_id")
    .eq("id", projectId)
    .maybeSingle();

  if (error || !project) {
    return false;
  }

  return project.user_id === userExtId;
}
