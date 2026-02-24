import { useState, useEffect } from 'react';
import { Mail, Clock, Upload, Zap, CheckCircle2, Loader2, Bell, BellOff, FlaskConical, MapPin } from 'lucide-react';

interface AnalysisSubmissionInterstitialProps {
  email: string;
  onEmailChange: (email: string) => void;
  zip: string;
  onZipChange: (zip: string) => void;
  notifyOnCompletion: boolean;
  onNotifyChange: (notify: boolean) => void;
  enableSound: boolean;
  onEnableSoundChange: (enable: boolean) => void;
  onRequestNotificationPermission: () => Promise<string>;
  notificationPermission: string;
  bidCount: number;
  onSaveAndContinue: () => void;
  isSaving: boolean;
}

export function AnalysisSubmissionInterstitial({
  email,
  onEmailChange,
  zip,
  onZipChange,
  notifyOnCompletion,
  onNotifyChange,
  enableSound,
  onEnableSoundChange,
  onRequestNotificationPermission,
  notificationPermission,
  bidCount,
  onSaveAndContinue,
  isSaving,
}: AnalysisSubmissionInterstitialProps) {
  const [emailError, setEmailError] = useState('');
  const [showPermissionInfo, setShowPermissionInfo] = useState(false);

  const validateEmail = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!value.trim()) {
      setEmailError('Email is required');
      return false;
    }
    if (!emailRegex.test(value.trim())) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    setEmailError('');
    return true;
  };

  useEffect(() => {
    if (email) {
      validateEmail(email);
    }
  }, [email]);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onEmailChange(value);
    if (value) {
      validateEmail(value);
    }
  };

  const handleContinue = () => {
    if (validateEmail(email)) {
      onSaveAndContinue();
    }
  };

  const isValid = email.trim() && !emailError;

  return (
    <div className="min-h-screen bg-gradient-to-br from-switch-green-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-switch-green-600 to-switch-green-700 px-8 py-6 text-white">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Starting Your Analysis</h1>
                <p className="text-switch-green-100 text-sm">
                  {bidCount} bid{bidCount !== 1 ? 's' : ''} ready to compare
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-8 py-6 space-y-6">
            {/* Beta Timing Notice */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <FlaskConical className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-900 mb-1">
                    Beta Processing Time
                  </p>
                  <p className="text-sm text-amber-800">
                    Analysis typically takes <strong>10-30 minutes</strong> during our beta phase. 
                    You can leave this page and we'll email you when ready.
                  </p>
                </div>
              </div>
            </div>

            {/* What Happens Next */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">What happens next:</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Upload className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Upload & Secure</p>
                    <p className="text-xs text-gray-600">Your PDFs are uploaded securely to our servers</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Zap className="w-3.5 h-3.5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">AI Extraction</p>
                    <p className="text-xs text-gray-600">Our AI extracts pricing, equipment, and contractor details</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-switch-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-switch-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Results Ready</p>
                    <p className="text-xs text-gray-600">Compare bids side-by-side with personalized insights</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Email Input */}
            <div>
              <label htmlFor="notification-email" className="block text-sm font-semibold text-gray-900 mb-2">
                Email Address
              </label>
              <p className="text-xs text-gray-600 mb-3">
                We'll notify you when your analysis is complete
              </p>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="notification-email"
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  placeholder="you@example.com"
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-switch-green-500 focus:border-transparent ${
                    emailError ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  disabled={isSaving}
                />
              </div>
              {emailError && (
                <p className="text-sm text-red-600 mt-1">{emailError}</p>
              )}
            </div>

            {/* Zip Code Input */}
            <div>
              <label htmlFor="property-zip" className="block text-sm font-semibold text-gray-900 mb-2">
                Property Zip Code
                <span className="text-gray-400 font-normal ml-1">(optional)</span>
              </label>
              <p className="text-xs text-gray-600 mb-3">
                Used to find available rebates and incentives in your area
              </p>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="property-zip"
                  type="text"
                  inputMode="numeric"
                  value={zip}
                  onChange={(e) => onZipChange(e.target.value.replace(/\D/g, '').slice(0, 5))}
                  placeholder="e.g. 90210"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-switch-green-500 focus:border-transparent"
                  maxLength={5}
                  disabled={isSaving}
                />
              </div>
            </div>

            {/* Notification Preferences */}
            <div className="space-y-3 bg-gray-50 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-900">Notification Preferences</h3>
              
              {/* Email Notification Toggle */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyOnCompletion}
                  onChange={(e) => onNotifyChange(e.target.checked)}
                  className="w-5 h-5 mt-0.5 rounded border-gray-300 text-switch-green-600 focus:ring-switch-green-500"
                  disabled={isSaving}
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-900">
                    Email me when analysis is complete
                  </span>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Recommended - you can close this page and return later
                  </p>
                </div>
              </label>

              {/* Sound Notification Toggle */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableSound}
                  onChange={(e) => onEnableSoundChange(e.target.checked)}
                  className="w-5 h-5 mt-0.5 rounded border-gray-300 text-switch-green-600 focus:ring-switch-green-500"
                  disabled={isSaving}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {enableSound ? (
                      <Bell className="w-4 h-4 text-gray-600" />
                    ) : (
                      <BellOff className="w-4 h-4 text-gray-400" />
                    )}
                    <span className="text-sm font-medium text-gray-900">
                      Play sound when complete
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5">
                    One-time alert beep (only if you stay on this page)
                  </p>
                </div>
              </label>

              {/* Browser Notification Permission */}
              {notificationPermission !== 'granted' && notificationPermission !== 'denied' && (
                <div className="pt-2 border-t border-gray-200">
                  <button
                    onClick={async () => {
                      const result = await onRequestNotificationPermission();
                      if (result === 'granted') {
                        setShowPermissionInfo(false);
                      }
                    }}
                    className="text-sm text-switch-green-600 hover:text-switch-green-700 font-medium flex items-center gap-2"
                    disabled={isSaving}
                  >
                    <Bell className="w-4 h-4" />
                    Enable desktop notifications (optional)
                  </button>
                  {showPermissionInfo && (
                    <p className="text-xs text-gray-600 mt-2">
                      Desktop notifications work even when this tab is in the background
                    </p>
                  )}
                </div>
              )}

              {notificationPermission === 'granted' && (
                <div className="flex items-center gap-2 text-xs text-switch-green-700 bg-switch-green-50 rounded px-3 py-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Desktop notifications enabled
                </div>
              )}
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900 mb-1">
                    You can leave this page
                  </p>
                  <p className="text-sm text-blue-800">
                    Your analysis will continue in the background. Use your email address to find your results on the home page when you return.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-8 py-6 bg-gray-50 border-t border-gray-200">
            <button
              onClick={handleContinue}
              disabled={!isValid || isSaving}
              className="w-full btn btn-primary py-4 text-base font-semibold"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Starting Analysis...
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  Start Analysis
                </>
              )}
            </button>
            <p className="text-xs text-center text-gray-500 mt-3">
              By continuing, your bids will be uploaded and analyzed. This typically takes 10-30 minutes.
            </p>
          </div>
        </div>

        {/* Additional Info */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-600">
            Questions? Your data is secure and private. 
            <button className="text-switch-green-600 hover:text-switch-green-700 ml-1 underline">
              Learn more
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
