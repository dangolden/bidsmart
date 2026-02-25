import { useState, useEffect, useRef, useCallback } from 'react';
import { CheckCircle2, Clock, Mail, Play, ArrowLeft, Volume2, VolumeX, Bell, ArrowRight } from 'lucide-react';
import { AlphaBanner } from './AlphaBanner';
import { getProject } from '../lib/database/bidsmartService';

interface AnalysisSuccessScreenProps {
  email: string;
  projectId: string;
  onViewDemo: () => void;
  onReturnHome: () => void;
  onViewResults: () => void;
}

const POLLING_DELAY_MS = 90 * 1000; // 90 seconds before polling starts
const POLLING_INTERVAL_MS = 15 * 1000; // 15 seconds between polls

function playNotificationSound() {
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
}

export function AnalysisSuccessScreen({
  email,
  projectId,
  onViewDemo,
  onReturnHome,
  onViewResults
}: AnalysisSuccessScreenProps) {
  const [isComplete, setIsComplete] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [pollingActive, setPollingActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(POLLING_DELAY_MS / 1000);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasPlayedSound = useRef(false);

  const checkProjectStatus = useCallback(async () => {
    if (!projectId) return;
    
    try {
      const project = await getProject(projectId);
      if (project && (project.status === 'comparing' || project.status === 'completed')) {
        setIsComplete(true);
        if (soundEnabled && !hasPlayedSound.current) {
          playNotificationSound();
          hasPlayedSound.current = true;
        }
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      }
    } catch (error) {
      console.error('Error checking project status:', error);
    }
  }, [projectId, soundEnabled]);

  useEffect(() => {
    // Countdown timer until polling starts
    countdownIntervalRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Start polling after delay
    const delayTimeout = setTimeout(() => {
      setPollingActive(true);
      checkProjectStatus(); // Check immediately when polling starts
      pollingIntervalRef.current = setInterval(checkProjectStatus, POLLING_INTERVAL_MS);
    }, POLLING_DELAY_MS);

    return () => {
      clearTimeout(delayTimeout);
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [checkProjectStatus]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePreviewSound = () => {
    playNotificationSound();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-switch-green-50 via-white to-blue-50">
      <AlphaBanner />
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
          {/* Success/Complete Icon */}
          <div className={`w-16 h-16 ${isComplete ? 'bg-switch-green-500' : 'bg-switch-green-100'} rounded-full flex items-center justify-center mx-auto mb-6 transition-colors`}>
            <CheckCircle2 className={`w-8 h-8 ${isComplete ? 'text-white' : 'text-switch-green-600'}`} />
          </div>
          
          {/* Headline */}
          <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">
            {isComplete ? 'Analysis Complete!' : 'Analysis Started Successfully!'}
          </h1>
          <p className="text-center text-gray-600 mb-8">
            {isComplete 
              ? 'Your bid comparison is ready to view'
              : 'Your bids are being analyzed by our AI'
            }
          </p>

          {/* Analysis Complete Banner */}
          {isComplete && (
            <div className="bg-switch-green-50 border border-switch-green-200 rounded-xl p-6 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle2 className="w-6 h-6 text-switch-green-600" />
                <p className="font-semibold text-switch-green-900">
                  Your analysis is ready!
                </p>
              </div>
              <button
                onClick={onViewResults}
                className="w-full bg-switch-green-600 hover:bg-switch-green-700 text-white rounded-lg py-4 px-6 font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <ArrowRight className="w-5 h-5" />
                View Results
              </button>
            </div>
          )}
          
          {/* Timing Info - only show when not complete */}
          {!isComplete && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-6">
              <div className="flex items-start gap-3">
                <Clock className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-900 mb-2">
                    Expected Time: 20-30 minutes
                  </p>
                  <p className="text-sm text-amber-800 mb-3">
                    Our technology performs research and analysis involving sometimes 
                    hundreds of searches to give you the most comprehensive comparison.
                  </p>
                  {!pollingActive && (
                    <p className="text-xs text-amber-700">
                      Status check starts in: {formatTime(timeRemaining)}
                    </p>
                  )}
                  {pollingActive && (
                    <p className="text-xs text-amber-700">
                      ✓ Checking for results every 15 seconds...
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Notification Settings */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6">
            <p className="text-sm font-medium text-gray-900 mb-3">
              <Bell className="w-4 h-4 inline mr-2" />
              Notification Settings
            </p>
            
            {/* Sound Toggle */}
            <div className="flex items-center justify-between py-2 border-b border-gray-200">
              <div className="flex items-center gap-2">
                {soundEnabled ? (
                  <Volume2 className="w-4 h-4 text-gray-600" />
                ) : (
                  <VolumeX className="w-4 h-4 text-gray-400" />
                )}
                <span className="text-sm text-gray-700">Sound alert when ready</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePreviewSound}
                  className="text-xs text-switch-green-600 hover:text-switch-green-700 underline"
                >
                  Preview
                </button>
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    soundEnabled ? 'bg-switch-green-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      soundEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Email Toggle */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-600" />
                <span className="text-sm text-gray-700">Email notification to {email}</span>
              </div>
              <button
                onClick={() => setEmailEnabled(!emailEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  emailEnabled ? 'bg-switch-green-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    emailEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
          
          {/* CTAs */}
          <div className="space-y-3 mb-6">
            <button
              onClick={onViewDemo}
              className="w-full bg-switch-green-600 hover:bg-switch-green-700 text-white rounded-lg py-4 px-6 font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <Play className="w-5 h-5" />
              View a Sample Analysis
            </button>
            <button
              onClick={onReturnHome}
              className="w-full bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-lg py-3 px-6 font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Return to Home
            </button>
          </div>
          
          {/* Instructions */}
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-sm font-medium text-gray-900 mb-2">
              💡 To find your results later:
            </p>
            <p className="text-sm text-gray-600">
              Return to the home page and use the "Find Previous Analysis" 
              feature with your email address.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
