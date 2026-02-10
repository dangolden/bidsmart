import { CheckCircle2, Clock, Mail, Play, ArrowLeft } from 'lucide-react';
import { AlphaBanner } from './AlphaBanner';

interface AnalysisSuccessScreenProps {
  email: string;
  projectId: string;
  onViewDemo: () => void;
  onReturnHome: () => void;
}

export function AnalysisSuccessScreen({
  email,
  projectId,
  onViewDemo,
  onReturnHome
}: AnalysisSuccessScreenProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-switch-green-50 via-white to-blue-50">
      <AlphaBanner />
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
          {/* Success Icon */}
          <div className="w-16 h-16 bg-switch-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-switch-green-600" />
          </div>
          
          {/* Headline */}
          <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">
            Analysis Started Successfully!
          </h1>
          <p className="text-center text-gray-600 mb-8">
            Your bids are being analyzed by our AI
          </p>
          
          {/* Timing Info */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-6">
            <div className="flex items-start gap-3">
              <Clock className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900 mb-2">
                  Expected Time: 20-30 minutes
                </p>
                <p className="text-sm text-amber-800">
                  Our technology performs research and analysis involving sometimes 
                  hundreds of searches to give you the most comprehensive comparison.
                </p>
              </div>
            </div>
          </div>
          
          {/* Email Confirmation */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-900">
                  We'll email you at:
                </p>
                <p className="text-sm text-blue-800 font-semibold">
                  {email}
                </p>
              </div>
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
