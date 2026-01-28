import { Eye, Upload } from 'lucide-react';

interface DemoBannerProps {
  onStartOwn?: () => void;
}

export function DemoBanner({ onStartOwn }: DemoBannerProps) {
  return (
    <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 mb-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
            <Eye className="w-4 h-4 text-teal-600" />
          </div>
          <div>
            <p className="font-medium text-teal-800 text-sm">Demo Mode - View Only</p>
            <p className="text-teal-700 text-xs">
              You are viewing a demo comparison. Data cannot be modified.
            </p>
          </div>
        </div>
        {onStartOwn && (
          <button
            onClick={onStartOwn}
            className="flex items-center gap-2 px-3 py-1.5 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors whitespace-nowrap"
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Start Your Own</span>
          </button>
        )}
      </div>
    </div>
  );
}
