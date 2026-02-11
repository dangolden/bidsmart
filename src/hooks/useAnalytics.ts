/**
 * Analytics Hook
 * 
 * Provides easy-to-use analytics tracking for components
 */

import { useCallback, useEffect, useRef } from 'react';
import { 
  trackClick, 
  trackView, 
  trackAction, 
  getSessionId 
} from '../lib/services/adminService';

interface UseAnalyticsOptions {
  userEmail?: string;
  projectId?: string;
}

export function useAnalytics(options: UseAnalyticsOptions = {}) {
  const { userEmail, projectId } = options;
  const sessionId = useRef(getSessionId());

  // Track a click event
  const trackClickEvent = useCallback(
    (name: string, category?: string, data?: Record<string, unknown>) => {
      trackClick(name, category, {
        ...data,
        userEmail,
        projectId,
        sessionId: sessionId.current,
      });
    },
    [userEmail, projectId]
  );

  // Track a view event
  const trackViewEvent = useCallback(
    (name: string, category?: string, data?: Record<string, unknown>) => {
      trackView(name, category, {
        ...data,
        userEmail,
        projectId,
        sessionId: sessionId.current,
      });
    },
    [userEmail, projectId]
  );

  // Track an action event
  const trackActionEvent = useCallback(
    (name: string, category?: string, data?: Record<string, unknown>) => {
      trackAction(name, category, {
        ...data,
        userEmail,
        projectId,
        sessionId: sessionId.current,
      });
    },
    [userEmail, projectId]
  );

  return {
    trackClick: trackClickEvent,
    trackView: trackViewEvent,
    trackAction: trackActionEvent,
    sessionId: sessionId.current,
  };
}

/**
 * Hook to track page views automatically
 */
export function usePageView(pageName: string, category?: string) {
  const hasTracked = useRef(false);

  useEffect(() => {
    if (!hasTracked.current) {
      trackView(pageName, category);
      hasTracked.current = true;
    }
  }, [pageName, category]);
}

/**
 * Pre-defined event names for consistency
 */
export const AnalyticsEvents = {
  // Upload events
  UPLOAD_PDF: 'upload_pdf',
  UPLOAD_START: 'upload_start',
  UPLOAD_COMPLETE: 'upload_complete',
  UPLOAD_ERROR: 'upload_error',
  
  // Analysis events
  ANALYSIS_START: 'analysis_start',
  ANALYSIS_COMPLETE: 'analysis_complete',
  ANALYSIS_VIEW: 'analysis_view',
  
  // Comparison events
  COMPARE_VIEW: 'compare_view',
  COMPARE_BID_CLICK: 'compare_bid_click',
  COMPARE_EXPAND_SECTION: 'compare_expand_section',
  
  // Report events
  REPORT_DOWNLOAD: 'report_download',
  REPORT_VIEW: 'report_view',
  
  // Demo events
  DEMO_VIEW: 'demo_view',
  DEMO_CTA_CLICK: 'demo_cta_click',
  
  // Navigation events
  NAV_HOME: 'nav_home',
  NAV_PROJECT: 'nav_project',
  
  // Feature events
  PRIORITY_ADJUST: 'priority_adjust',
  EMAIL_LOOKUP: 'email_lookup',
  FEEDBACK_SUBMIT: 'feedback_submit',
  SOUND_TOGGLE: 'sound_toggle',
  EMAIL_TOGGLE: 'email_toggle',
} as const;

export const AnalyticsCategories = {
  UPLOAD: 'upload',
  ANALYSIS: 'analysis',
  COMPARISON: 'comparison',
  REPORT: 'report',
  NAVIGATION: 'navigation',
  FEATURE: 'feature',
  DEMO: 'demo',
} as const;
