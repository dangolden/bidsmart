import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";

interface LoginRequest {
  email: string;
  password: string;
}

function generateSessionToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req: Request) => {
  try {
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    if (req.method !== "POST") {
      return errorResponse("Method not allowed", 405);
    }

    const { email, password }: LoginRequest = await req.json();

    if (!email || !password) {
      return errorResponse("Email and password are required");
    }

    // Check credentials using pgcrypto's crypt function
    const { data: admin, error: adminError } = await supabaseAdmin
      .from("admin_users")
      .select("id, email, name, is_super_admin, password_hash")
      .eq("email", email.toLowerCase())
      .single();

    if (adminError || !admin) {
      console.log("Admin not found:", email);
      return errorResponse("Invalid email or password", 401);
    }

    // Verify password using SQL function
    const { data: validPassword, error: verifyError } = await supabaseAdmin
      .rpc("verify_admin_password", {
        stored_hash: admin.password_hash,
        input_password: password,
      });

    if (verifyError || !validPassword) {
      console.log("Password verification failed for:", email);
      return errorResponse("Invalid email or password", 401);
    }

    // Create session token
    const sessionToken = generateSessionToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const { error: sessionError } = await supabaseAdmin
      .from("admin_sessions")
      .insert({
        admin_user_id: admin.id,
        session_token: sessionToken,
        expires_at: expiresAt.toISOString(),
      });

    if (sessionError) {
      console.error("Failed to create session:", sessionError);
      return errorResponse("Failed to create session", 500);
    }

    // Update last login
    await supabaseAdmin
      .from("admin_users")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", admin.id);

    return jsonResponse({
      success: true,
      session_token: sessionToken,
      expires_at: expiresAt.toISOString(),
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        is_super_admin: admin.is_super_admin,
      },
    });

  } catch (error) {
    console.error("Error in admin-login:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Internal server error",
      500
    );
  }
});
