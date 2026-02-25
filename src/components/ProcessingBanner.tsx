import { useState, useEffect, useRef, useCallback } from 'react';
import { Clock, CheckCircle2, ArrowRight, X, Eye } from 'lucide-react';
import { getProject } from '../lib/database/bidsmartService';

const POLL_INTERVAL_MS = 30 * 1000; // Check every 30 seconds

interface ProcessingBannerProps {
  projectId: string;
  email?: string;
  onViewResults: () => void;
  onViewWaiting: () => void;
  onDismiss: () => void;
}

export function ProcessingBanner({
  projectId,
  email,
  onViewResults,
  onViewWaiting,
  onDismiss,
}: ProcessingBannerProps) {
  const [status, setStatus] = useState<'processing' | 'complete'>('processing');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkStatus = useCallback(async () => {
    try {
      const project = await getProject(projectId);
      if (project && (project.status === 'comparing' || project.status === 'completed')) {
        setStatus('complete');
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      }
    } catch {
      // Ignore errors — keep polling
    }
  }, [projectId]);

  useEffect(() => {
    checkStatus(); // Check immediately on mount
    pollRef.current = setInterval(checkStatus, POLL_INTERVAL_MS);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [checkStatus]);

  if (status === 'complete') {
    return (
      <div className="bg-switch-green-50 border-b border-switch-green-200 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <CheckCircle2 className="w-5 h-5 text-switch-green-600 flex-shrink-0" />
            <p className="text-sm font-medium text-switch-green-900 truncate">
              Your bid analysis is ready!
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={onViewResults}
              className="bg-switch-green-600 hover:bg-switch-green-700 text-white text-sm font-medium px-4 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              View Results
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onDismiss}
              className="text-switch-green-600 hover:text-switch-green-800 p-1 rounded transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Clock className="w-5 h-5 text-amber-600 animate-pulse flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-amber-900 truncate">
              Your bids are being analyzed
            </p>
            <p className="text-xs text-amber-700 truncate">
              We'll notify you{email ? ` at ${email}` : ''} when ready
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onViewWaiting}
            className="bg-amber-100 hover:bg-amber-200 text-amber-900 text-sm font-medium px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            Waiting page
          </button>
          <button
            onClick={onDismiss}
            className="text-amber-600 hover:text-amber-800 p-1 rounded transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
