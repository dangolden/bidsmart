import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * Parent Platform Authentication
 * 
 * Verifies signed tokens from the parent platform (TheSwitchIsOn)
 * to authenticate users in the iframe-embedded context.
 */

const PARENT_AUTH_SECRET = Deno.env.get("PARENT_AUTH_SECRET");
const TOKEN_MAX_AGE_SECONDS = 3600; // 1 hour

interface ParentAuthPayload {
  email: string;
  name: string;
  exp: number;  // Expiration timestamp (Unix seconds)
  iat: number;  // Issued at timestamp (Unix seconds)
}

interface ParentAuthResult {
  email: string;
  name: string;
}

/**
 * Generates HMAC-SHA256 signature for a payload
 */
async function generateSignature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(payload);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
  return btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

/**
 * Decodes base64url string
 */
function base64UrlDecode(str: string): string {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  return atob(padded);
}

/**
 * Verifies a signed token from the parent platform
 * 
 * Token format: base64url(payload).base64url(signature)
 * Where payload is JSON: { email, name, exp, iat }
 */
export async function verifyParentToken(token: string): Promise<ParentAuthResult | null> {
  if (!PARENT_AUTH_SECRET) {
    console.error("PARENT_AUTH_SECRET not configured");
    return null;
  }

  try {
    const parts = token.split(".");
    if (parts.length !== 2) {
      console.error("Invalid token format: expected 2 parts");
      return null;
    }

    const [payloadB64, signatureB64] = parts;

    // Decode and parse payload
    const payloadJson = base64UrlDecode(payloadB64);
    const payload: ParentAuthPayload = JSON.parse(payloadJson);

    // Verify required fields
    if (!payload.email || !payload.exp || !payload.iat) {
      console.error("Token missing required fields");
      return null;
    }

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      console.error("Token expired");
      return null;
    }

    // Check if token is too old (issued more than max age ago)
    if (payload.iat < now - TOKEN_MAX_AGE_SECONDS) {
      console.error("Token too old");
      return null;
    }

    // Verify signature
    const expectedSignature = await generateSignature(payloadJson, PARENT_AUTH_SECRET);
    if (signatureB64 !== expectedSignature) {
      console.error("Invalid token signature");
      return null;
    }

    return {
      email: payload.email,
      name: payload.name || payload.email.split("@")[0],
    };
  } catch (error) {
    console.error("Error verifying parent token:", error);
    return null;
  }
}

/**
 * Extracts auth token from request headers
 * Checks X-Auth-Token header first, then Authorization Bearer
 */
export function extractAuthToken(req: Request): string | null {
  // Check X-Auth-Token header
  const authToken = req.headers.get("X-Auth-Token");
  if (authToken) {
    return authToken;
  }

  // Check Authorization Bearer header
  const authHeader = req.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    // Only use if it looks like a signed token (contains a dot)
    if (token.includes(".")) {
      return token;
    }
  }

  return null;
}

/**
 * Checks if parent auth is enabled (secret is configured)
 */
export function isParentAuthEnabled(): boolean {
  return !!PARENT_AUTH_SECRET;
}
