import { useState } from 'react';
import { ChevronDown, ChevronRight, Lightbulb } from 'lucide-react';
import type { ProjectFaq } from '../lib/types';

interface OverallFaqsCardProps {
  faqs: ProjectFaq[];
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

  if (faqs.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl border-2 border-gray-200 shadow-md overflow-hidden">
      <div className="bg-gradient-to-r from-switch-green-600 to-switch-green-700 px-5 py-4">
        <div className="flex items-center gap-3">
          <Lightbulb className="w-6 h-6 text-white" />
          <div>
            <h3 className="font-bold text-white text-lg">Overall Comparison Common Questions</h3>
            <p className="text-switch-green-100 text-sm">General questions about your bids</p>
          </div>
        </div>
      </div>

      <div className="divide-y divide-gray-200">
        {faqs.map((faq) => {
          const isExpanded = expandedFaqs.has(faq.id);
          const hasAnswer = faq.answer;

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
                    <p className="font-medium text-gray-900 pr-4">{faq.question}</p>
                    {/* answer_confidence not available for overall FAQs */}
                  </div>

                  {!hasAnswer && !isExpanded && (
                    <p className="text-sm text-gray-500 mt-1">
                      Being analyzed...
                    </p>
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="px-5 pb-5 pl-14">
                  {hasAnswer ? (
                    <div className="prose prose-sm max-w-none">
                      <p className="text-gray-700 whitespace-pre-wrap">{faq.answer}</p>
                    </div>
                  ) : (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <p className="text-sm text-amber-800">
                        This answer is being generated during bid analysis. The AI will review all your
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
