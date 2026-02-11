import { Clock, Bell } from 'lucide-react';

interface ProcessingBannerProps {
  email?: string;
}

export function ProcessingBanner({ email }: ProcessingBannerProps) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
          <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
        </div>
        <div className="flex-1">
          <p className="font-medium text-amber-800 text-sm flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Your bids are being analyzed
          </p>
          <p className="text-amber-700 text-xs">
            We'll notify you{email ? ` at ${email}` : ''} when your analysis is ready. Feel free to explore this demo in the meantime!
          </p>
        </div>
      </div>
    </div>
  );
}
