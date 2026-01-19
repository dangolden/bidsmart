/**
 * Supabase Client Configuration
 * 
 * Bolt Database automatically provisions Supabase and injects these 
 * environment variables. No manual setup required when using Bolt.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Bolt auto-injects these - only warn in development if missing
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase environment variables not found. ' +
    'If using Bolt, make sure Bolt Database is enabled for your project.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

/**
 * Get the current authenticated user
 */
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    console.error('Error getting current user:', error);
    return null;
  }
  return user;
}

/**
 * Get or create user extension record
 */
export async function getOrCreateUserExt(authUserId: string, email: string) {
  // First try to get existing record
  const { data: existing, error: fetchError } = await supabase
    .from('users_ext')
    .select('*')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (fetchError) {
    console.error('Error fetching user_ext:', fetchError);
    throw fetchError;
  }

  if (existing) {
    return existing;
  }

  // Create new record
  const { data: created, error: createError } = await supabase
    .from('users_ext')
    .insert({
      auth_user_id: authUserId,
      email: email,
    })
    .select()
    .single();

  if (createError) {
    console.error('Error creating user_ext:', createError);
    throw createError;
  }

  return created;
}

export default supabase;
