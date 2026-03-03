import { useState } from 'react';
import { CheckCircle, AlertTriangle, Loader2, Clock, Volume2, VolumeX, Mail, Bell } from 'lucide-react';
import type { AnalysisStatus } from '../../lib/types';

interface AnalysisStatusBannerProps {
  status: AnalysisStatus;
  analyzedBidCount: number;
  totalBidCount: number;
  notificationEmail?: string;
}

function playNotificationSound() {
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch {
    // Audio not supported
  }
}

export function AnalysisStatusBanner({ status, analyzedBidCount, totalBidCount, notificationEmail }: AnalysisStatusBannerProps) {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);

  switch (status) {
    case 'processing':
      return (
        <div className="bg-amber-50 border border-amber-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Left: Status message */}
            <div className="flex items-start gap-3">
              <Loader2 className="w-5 h-5 text-amber-600 animate-spin flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-900">
                  Analyzing your bids
                  <span className="inline-flex ml-1">
                    <span className="animate-pulse">.</span>
                    <span className="animate-pulse" style={{ animationDelay: '0.2s' }}>.</span>
                    <span className="animate-pulse" style={{ animationDelay: '0.4s' }}>.</span>
                  </span>
                </p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Usually takes 10–30 min. We're reading every line, researching specs, and checking rebates.
                </p>
              </div>
            </div>

            {/* Right: Notification settings */}
            <div className="flex items-start gap-3 sm:border-l sm:border-amber-200 sm:pl-3">
              <Bell className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 space-y-1.5">
                <p className="text-xs font-medium text-gray-700">Notifications</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {soundEnabled ? (
                      <Volume2 className="w-3 h-3 text-gray-500" />
                    ) : (
                      <VolumeX className="w-3 h-3 text-gray-400" />
                    )}
                    <span className="text-xs text-gray-600">Sound alert</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => playNotificationSound()}
                      className="text-xs text-switch-green-600 hover:text-switch-green-700 underline"
                    >
                      Test
                    </button>
                    <button
                      onClick={() => setSoundEnabled(!soundEnabled)}
                      className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
                        soundEnabled ? 'bg-switch-green-600' : 'bg-gray-300'
                      }`}
                    >
                      <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                        soundEnabled ? 'translate-x-3.5' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>
                </div>
                {notificationEmail && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3 h-3 text-gray-500" />
                      <span className="text-xs text-gray-600 truncate max-w-[140px]">Email to {notificationEmail}</span>
                    </div>
                    <button
                      onClick={() => setEmailEnabled(!emailEnabled)}
                      className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
                        emailEnabled ? 'bg-switch-green-600' : 'bg-gray-300'
                      }`}
                    >
                      <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                        emailEnabled ? 'translate-x-3.5' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
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
