import { supabaseAdmin } from "./supabase.ts";
import { errorResponse } from "./cors.ts";
import { verifyParentToken, extractAuthToken, isParentAuthEnabled } from "./parentAuth.ts";

export interface AuthResult {
  userId: string;
  userExtId: string;
  email: string;
}

/**
 * Unified authentication that supports:
 * 1. Signed tokens from parent platform (preferred, more secure)
 * 2. Legacy X-User-Email header (fallback for backward compatibility)
 * 
 * When PARENT_AUTH_SECRET is configured, signed tokens are required.
 * Otherwise, falls back to email header (less secure, for development/demo).
 */
export async function verifyEmailAuth(req: Request): Promise<AuthResult | Response> {
  let userEmail: string | null = null;
  let userName: string | null = null;

  // Try signed token auth first
  const authToken = extractAuthToken(req);
  if (authToken) {
    const tokenResult = await verifyParentToken(authToken);
    if (tokenResult) {
      userEmail = tokenResult.email;
      userName = tokenResult.name;
    } else if (isParentAuthEnabled()) {
      // Token provided but invalid, and parent auth is required
      return errorResponse("Invalid or expired authentication token", 401);
    }
  }

  // Fall back to legacy email header if no valid token
  if (!userEmail) {
    if (isParentAuthEnabled()) {
      // Parent auth is enabled but no valid token - reject
      return errorResponse("Authentication token required", 401);
    }
    
    // Legacy mode: trust X-User-Email header (less secure)
    userEmail = req.headers.get("X-User-Email");
    if (!userEmail) {
      return errorResponse("Missing authentication", 401);
    }
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(userEmail)) {
    return errorResponse("Invalid email format", 400);
  }

  // Get or create user
  let userExt = await getUserByEmail(userEmail);
  
  if (!userExt) {
    // Auto-create user if authenticated via signed token
    if (authToken) {
      userExt = await createUser(userEmail, userName || userEmail.split("@")[0]);
    }
    
    if (!userExt) {
      return errorResponse("User not found", 404);
    }
  }

  return {
    userId: userExt.auth_user_id || userExt.id,
    userExtId: userExt.id,
    email: userExt.email,
  };
}

async function getUserByEmail(email: string): Promise<{ id: string; email: string; auth_user_id: string | null } | null> {
  const { data: userExt, error: userExtError } = await supabaseAdmin
    .from("users_ext")
    .select("id, email, auth_user_id")
    .eq("email", email)
    .maybeSingle();

  if (userExtError) {
    console.error("Error fetching user:", userExtError);
    return null;
  }

  return userExt;
}

async function createUser(email: string, fullName: string): Promise<{ id: string; email: string; auth_user_id: string | null } | null> {
  const { data: userExt, error } = await supabaseAdmin
    .from("users_ext")
    .insert({ email, full_name: fullName })
    .select("id, email, auth_user_id")
    .single();

  if (error) {
    console.error("Error creating user:", error);
    return null;
  }

  return userExt;
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
