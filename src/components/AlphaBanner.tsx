import { FlaskConical, X } from 'lucide-react';
import { useState } from 'react';

interface AlphaBannerProps {
  dismissible?: boolean;
  variant?: 'full' | 'compact';
}

export function AlphaBanner({ dismissible = true, variant = 'full' }: AlphaBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  if (variant === 'compact') {
    return (
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-2">
        <div className="flex items-center justify-center gap-2 text-sm">
          <FlaskConical className="w-4 h-4 text-amber-600" />
          <span className="text-amber-800">
            <span className="font-medium">Alpha Testing</span> - Features may change
          </span>
          {dismissible && (
            <button
              onClick={() => setDismissed(true)}
              className="ml-2 p-0.5 hover:bg-amber-100 rounded"
            >
              <X className="w-3.5 h-3.5 text-amber-600" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200">
      <div className="max-w-4xl mx-auto px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
            <FlaskConical className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-200 text-amber-800">
                ALPHA
              </span>
              <h3 className="text-sm font-medium text-amber-900">
                You are testing an early version of BidSmart
              </h3>
            </div>
            <p className="mt-1 text-sm text-amber-700">
              Some features may not work as expected. Your feedback helps us improve!
              If you encounter issues, please let us know.
            </p>
          </div>
          {dismissible && (
            <button
              onClick={() => setDismissed(true)}
              className="flex-shrink-0 p-1 hover:bg-amber-100 rounded"
            >
              <X className="w-4 h-4 text-amber-600" />
            </button>
          )}
        </div>
      </div>
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
