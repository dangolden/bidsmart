import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { UserExt } from '../lib/types';

const STORAGE_KEY = 'bidsmart_user';
const DEFAULT_EMAIL = 'demo@theswitchison.org';
const DEFAULT_NAME = 'Demo User';

interface StoredUser {
  email: string;
  name: string;
}

function getUrlParams(): StoredUser | null {
  if (typeof window === 'undefined') return null;

  const params = new URLSearchParams(window.location.search);
  const email = params.get('user_email');
  const name = params.get('user_name');

  if (email) {
    return { email, name: name || email.split('@')[0] };
  }
  return null;
}

function getStoredUser(): StoredUser | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

function storeUser(user: StoredUser): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } catch {
    // Ignore storage errors
  }
}

async function getOrCreateUserByEmail(email: string, fullName: string): Promise<UserExt> {
  const { data: existing, error: fetchError } = await supabase
    .from('users_ext')
    .select('*')
    .eq('email', email)
    .maybeSingle();

  if (fetchError) {
    console.error('Error fetching user:', fetchError);
    throw fetchError;
  }

  if (existing) {
    return existing;
  }

  const { data: created, error: createError } = await supabase
    .from('users_ext')
    .insert({
      email: email,
      full_name: fullName,
    })
    .select()
    .single();

  if (createError) {
    console.error('Error creating user:', createError);
    throw createError;
  }

  return created;
}

export interface UseUserResult {
  user: UserExt | null;
  loading: boolean;
  isReturningUser: boolean;
  error: Error | null;
}

export function useUser(): UseUserResult {
  const [user, setUser] = useState<UserExt | null>(null);
  const [loading, setLoading] = useState(true);
  const [isReturningUser, setIsReturningUser] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function initializeUser() {
      try {
        const urlParams = getUrlParams();
        const storedUser = getStoredUser();

        let userInfo: StoredUser;

        if (urlParams) {
          userInfo = urlParams;
          storeUser(urlParams);
        } else if (storedUser) {
          userInfo = storedUser;
        } else {
          userInfo = { email: DEFAULT_EMAIL, name: DEFAULT_NAME };
          storeUser(userInfo);
        }

        const dbUser = await getOrCreateUserByEmail(userInfo.email, userInfo.name);

        const isExisting = dbUser.created_at !== dbUser.updated_at ||
          new Date(dbUser.created_at).getTime() < Date.now() - 5000;

        setUser(dbUser);
        setIsReturningUser(isExisting);
      } catch (err) {
        console.error('Error initializing user:', err);
        setError(err instanceof Error ? err : new Error('Failed to initialize user'));
      } finally {
        setLoading(false);
      }
    }

    initializeUser();
  }, []);

  return { user, loading, isReturningUser, error };
}
