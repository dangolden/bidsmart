import { useState } from 'react';
import { ChevronDown, ChevronRight, Lightbulb, CheckCircle, AlertCircle } from 'lucide-react';
import type { OverallFaq } from '../lib/types';

interface OverallFaqsCardProps {
  faqs: OverallFaq[];
}

export function OverallFaqsCard({ faqs }: OverallFaqsCardProps) {
  const [expandedFaqs, setExpandedFaqs] = useState<Set<string>>(new Set());

  const toggleExpand = (faqId: string) => {
    const newExpanded = new Set(expandedFaqs);
    if (newExpanded.has(faqId)) {
      newExpanded.delete(faqId);
    } else {
      newExpanded.add(faqId);
    }
    setExpandedFaqs(newExpanded);
  };

  const getConfidenceBadge = (confidence?: string | null) => {
    if (!confidence) return null;

    const badgeConfig = {
      high: { color: 'bg-switch-green-100 text-switch-green-700', icon: CheckCircle },
      medium: { color: 'bg-amber-100 text-amber-700', icon: AlertCircle },
      low: { color: 'bg-gray-100 text-gray-600', icon: AlertCircle },
    };

    const config = badgeConfig[confidence as keyof typeof badgeConfig];
    if (!config) return null;

    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3" />
      </span>
    );
  };

  if (faqs.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl border-2 border-gray-200 shadow-md overflow-hidden">
      <div className="bg-gradient-to-r from-switch-green-600 to-switch-green-700 px-5 py-4">
        <div className="flex items-center gap-3">
          <Lightbulb className="w-6 h-6 text-white" />
          <div>
            <h3 className="font-bold text-white text-lg">Overall Comparison FAQs</h3>
            <p className="text-switch-green-100 text-sm">General questions about your bids</p>
          </div>
        </div>
      </div>

      <div className="divide-y divide-gray-200">
        {faqs.map((faq) => {
          const isExpanded = expandedFaqs.has(faq.id);
          const hasAnswer = faq.answer_text;

          return (
            <div key={faq.id} className={hasAnswer ? '' : 'bg-gray-50'}>
              <button
                onClick={() => toggleExpand(faq.id)}
                className="w-full px-5 py-4 flex items-start gap-3 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="pt-0.5">
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-500" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium text-gray-900 pr-4">{faq.question_text}</p>
                    {hasAnswer && getConfidenceBadge(faq.answer_confidence)}
                  </div>

                  {!hasAnswer && !isExpanded && (
                    <p className="text-sm text-gray-500 mt-1">
                      Answer pending from AI analysis
                    </p>
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="px-5 pb-5 pl-14">
                  {hasAnswer ? (
                    <div className="prose prose-sm max-w-none">
                      <p className="text-gray-700 whitespace-pre-wrap">{faq.answer_text}</p>
                    </div>
                  ) : (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <p className="text-sm text-amber-800">
                        This answer will be generated during bid analysis. The AI will review all your
                        bids and provide insights to help you make an informed decision.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
