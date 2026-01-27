import { useState } from 'react';
import { Send, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface FeedbackPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

type FeedbackType = 'liked' | 'wishlist' | 'bug' | null;

export function FeedbackPanel({ isOpen, onClose }: FeedbackPanelProps) {
  const [feedbackType, setFeedbackType] = useState<FeedbackType>(null);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!feedbackType || !message.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase configuration missing');
      }

      const response = await fetch(
        `${supabaseUrl}/functions/v1/submit-feedback`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({
            type: feedbackType,
            message: message.trim(),
            url: window.location.href,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to submit feedback');
      }

      setSubmitted(true);
      setTimeout(() => {
        setFeedbackType(null);
        setMessage('');
        setSubmitted(false);
        onClose();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-xl">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Share Your Feedback</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {submitted ? (
            <div className="text-center py-8 space-y-3">
              <div className="w-12 h-12 bg-switch-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6 text-switch-green-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Thank you!</h3>
                <p className="text-sm text-gray-600 mt-1">Your feedback helps us improve BidSmart.</p>
              </div>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  What would you like to share?
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'liked', label: '👍 Loved it', description: 'Something you liked' },
                    { id: 'wishlist', label: '✨ Wishlist', description: 'Feature idea' },
                    { id: 'bug', label: '🐛 Bug report', description: 'Something broken' },
                  ].map((option) => (
                    <button
                      key={option.id}
                      onClick={() => {
                        setFeedbackType(option.id as FeedbackType);
                        setMessage('');
                      }}
                      className={`p-3 rounded-lg border-2 transition-all text-center ${
                        feedbackType === option.id
                          ? 'border-switch-green-500 bg-switch-green-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="text-xl mb-1">{option.label.split(' ')[0]}</div>
                      <div className="text-xs font-medium text-gray-600">{option.label.split(' ').slice(1).join(' ')}</div>
                    </button>
                  ))}
                </div>
              </div>

              {feedbackType && (
                <>
                  <div>
                    <label htmlFor="feedback-message" className="block text-sm font-medium text-gray-700 mb-2">
                      {feedbackType === 'liked' && 'What did you like?'}
                      {feedbackType === 'wishlist' && 'What would you like to see?'}
                      {feedbackType === 'bug' && 'Describe the issue'}
                    </label>
                    <textarea
                      id="feedback-message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Your feedback here..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-switch-green-500 focus:border-transparent resize-none h-24"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {message.length}/500
                    </p>
                  </div>

                  {error && (
                    <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => {
                        setFeedbackType(null);
                        setMessage('');
                        setError(null);
                      }}
                      className="flex-1 btn btn-secondary"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={!message.trim() || submitting || message.length > 500}
                      className="flex-1 btn btn-primary flex items-center justify-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Send Feedback
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
