import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendEmailWithResend(email: string, code: string): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.log("RESEND_API_KEY not configured, skipping email send");
    return true; // Return true for dev mode
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "BidSmart <noreply@theswitchison.org>",
        to: [email],
        subject: "Your BidSmart Verification Code",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #16a34a;">BidSmart Verification Code</h2>
            <p>Use this code to access your bid analysis:</p>
            <div style="background-color: #f3f4f6; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #111827;">${code}</span>
            </div>
            <p style="color: #6b7280; font-size: 14px;">This code expires in 10 minutes.</p>
            <p style="color: #6b7280; font-size: 14px;">If you didn't request this code, you can safely ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="color: #9ca3af; font-size: 12px;">
              BidSmart by TheSwitchIsOn.org - Helping homeowners make informed heat pump decisions.
            </p>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Resend API error:", errorText);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check rate limiting - max 3 codes per email per 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count } = await supabaseAdmin
      .from("email_verifications")
      .select("*", { count: "exact", head: true })
      .eq("email", email.toLowerCase())
      .gte("created_at", tenMinutesAgo);

    if (count && count >= 3) {
      return new Response(
        JSON.stringify({ error: "Too many requests. Please wait before requesting another code." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate code and expiry
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    // Store verification code
    const { error: insertError } = await supabaseAdmin
      .from("email_verifications")
      .insert({
        email: email.toLowerCase(),
        code,
        expires_at: expiresAt,
        ip_address: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip"),
        user_agent: req.headers.get("user-agent"),
      });

    if (insertError) {
      console.error("Error storing verification code:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to generate verification code" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send email
    const emailSent = await sendEmailWithResend(email, code);
    
    if (!emailSent) {
      return new Response(
        JSON.stringify({ error: "Failed to send verification email" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // In dev mode without Resend, return the code for testing
    const responseData: { success: boolean; message: string; code?: string } = {
      success: true,
      message: "Verification code sent to your email",
    };

    if (!RESEND_API_KEY) {
      responseData.code = code; // Only for dev testing
    }

    return new Response(
      JSON.stringify(responseData),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in send-verification-code:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
