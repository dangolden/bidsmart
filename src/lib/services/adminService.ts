/**
 * Admin Service
 * 
 * Functions for admin dashboard: stats retrieval and analytics tracking
 */

import { supabase } from '../supabaseClient';

// ============================================
// TYPES
// ============================================

export interface AdminStats {
  total_projects: number;
  draft_projects: number;
  analyzing_projects: number;
  comparing_projects: number;
  completed_projects: number;
  total_runs: number;
  total_bids: number;
  unique_contractors: number;
  total_pdfs: number;
  extracted_pdfs: number;
  failed_pdfs: number;
  total_users: number;
  active_users_7d: number;
  active_users_30d: number;
  feedback_liked: number;
  feedback_wishlist: number;
  feedback_bugs: number;
  projects_24h: number;
  projects_7d: number;
  bids_24h: number;
  bids_7d: number;
  generated_at: string;
}

export interface FeatureUsageStat {
  event_name: string;
  event_category: string | null;
  total_count: number;
  unique_sessions: number;
  unique_users: number;
  first_occurrence: string;
  last_occurrence: string;
  count_24h: number;
  count_7d: number;
}

export interface DailyStat {
  date: string;
  projects_created: number;
  unique_users: number;
}

export interface AnalyticsEvent {
  event_type: 'click' | 'view' | 'action';
  event_name: string;
  event_category?: string;
  session_id?: string;
  user_email?: string;
  project_id?: string;
  event_data?: Record<string, unknown>;
  page_url?: string;
  referrer?: string;
}

export interface UserFeedback {
  id: string;
  type: 'liked' | 'wishlist' | 'bug';
  message: string;
  url: string | null;
  user_agent: string | null;
  timestamp: string | null;
  created_at: string;
}

// ============================================
// SESSION MANAGEMENT
// ============================================

const SESSION_KEY = 'bidsmart_session_id';

export function getSessionId(): string {
  let sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}

// ============================================
// ADMIN STATS
// ============================================

export async function getAdminStats(): Promise<AdminStats | null> {
  const { data, error } = await supabase
    .from('admin_stats')
    .select('*')
    .single();

  if (error) {
    console.error('Error fetching admin stats:', error);
    return null;
  }

  return data;
}

export async function getFeatureUsageStats(): Promise<FeatureUsageStat[]> {
  const { data, error } = await supabase
    .from('feature_usage_stats')
    .select('*')
    .order('total_count', { ascending: false });

  if (error) {
    console.error('Error fetching feature usage stats:', error);
    return [];
  }

  return data || [];
}

export async function getDailyStats(days: number = 30): Promise<DailyStat[]> {
  const { data, error } = await supabase
    .from('daily_stats')
    .select('*')
    .limit(days);

  if (error) {
    console.error('Error fetching daily stats:', error);
    return [];
  }

  return data || [];
}

export async function getUserFeedback(): Promise<UserFeedback[]> {
  const { data, error } = await supabase
    .from('user_feedback')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Error fetching user feedback:', error);
    return [];
  }

  return data || [];
}

// ============================================
// ANALYTICS TRACKING
// ============================================

export async function trackEvent(event: AnalyticsEvent): Promise<void> {
  try {
    const { error } = await supabase.from('analytics_events').insert({
      event_type: event.event_type,
      event_name: event.event_name,
      event_category: event.event_category,
      session_id: event.session_id || getSessionId(),
      user_email: event.user_email,
      project_id: event.project_id,
      event_data: event.event_data,
      page_url: event.page_url || window.location.href,
      referrer: event.referrer || document.referrer,
      user_agent: navigator.userAgent,
      client_timestamp: new Date().toISOString(),
    });

    if (error) {
      console.error('Error tracking event:', error);
    }
  } catch (err) {
    // Silently fail - don't break user experience for analytics
    console.error('Analytics tracking failed:', err);
  }
}

// Convenience functions for common events
export function trackClick(name: string, category?: string, data?: Record<string, unknown>): void {
  trackEvent({
    event_type: 'click',
    event_name: name,
    event_category: category,
    event_data: data,
  });
}

export function trackView(name: string, category?: string, data?: Record<string, unknown>): void {
  trackEvent({
    event_type: 'view',
    event_name: name,
    event_category: category,
    event_data: data,
  });
}

export function trackAction(name: string, category?: string, data?: Record<string, unknown>): void {
  trackEvent({
    event_type: 'action',
    event_name: name,
    event_category: category,
    event_data: data,
  });
}

// ============================================
// ADMIN ACCESS CHECK
// ============================================

const ADMIN_EMAILS = [
  'dan@theswitchison.org',
  'admin@theswitchison.org',
];

export function isAdminEmail(email: string): boolean {
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

// ============================================
// ADMIN DATA CLEANUP
// ============================================

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export interface AdminProject {
  id: string;
  project_name: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  notification_email: string | null;
  pdf_uploads: Array<{ id: string; filename: string; status: string; created_at: string }>;
  contractor_bids: Array<{ id: string; contractor_name: string; created_at: string }>;
}

export interface CleanupResult {
  success: boolean;
  message?: string;
  projects?: AdminProject[];
  results?: Array<{ success: boolean; projectId: string; error?: string }>;
}

async function callAdminCleanup(body: Record<string, unknown>): Promise<CleanupResult> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/admin-cleanup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, message: data.error || 'Request failed' };
    }

    return { success: true, ...data };
  } catch (error) {
    console.error('Admin cleanup error:', error);
    return { success: false, message: 'Network error' };
  }
}

export async function listAllProjects(userEmail: string): Promise<CleanupResult> {
  return callAdminCleanup({ action: 'list_projects', userEmail });
}

export async function listFailedProjects(userEmail: string): Promise<CleanupResult> {
  return callAdminCleanup({ action: 'list_failed', userEmail });
}

export async function deleteProject(projectId: string, userEmail: string): Promise<CleanupResult> {
  return callAdminCleanup({ action: 'delete_project', projectId, userEmail });
}

export async function deleteProjectsBatch(projectIds: string[], userEmail: string): Promise<CleanupResult> {
  return callAdminCleanup({ action: 'delete_projects_batch', projectIds, userEmail });
}
