import { useState } from 'react';
import { ChevronDown, ChevronRight, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import type { BidQuestion, QuestionTier, QuestionCategory } from '../../lib/types';
import { TIER_CONFIG, CATEGORY_CONFIG } from '../../lib/types/questions';

interface QuestionCardProps {
  question: BidQuestion;
  isSelected: boolean;
  onToggleSelected: () => void;
  onToggleAnswered: () => void;
}

export function QuestionCard({ question, isSelected, onToggleSelected, onToggleAnswered }: QuestionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const tier = (question.question_tier || 'clarification') as QuestionTier;
  const tierConfig = TIER_CONFIG[tier];
  const category = (question.question_category || question.category) as QuestionCategory | null | undefined;
  const categoryConfig = category && category in CATEGORY_CONFIG ? CATEGORY_CONFIG[category] : null;

  const priorityConfig = {
    high: { color: 'bg-red-100 text-red-700', label: 'High', icon: AlertTriangle },
    medium: { color: 'bg-amber-100 text-amber-700', label: 'Medium', icon: Info },
    low: { color: 'bg-gray-100 text-gray-600', label: 'Low', icon: Info },
  };
  const priority = priorityConfig[(question.priority ?? 'medium') as keyof typeof priorityConfig] || priorityConfig.medium;
  const PriorityIcon = priority.icon;

  return (
    <div className={`question-card tier-${tier} rounded-lg border overflow-hidden transition-colors ${
      question.is_answered ? 'bg-gray-50 border-gray-200 opacity-70' : 'bg-white border-gray-200'
    }`}>
      <div className="flex items-start gap-3 px-4 py-3">
        {/* Checkbox for email selection */}
        {!question.is_answered && (
          <div className="pt-0.5 flex-shrink-0">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onToggleSelected}
              className="w-4 h-4 rounded border-gray-300 text-switch-green-600 focus:ring-switch-green-500 cursor-pointer"
            />
          </div>
        )}

        {/* Expand/collapse toggle */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="pt-0.5 flex-shrink-0"
        >
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {/* Question content */}
        <div className="flex-1 min-w-0">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-left w-full"
          >
            <p className={`font-medium text-gray-900 ${question.is_answered ? 'line-through text-gray-500' : ''}`}>
              {question.question_text}
            </p>
          </button>

          {/* Badges row */}
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {/* Tier badge */}
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${tierConfig.bgColor} ${tierConfig.textColor}`}>
              {tierConfig.label}
            </span>

            {/* Priority badge */}
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${priority.color}`}>
              <PriorityIcon className="w-3 h-3" />
              {priority.label}
            </span>

            {/* Category badge */}
            {categoryConfig && (
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${categoryConfig.pillActive}`}>
                {categoryConfig.label}
              </span>
            )}

            {/* Answered indicator */}
            {question.is_answered && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                <CheckCircle2 className="w-3 h-3" />
                Answered
              </span>
            )}
          </div>
        </div>

        {/* Answered toggle */}
        <button
          onClick={onToggleAnswered}
          className="flex-shrink-0 pt-0.5"
          title={question.is_answered ? 'Mark as unanswered' : 'Mark as answered'}
        >
          <CheckCircle2 className={`w-5 h-5 transition-colors ${
            question.is_answered ? 'text-green-500' : 'text-gray-300 hover:text-green-400'
          }`} />
        </button>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 pl-16 space-y-3">
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
}
