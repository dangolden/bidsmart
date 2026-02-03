import { useState } from 'react';
import { MessageCircle, AlertTriangle, Info, CheckCircle2, ChevronDown, ChevronRight } from 'lucide-react';
import type { ClarificationQuestion } from '../lib/types';

interface ClarificationQuestionsSectionProps {
  questions: ClarificationQuestion[];
  className?: string;
}

export function ClarificationQuestionsSection({ questions, className = '' }: ClarificationQuestionsSectionProps) {
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set());

  const toggleExpand = (index: number) => {
    const newExpanded = new Set(expandedQuestions);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedQuestions(newExpanded);
  };

  const getPriorityBadge = (priority: 'high' | 'medium' | 'low') => {
    const config = {
      high: { color: 'bg-red-100 text-red-700', label: 'High Priority', icon: AlertTriangle },
      medium: { color: 'bg-amber-100 text-amber-700', label: 'Medium Priority', icon: Info },
      low: { color: 'bg-gray-100 text-gray-600', label: 'Low Priority', icon: Info },
    };

    const { color, label, icon: Icon } = config[priority];

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
        <Icon className="w-3 h-3" />
        {label}
      </span>
    );
  };

  const getCategoryBadge = (category: string) => {
    const categoryLabels: Record<string, string> = {
      pricing: 'Pricing',
      warranty: 'Warranty',
      equipment: 'Equipment',
      timeline: 'Timeline',
      scope: 'Scope of Work',
      credentials: 'Credentials',
      electrical: 'Electrical',
    };

    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
        {categoryLabels[category] || category}
      </span>
    );
  };

  if (!questions || questions.length === 0) {
    return (
      <div className={`bg-white rounded-xl border-2 border-gray-200 p-12 text-center ${className}`}>
        <CheckCircle2 className="w-12 h-12 text-switch-green-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Clarifications Needed</h3>
        <p className="text-gray-600">
          All bids appear complete with no missing information.
        </p>
      </div>
    );
  }

  const sortedQuestions = [...questions].sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority] || a.display_order - b.display_order;
  });

  const groupedByBid = sortedQuestions.reduce((acc, q) => {
    const key = `${q.bid_index}-${q.contractor_name}`;
    if (!acc[key]) {
      acc[key] = { bidIndex: q.bid_index, contractorName: q.contractor_name, questions: [] };
    }
    acc[key].questions.push(q);
    return acc;
  }, {} as Record<string, { bidIndex: number; contractorName: string; questions: ClarificationQuestion[] }>);

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="bg-white rounded-xl border-2 border-gray-200 shadow-md overflow-hidden">
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-4">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-white" />
            <h3 className="font-semibold text-white text-lg">
              Questions to Ask Contractors
            </h3>
          </div>
          <p className="text-amber-50 text-sm mt-1">
            Important clarifications identified by AI analysis
          </p>
        </div>

        <div className="divide-y divide-gray-200">
          {Object.values(groupedByBid).map((group, groupIndex) => (
            <div key={groupIndex} className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-semibold text-gray-700">
                  {group.bidIndex + 1}
                </div>
                <h4 className="font-semibold text-gray-900">{group.contractorName}</h4>
                <span className="text-sm text-gray-500">
                  ({group.questions.length} {group.questions.length === 1 ? 'question' : 'questions'})
                </span>
              </div>

              <div className="space-y-3">
                {group.questions.map((question, qIndex) => {
                  const isExpanded = expandedQuestions.has(groupIndex * 100 + qIndex);

                  return (
                    <div key={qIndex} className="border border-gray-200 rounded-lg overflow-hidden">
                      <button
                        onClick={() => toggleExpand(groupIndex * 100 + qIndex)}
                        className="w-full px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors text-left"
                      >
                        <div className="pt-0.5">
                          {isExpanded ? (
                            <ChevronDown className="w-5 h-5 text-gray-500" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-gray-500" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                            <p className="font-medium text-gray-900 pr-4">{question.question_text}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {getPriorityBadge(question.priority)}
                            {getCategoryBadge(question.question_category)}
                          </div>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="px-4 pb-4 pl-14 space-y-3">
                          {question.context && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                              <p className="text-sm font-medium text-blue-900 mb-1">Context</p>
                              <p className="text-sm text-blue-700">{question.context}</p>
                            </div>
                          )}

                          {question.good_answer_looks_like && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                              <p className="text-sm font-medium text-green-900 mb-1 flex items-center gap-1">
                                <CheckCircle2 className="w-4 h-4" />
                                Good Answer
                              </p>
                              <p className="text-sm text-green-700">{question.good_answer_looks_like}</p>
                            </div>
                          )}

                          {question.concerning_answer_looks_like && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                              <p className="text-sm font-medium text-red-900 mb-1 flex items-center gap-1">
                                <AlertTriangle className="w-4 h-4" />
                                Concerning Answer
                              </p>
                              <p className="text-sm text-red-700">{question.concerning_answer_looks_like}</p>
                            </div>
                          )}

                          {question.triggered_by && (
                            <div className="text-xs text-gray-500">
                              Triggered by: {question.triggered_by}
                              {question.missing_field && ` (missing: ${question.missing_field})`}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4">
        <div className="flex items-start gap-2">
          <Info className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-900">How to Use These Questions</p>
            <p className="text-sm text-amber-700 mt-1">
              Contact each contractor to ask these questions before making your final decision. 
              Their responses will help you identify the most thorough and reliable contractor.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
