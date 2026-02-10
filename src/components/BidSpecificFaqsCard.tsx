import { useState } from 'react';
import { ChevronDown, ChevronRight, FileText, CheckCircle, AlertCircle, Award } from 'lucide-react';
import type { BidFaqSet } from '../lib/types';

interface BidSpecificFaqsCardProps {
  bidFaqSets: BidFaqSet[];
  switchPreferredBids?: Set<string>;
}

export function BidSpecificFaqsCard({ bidFaqSets, switchPreferredBids = new Set() }: BidSpecificFaqsCardProps) {
  const [activeTabIndex, setActiveTabIndex] = useState(0);
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

  if (bidFaqSets.length === 0) {
    return null;
  }

  const activeBidFaqSet = bidFaqSets[activeTabIndex];

  return (
    <div className="bg-white rounded-xl border-2 border-gray-200 shadow-md overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-4">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-white" />
          <div>
            <h3 className="font-bold text-white text-lg">Bid-Specific Common Questions</h3>
            <p className="text-blue-100 text-sm">Questions about each contractor's bid</p>
          </div>
        </div>
      </div>

      <div className="border-b border-gray-200 bg-gray-50">
        <div className="flex overflow-x-auto scrollbar-hide">
          {bidFaqSets.map((bidFaqSet, index) => {
            const isActive = activeTabIndex === index;
            const isPreferred = switchPreferredBids.has(bidFaqSet.bid_id);

            return (
              <button
                key={bidFaqSet.bid_id}
                onClick={() => setActiveTabIndex(index)}
                className={`
                  relative px-4 sm:px-6 py-3 text-sm font-medium whitespace-nowrap transition-all duration-200
                  flex items-center gap-2 border-b-2
                  ${isActive
                    ? 'text-blue-700 border-blue-600 bg-white'
                    : 'text-gray-600 border-transparent hover:text-gray-900 hover:bg-gray-100'
                  }
                `}
              >
                <span>{bidFaqSet.contractor_name}</span>
                {isPreferred && (
                  <Award className="w-3.5 h-3.5 text-switch-green-600" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="divide-y divide-gray-200">
        {activeBidFaqSet.faqs.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 text-sm">
              No common questions available for this bid yet. They will be generated during analysis.
            </p>
          </div>
        ) : (
          activeBidFaqSet.faqs.map((faq) => {
            const isExpanded = expandedFaqs.has(faq.id);
            const hasAnswer = faq.is_answered && faq.answer_text;

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
                        Being analyzed...
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
                          This answer is being generated during bid analysis. The AI will review {activeBidFaqSet.contractor_name}'s
                          bid and provide detailed insights to help you make an informed decision.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
