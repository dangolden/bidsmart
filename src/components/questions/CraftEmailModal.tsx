import { useState, useMemo } from 'react';
import { X, Copy, Mail, Check } from 'lucide-react';
import type { BidQuestion, QuestionTier } from '../../lib/types';
import { TIER_CONFIG } from '../../lib/types/questions';

type Tone = 'friendly' | 'formal';

interface CraftEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  contractorName: string;
  contractorEmail?: string | null;
  questions: BidQuestion[];
}

export function CraftEmailModal({ isOpen, onClose, contractorName, contractorEmail, questions }: CraftEmailModalProps) {
  const [tone, setTone] = useState<Tone>('friendly');
  const [includeContext, setIncludeContext] = useState(false);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(() => new Set(questions.map(q => q.id)));
  const [copied, setCopied] = useState(false);

  const checkedQuestions = useMemo(
    () => questions.filter(q => checkedIds.has(q.id)),
    [questions, checkedIds]
  );

  const emailText = useMemo(() => {
    const greeting = tone === 'friendly'
      ? `Hi ${contractorName.split(' ')[0] || contractorName},\n\nThank you for your bid! I have a few questions before making my decision:\n`
      : `Dear ${contractorName},\n\nThank you for submitting your proposal. I would appreciate clarification on the following:\n`;

    const questionLines = checkedQuestions.map((q, i) => {
      let line = `${i + 1}. ${q.question_text}`;
      if (includeContext && q.context) {
        line += `\n   (Context: ${q.context})`;
      }
      return line;
    }).join('\n\n');

    const closing = tone === 'friendly'
      ? `\nThanks for your time! Looking forward to hearing back.\n\nBest regards`
      : `\nI would appreciate your response at your earliest convenience.\n\nSincerely`;

    return `${greeting}\n${questionLines}\n${closing}`;
  }, [checkedQuestions, contractorName, tone, includeContext]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(emailText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleMailto = () => {
    if (!contractorEmail) return;
    const subject = encodeURIComponent(`Questions about your bid - ${contractorName}`);
    const body = encodeURIComponent(emailText);
    window.open(`mailto:${contractorEmail}?subject=${subject}&body=${body}`, '_blank');
  };

  const toggleCheck = (id: string) => {
    setCheckedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Craft Email to {contractorName}</h3>
            <p className="text-sm text-gray-500 mt-0.5">{checkedQuestions.length} questions selected</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Controls row */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Tone:</span>
              <button
                onClick={() => setTone('friendly')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  tone === 'friendly' ? 'bg-switch-green-600 text-white' : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Friendly
              </button>
              <button
                onClick={() => setTone('formal')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  tone === 'formal' ? 'bg-switch-green-600 text-white' : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Formal
              </button>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeContext}
                onChange={e => setIncludeContext(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-switch-green-600 focus:ring-switch-green-500"
              />
              <span className="text-sm text-gray-700">Include context</span>
            </label>
          </div>

          {/* Question checklist */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Questions to include:</p>
            {questions.map(q => {
              const tier = (q.question_tier || 'clarification') as QuestionTier;
              const tierConfig = TIER_CONFIG[tier];
              return (
                <label key={q.id} className="flex items-start gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checkedIds.has(q.id)}
                    onChange={() => toggleCheck(q.id)}
                    className="mt-0.5 w-4 h-4 rounded border-gray-300 text-switch-green-600 focus:ring-switch-green-500"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{q.question_text}</p>
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium mt-1 ${tierConfig.bgColor} ${tierConfig.textColor}`}>
                      {tierConfig.label}
                    </span>
                  </div>
                </label>
              );
            })}
          </div>

          {/* Email preview */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Preview:</p>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-64 overflow-y-auto">
              <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans">{emailText}</pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button onClick={onClose} className="btn btn-ghost text-sm">
            Cancel
          </button>
          {contractorEmail && (
            <button onClick={handleMailto} className="btn btn-secondary text-sm">
              <Mail className="w-4 h-4" />
              Open in Mail App
            </button>
          )}
          <button onClick={handleCopy} className="btn btn-primary text-sm">
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy to Clipboard
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
