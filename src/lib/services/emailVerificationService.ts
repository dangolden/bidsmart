/**
 * Email Verification Service
 * 
 * Handles sending and verifying email codes for secure report lookup
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const VERIFIED_SESSION_KEY = 'bidsmart_verified_session';

export interface VerifiedSession {
  email: string;
  sessionToken: string;
  expiresAt: string;
}

export interface SendCodeResult {
  success: boolean;
  error?: string;
  code?: string; // Only returned in dev mode
}

export interface VerifyCodeResult {
  success: boolean;
  sessionToken?: string;
  email?: string;
  expiresAt?: string;
  error?: string;
}

/**
 * Get stored verified session from localStorage
 */
export function getVerifiedSession(): VerifiedSession | null {
  try {
    const stored = localStorage.getItem(VERIFIED_SESSION_KEY);
    if (!stored) return null;

    const session: VerifiedSession = JSON.parse(stored);
    
    // Check if expired
    if (new Date(session.expiresAt) < new Date()) {
      localStorage.removeItem(VERIFIED_SESSION_KEY);
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

/**
 * Store verified session in localStorage
 */
export function storeVerifiedSession(session: VerifiedSession): void {
  try {
    localStorage.setItem(VERIFIED_SESSION_KEY, JSON.stringify(session));
  } catch {
    console.error('Failed to store verified session');
  }
}

/**
 * Clear verified session
 */
export function clearVerifiedSession(): void {
  try {
    localStorage.removeItem(VERIFIED_SESSION_KEY);
  } catch {
    // Ignore
  }
}

/**
 * Check if email is verified in current session
 */
export function isEmailVerified(email: string): boolean {
  const session = getVerifiedSession();
  if (!session) return false;
  return session.email.toLowerCase() === email.toLowerCase();
}

/**
 * Send verification code to email
 */
export async function sendVerificationCode(email: string): Promise<SendCodeResult> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-verification-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to send verification code',
      };
    }

    return {
      success: true,
      code: data.code, // Only in dev mode
    };
  } catch (error) {
    console.error('Error sending verification code:', error);
    return {
      success: false,
      error: 'Network error. Please try again.',
    };
  }
}

/**
 * Verify code and create session
 */
export async function verifyCode(email: string, code: string): Promise<VerifyCodeResult> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/verify-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ email, code }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Invalid verification code',
      };
    }

    // Store session
    storeVerifiedSession({
      email: data.email,
      sessionToken: data.sessionToken,
      expiresAt: data.expiresAt,
    });

    return {
      success: true,
      sessionToken: data.sessionToken,
      email: data.email,
      expiresAt: data.expiresAt,
    };
  } catch (error) {
    console.error('Error verifying code:', error);
    return {
      success: false,
      error: 'Network error. Please try again.',
    };
  }
}
