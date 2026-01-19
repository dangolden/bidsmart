import { useState, useEffect } from 'react';
import { 
  MessageSquareText, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp,
  Copy, Check, HelpCircle
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import type { ContractorBid, BidQuestion, QuestionPriority } from '../lib/types';

interface ContractorQuestionsProps {
  projectId: string;
  bids: ContractorBid[];
}

interface GeneratedQuestion {
  text: string;
  category: string;
  priority: QuestionPriority;
  missingField: string;
}

export function ContractorQuestions({ projectId, bids }: ContractorQuestionsProps) {
  const [questions, setQuestions] = useState<Record<string, BidQuestion[]>>({});
  const [expandedBid, setExpandedBid] = useState<string | null>(bids[0]?.id || null);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    loadOrGenerateQuestions();
  }, [bids]);

  async function loadOrGenerateQuestions() {
    const questionsMap: Record<string, BidQuestion[]> = {};

    for (const bid of bids) {
      // Try to load existing questions
      const { data: existingQuestions } = await supabase
        .from('bid_questions')
        .select('*')
        .eq('bid_id', bid.id)
        .order('priority', { ascending: true })
        .order('display_order', { ascending: true });

      if (existingQuestions && existingQuestions.length > 0) {
        questionsMap[bid.id] = existingQuestions;
      } else {
        // Generate questions based on missing info
        const generated = generateQuestionsForBid(bid);
        
        // Save to database
        if (generated.length > 0) {
          const toInsert = generated.map((q, i) => ({
            bid_id: bid.id,
            question_text: q.text,
            question_category: q.category,
            priority: q.priority,
            missing_field: q.missingField,
            auto_generated: true,
            display_order: i,
          }));

          const { data: inserted } = await supabase
            .from('bid_questions')
            .insert(toInsert)
            .select();

          questionsMap[bid.id] = inserted || [];
        } else {
          questionsMap[bid.id] = [];
        }
      }
    }

    setQuestions(questionsMap);
    setLoading(false);
  }

  function generateQuestionsForBid(bid: ContractorBid): GeneratedQuestion[] {
    const questions: GeneratedQuestion[] = [];

    // Pricing questions
    if (!bid.equipment_cost && !bid.labor_cost) {
      questions.push({
        text: 'Can you provide a breakdown of equipment vs. labor costs?',
        category: 'pricing',
        priority: 'medium',
        missingField: 'cost_breakdown',
      });
    }

    // Warranty questions
    if (!bid.labor_warranty_years) {
      questions.push({
        text: 'What is your labor warranty period?',
        category: 'warranty',
        priority: 'high',
        missingField: 'labor_warranty_years',
      });
    }

    if (!bid.equipment_warranty_years) {
      questions.push({
        text: 'What is the equipment/manufacturer warranty period?',
        category: 'warranty',
        priority: 'high',
        missingField: 'equipment_warranty_years',
      });
    }

    // Timeline questions
    if (!bid.estimated_days) {
      questions.push({
        text: 'How many days will the installation take?',
        category: 'timeline',
        priority: 'medium',
        missingField: 'estimated_days',
      });
    }

    if (!bid.start_date_available) {
      questions.push({
        text: 'What is your earliest available start date?',
        category: 'timeline',
        priority: 'medium',
        missingField: 'start_date_available',
      });
    }

    // Credentials questions
    if (!bid.contractor_license) {
      questions.push({
        text: "What is your contractor's license number?",
        category: 'credentials',
        priority: 'high',
        missingField: 'contractor_license',
      });
    }

    if (!bid.contractor_years_in_business) {
      questions.push({
        text: 'How many years has your company been in business?',
        category: 'credentials',
        priority: 'low',
        missingField: 'contractor_years_in_business',
      });
    }

    if (!bid.contractor_certifications || bid.contractor_certifications.length === 0) {
      questions.push({
        text: 'What professional certifications do your technicians hold (NATE, EPA 608, manufacturer certifications)?',
        category: 'credentials',
        priority: 'medium',
        missingField: 'contractor_certifications',
      });
    }

    // Scope questions
    if (!bid.scope_summary) {
      questions.push({
        text: 'Can you provide a detailed scope of work for this installation?',
        category: 'scope',
        priority: 'high',
        missingField: 'scope_summary',
      });
    }

    // Equipment questions - these are important for spec comparison
    questions.push({
      text: 'What is the SEER2 and HSPF2 rating of the proposed equipment?',
      category: 'equipment',
      priority: 'high',
      missingField: 'efficiency_ratings',
    });

    // Standard quality questions (always ask)
    questions.push({
      text: 'Will you perform a Manual J load calculation for my home?',
      category: 'scope',
      priority: 'high',
      missingField: 'manual_j',
    });

    questions.push({
      text: 'Will the installation include a commissioning report with all measurements documented?',
      category: 'scope',
      priority: 'medium',
      missingField: 'commissioning',
    });

    questions.push({
      text: 'Are permits and inspections included in the bid?',
      category: 'scope',
      priority: 'high',
      missingField: 'permits',
    });

    // Remove duplicates based on missing field
    const seen = new Set<string>();
    return questions.filter(q => {
      if (seen.has(q.missingField)) return false;
      seen.add(q.missingField);
      return true;
    });
  }

  async function markAsAnswered(questionId: string, bidId: string) {
    await supabase
      .from('bid_questions')
      .update({ 
        is_answered: true, 
        answered_at: new Date().toISOString() 
      })
      .eq('id', questionId);

    setQuestions(prev => ({
      ...prev,
      [bidId]: prev[bidId].map(q => 
        q.id === questionId ? { ...q, is_answered: true, answered_at: new Date().toISOString() } : q
      ),
    }));
  }

  async function copyAllQuestions(bidId: string) {
    const bidQuestions = questions[bidId]?.filter(q => !q.is_answered) || [];
    const text = bidQuestions.map((q, i) => `${i + 1}. ${q.question_text}`).join('\n');
    
    await navigator.clipboard.writeText(text);
    setCopiedId(bidId);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function getPriorityBadge(priority: QuestionPriority) {
    const config = {
      high: { label: 'Important', className: 'bg-red-100 text-red-800' },
      medium: { label: 'Recommended', className: 'bg-yellow-100 text-yellow-800' },
      low: { label: 'Nice to know', className: 'bg-gray-100 text-gray-700' },
    };
    const { label, className } = config[priority];
    return <span className={`text-xs px-2 py-0.5 rounded-full ${className}`}>{label}</span>;
  }

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Loading questions...</div>;
  }

  if (bids.length === 0) {
    return (
      <div className="text-center py-12">
        <HelpCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Bids Yet</h3>
        <p className="text-gray-600">Upload some bids to see personalized questions for each contractor.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-1">Questions to Ask Each Contractor</h3>
        <p className="text-sm text-blue-700">
          Based on what's missing from each bid, here are personalized questions to ask. 
          Getting answers will help you make a more informed comparison.
        </p>
      </div>

      <div className="space-y-4">
        {bids.map((bid) => {
          const bidQuestions = questions[bid.id] || [];
          const unanswered = bidQuestions.filter(q => !q.is_answered);
          const answered = bidQuestions.filter(q => q.is_answered);
          const isExpanded = expandedBid === bid.id;

          return (
            <div key={bid.id} className="card overflow-hidden">
              {/* Header */}
              <button
                onClick={() => setExpandedBid(isExpanded ? null : bid.id)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <MessageSquareText className="w-5 h-5 text-gray-400" />
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900">{bid.contractor_name}</h3>
                    <p className="text-sm text-gray-500">
                      {unanswered.length} question{unanswered.length !== 1 ? 's' : ''} to ask
                      {answered.length > 0 && ` • ${answered.length} answered`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {unanswered.length === 0 ? (
                    <span className="status-badge status-complete">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Complete
                    </span>
                  ) : (
                    <span className="status-badge status-review">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      {unanswered.filter(q => q.priority === 'high').length} important
                    </span>
                  )}
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </button>

              {/* Content */}
              {isExpanded && (
                <div className="border-t border-gray-100 p-4 space-y-4">
                  {/* Copy All Button */}
                  {unanswered.length > 0 && (
                    <div className="flex justify-end">
                      <button
                        onClick={() => copyAllQuestions(bid.id)}
                        className="btn btn-secondary text-sm"
                      >
                        {copiedId === bid.id ? (
                          <>
                            <Check className="w-4 h-4 text-green-600" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            Copy All Questions
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Unanswered Questions */}
                  {unanswered.length > 0 && (
                    <div className="space-y-3">
                      {unanswered.map((question, index) => (
                        <div 
                          key={question.id} 
                          className={`question-card ${question.priority === 'high' ? 'high-priority' : ''}`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                                {getPriorityBadge(question.priority)}
                              </div>
                              <p className="text-gray-900">{question.question_text}</p>
                            </div>
                            <button
                              onClick={() => markAsAnswered(question.id, bid.id)}
                              className="btn btn-ghost text-sm text-gray-500 hover:text-green-600"
                              title="Mark as answered"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Answered Questions */}
                  {answered.length > 0 && (
                    <div className="mt-6">
                      <h4 className="text-sm font-medium text-gray-500 mb-3">
                        Answered ({answered.length})
                      </h4>
                      <div className="space-y-2">
                        {answered.map((question) => (
                          <div key={question.id} className="question-card answered opacity-60">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                              <p className="text-gray-600 line-through">{question.question_text}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* All Answered State */}
                  {unanswered.length === 0 && answered.length > 0 && (
                    <div className="text-center py-4 text-green-600">
                      <CheckCircle2 className="w-8 h-8 mx-auto mb-2" />
                      <p className="font-medium">All questions answered!</p>
                    </div>
                  )}

                  {/* No Questions */}
                  {bidQuestions.length === 0 && (
                    <div className="text-center py-4 text-gray-500">
                      <p>This bid appears to be complete - no additional questions needed.</p>
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
