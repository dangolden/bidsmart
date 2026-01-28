import { FlaskConical, X, MessageSquare } from 'lucide-react';
import { useState } from 'react';
import { FeedbackPanel } from './FeedbackPanel';

interface AlphaBannerProps {
  dismissible?: boolean;
  variant?: 'full' | 'compact';
}

export function AlphaBanner({ dismissible = true, variant = 'full' }: AlphaBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  if (dismissed) return null;

  if (variant === 'compact') {
    return (
      <div className="bg-blue-50 border-b border-blue-200 px-4 py-2">
        <div className="flex items-center justify-between gap-2 text-sm max-w-4xl mx-auto">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-blue-600" />
            <span className="text-blue-800">
              <span className="font-medium">Early Access</span> - Actively improving based on your feedback
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowFeedback(true)}
              className="px-2 py-0.5 text-xs font-medium text-blue-700 hover:bg-blue-100 rounded transition-colors"
            >
              Feedback
            </button>
            {dismissible && (
              <button
                onClick={() => setDismissed(true)}
                className="p-0.5 hover:bg-blue-100 rounded"
              >
                <X className="w-3.5 h-3.5 text-blue-600" />
              </button>
            )}
          </div>
        </div>
        <FeedbackPanel isOpen={showFeedback} onClose={() => setShowFeedback(false)} />
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-blue-200">
      <div className="max-w-4xl mx-auto px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <FlaskConical className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0 flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-200 text-blue-800">
                EARLY ACCESS
              </span>
              <h3 className="text-sm font-semibold text-blue-900">
                Help Shape the Future of BidSmart
              </h3>
            </div>
            <button
              onClick={() => setShowFeedback(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              Share Feedback
            </button>
          </div>
          {dismissible && (
            <button
              onClick={() => setDismissed(true)}
              className="flex-shrink-0 p-1 hover:bg-blue-100 rounded"
            >
              <X className="w-4 h-4 text-blue-600" />
            </button>
          )}
        </div>
      </div>
      <FeedbackPanel isOpen={showFeedback} onClose={() => setShowFeedback(false)} />
    </div>
  );
}

export function AlphaInlineBanner({ message }: { message?: string }) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
      <FlaskConical className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
      <p className="text-sm text-amber-800">
        {message || 'This feature is in alpha testing and may not work perfectly yet.'}
      </p>
    </div>
  );
}
