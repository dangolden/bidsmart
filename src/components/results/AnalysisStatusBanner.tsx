import { CheckCircle, AlertTriangle, Loader2, Clock } from 'lucide-react';
import type { AnalysisStatus } from '../../lib/types';

interface AnalysisStatusBannerProps {
  status: AnalysisStatus;
  analyzedBidCount: number;
  totalBidCount: number;
}

export function AnalysisStatusBanner({ status, analyzedBidCount, totalBidCount }: AnalysisStatusBannerProps) {
  switch (status) {
    case 'processing':
      return (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0" />
          <p className="text-sm text-blue-800">
            Analyzing your bids — this usually takes 3-5 minutes
            <span className="inline-flex ml-1">
              <span className="animate-pulse">.</span>
              <span className="animate-pulse" style={{ animationDelay: '0.2s' }}>.</span>
              <span className="animate-pulse" style={{ animationDelay: '0.4s' }}>.</span>
            </span>
          </p>
        </div>
      );

    case 'partial':
      return (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-amber-600 animate-spin flex-shrink-0" />
          <p className="text-sm text-amber-800">
            {analyzedBidCount} of {totalBidCount} bids analyzed — results updating as data arrives
          </p>
        </div>
      );

    case 'complete':
      return (
        <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
          <p className="text-xs text-green-700">
            Analysis complete — {totalBidCount} bid{totalBidCount !== 1 ? 's' : ''} compared
          </p>
        </div>
      );

    case 'failed':
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-red-800">
              Analysis encountered an error. Please try re-submitting your bids.
            </p>
          </div>
        </div>
      );

    case 'timeout':
      return (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center gap-3">
          <Clock className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800">
            Analysis is taking longer than expected. Results will appear automatically when ready.
          </p>
        </div>
      );

    default:
      return null;
  }
}
