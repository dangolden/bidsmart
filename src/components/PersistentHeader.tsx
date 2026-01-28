import { Home } from 'lucide-react';
import SwitchLogo from '../assets/switchlogo.svg';

interface PersistentHeaderProps {
  onNavigateHome?: () => void;
  showHomeButton?: boolean;
}

export function PersistentHeader({ onNavigateHome, showHomeButton = true }: PersistentHeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
      <div className="max-w-4xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={SwitchLogo} alt="SwitchIsOn" className="h-10 w-auto" />
            <div className="hidden sm:block">
              <h1 className="text-lg font-semibold text-gray-900">Heat Pump Bid Compare</h1>
              <p className="text-xs text-gray-500">Beta</p>
            </div>
          </div>

          {showHomeButton && onNavigateHome && (
            <button
              onClick={onNavigateHome}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-switch-green-600 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
