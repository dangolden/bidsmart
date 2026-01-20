import { useState, useEffect } from 'react';
import { DollarSign, HelpCircle, ChevronDown, ChevronUp, Copy, Check, ArrowRight, Star, CheckCircle } from 'lucide-react';
import { usePhase } from '../../context/PhaseContext';
import { supabase } from '../../lib/supabaseClient';
import type { BidQuestion, RebateProgram } from '../../lib/types';

type DecideTab = 'rebates' | 'questions';

export function DecidePhase() {
  const { bids, questions, refreshQuestions, completePhase } = usePhase();
  const [activeTab, setActiveTab] = useState<DecideTab>('rebates');
  const [rebatePrograms, setRebatePrograms] = useState<RebateProgram[]>([]);
  const [expandedContractor, setExpandedContractor] = useState<string | null>(null);
  const [copiedContractor, setCopiedContractor] = useState<string | null>(null);

  useEffect(() => {
    loadRebatePrograms();
  }, []);

  const loadRebatePrograms = async () => {
    const { data } = await supabase
      .from('rebate_programs')
      .select('*')
      .eq('is_active', true)
      .order('program_name');

    setRebatePrograms(data || []);
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const toggleQuestionAnswered = async (question: BidQuestion) => {
    await supabase
      .from('bid_questions')
      .update({
        is_answered: !question.is_answered,
        answered_at: !question.is_answered ? new Date().toISOString() : null,
      })
      .eq('id', question.id);

    refreshQuestions();
  };

  const getQuestionsForBid = (bidId: string): BidQuestion[] => {
    return questions.filter((q) => q.bid_id === bidId);
  };

  const copyQuestionsToClipboard = (bidId: string, contractorName: string) => {
    const bidQuestions = getQuestionsForBid(bidId);
    const unansweredQuestions = bidQuestions.filter((q) => !q.is_answered);

    const text = `Questions for ${contractorName}:\n\n${unansweredQuestions
      .map((q, i) => `${i + 1}. ${q.question_text}`)
      .join('\n\n')}`;

    navigator.clipboard.writeText(text);
    setCopiedContractor(bidId);
    setTimeout(() => setCopiedContractor(null), 2000);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700';
      case 'medium':
        return 'bg-amber-100 text-amber-700';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getBidCostBreakdown = () => {
    return bids.map((b) => {
      const estimatedRebates = b.bid.estimated_rebates || 0;
      const netCost = b.bid.total_bid_amount - estimatedRebates;

      return {
        bidId: b.bid.id,
        contractor: b.bid.contractor_name || b.bid.contractor_company || 'Unknown',
        bidAmount: b.bid.total_bid_amount,
        estimatedRebates,
        netCost,
      };
    });
  };

  const costBreakdown = getBidCostBreakdown();
  const lowestNetCost = Math.min(...costBreakdown.map((c) => c.netCost));

  const tabs: { key: DecideTab; label: string; icon: React.ReactNode }[] = [
    { key: 'rebates', label: 'Rebates & Incentives', icon: <DollarSign className="w-4 h-4" /> },
    { key: 'questions', label: 'Questions to Ask', icon: <HelpCircle className="w-4 h-4" /> },
  ];

  const handleContinue = () => {
    completePhase(3);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Make Your Decision</h1>
        <p className="text-gray-600 mt-1">
          Review rebates, prepare questions, and choose your contractor.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`
                flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors
                ${activeTab === tab.key
                  ? 'text-switch-green-700 bg-switch-green-50 border-b-2 border-switch-green-600'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }
              `}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'rebates' && (
            <div className="space-y-6">
              {rebatePrograms.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Available Rebate Programs</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Program</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Requirements</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {rebatePrograms.map((program) => (
                          <tr key={program.id}>
                            <td className="px-3 py-3 font-medium text-gray-900">{program.program_name}</td>
                            <td className="px-3 py-3">
                              <span className={`
                                inline-block px-2 py-0.5 rounded text-xs font-medium capitalize
                                ${program.program_type === 'federal' ? 'bg-blue-100 text-blue-700' : ''}
                                ${program.program_type === 'state' ? 'bg-purple-100 text-purple-700' : ''}
                                ${program.program_type === 'utility' ? 'bg-amber-100 text-amber-700' : ''}
                                ${program.program_type === 'manufacturer' ? 'bg-gray-100 text-gray-700' : ''}
                              `}>
                                {program.program_type || 'Other'}
                              </span>
                            </td>
                            <td className="px-3 py-3 font-medium text-gray-900">
                              {program.max_rebate
                                ? `Up to ${formatCurrency(Number(program.max_rebate))}`
                                : program.rebate_amount
                                  ? formatCurrency(Number(program.rebate_amount))
                                  : '-'}
                            </td>
                            <td className="px-3 py-3 text-gray-600 text-xs">
                              {program.description || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Cost Comparison After Rebates</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="py-3 text-left text-sm font-medium text-gray-500"></th>
                        {costBreakdown.map((c) => (
                          <th key={c.bidId} className="py-3 px-4 text-center text-sm font-medium text-gray-900">
                            {c.contractor}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-100">
                        <td className="py-3 text-sm text-gray-600">Bid Amount:</td>
                        {costBreakdown.map((c) => (
                          <td key={c.bidId} className="py-3 px-4 text-center text-sm text-gray-900">
                            {formatCurrency(c.bidAmount)}
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-3 text-sm text-gray-600">Est. Rebates:</td>
                        {costBreakdown.map((c) => (
                          <td key={c.bidId} className="py-3 px-4 text-center text-sm text-switch-green-600">
                            {c.estimatedRebates > 0 ? `-${formatCurrency(c.estimatedRebates)}` : '-'}
                          </td>
                        ))}
                      </tr>
                      <tr className="border-t-2 border-gray-200">
                        <td className="py-3 text-sm font-semibold text-gray-900">Net Cost:</td>
                        {costBreakdown.map((c) => (
                          <td
                            key={c.bidId}
                            className={`py-3 px-4 text-center text-lg font-bold ${c.netCost === lowestNetCost ? 'text-switch-green-700' : 'text-gray-900'
                              }`}
                          >
                            {formatCurrency(c.netCost)}
                            {c.netCost === lowestNetCost && (
                              <span className="ml-2 inline-flex items-center">
                                <Star className="w-4 h-4 text-switch-green-600" />
                                <span className="text-xs font-normal text-switch-green-600 ml-1">BEST</span>
                              </span>
                            )}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">
                  <strong>Note:</strong> Rebate amounts shown are estimates based on the equipment in each bid.
                  Actual rebate eligibility and amounts may vary. Contact your contractor or rebate program
                  administrator to confirm your specific eligibility.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'questions' && (
            <div className="space-y-4">
              {bids.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No bids to show questions for.</p>
              ) : (
                bids.map((b) => {
                  const bidQuestions = getQuestionsForBid(b.bid.id);
                  const answeredCount = bidQuestions.filter((q) => q.is_answered).length;
                  const isExpanded = expandedContractor === b.bid.id;
                  const contractorName = b.bid.contractor_name || b.bid.contractor_company || 'Unknown';

                  return (
                    <div key={b.bid.id} className="border border-gray-200 rounded-lg overflow-hidden">
                      <button
                        onClick={() => setExpandedContractor(isExpanded ? null : b.bid.id)}
                        className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-gray-900">{contractorName}</span>
                          <span className="text-sm text-gray-500">
                            {answeredCount}/{bidQuestions.length} answered
                          </span>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </button>

                      {isExpanded && (
                        <div className="p-4 space-y-3">
                          {bidQuestions.length === 0 ? (
                            <p className="text-gray-500 text-sm text-center py-4">
                              No questions generated for this bid.
                            </p>
                          ) : (
                            <>
                              <div className="flex justify-end">
                                <button
                                  onClick={() => copyQuestionsToClipboard(b.bid.id, contractorName)}
                                  className="btn btn-secondary text-sm flex items-center gap-2"
                                >
                                  {copiedContractor === b.bid.id ? (
                                    <>
                                      <Check className="w-4 h-4" />
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

                              <div className="space-y-2">
                                {bidQuestions.map((question) => (
                                  <div
                                    key={question.id}
                                    className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${question.is_answered ? 'bg-gray-50' : 'bg-white border border-gray-200'
                                      }`}
                                  >
                                    <button
                                      onClick={() => toggleQuestionAnswered(question)}
                                      className="flex-shrink-0 mt-0.5"
                                    >
                                      {question.is_answered ? (
                                        <CheckCircle className="w-5 h-5 text-switch-green-600" />
                                      ) : (
                                        <div className="w-5 h-5 rounded-full border-2 border-gray-300 hover:border-gray-400" />
                                      )}
                                    </button>
                                    <div className="flex-1 min-w-0">
                                      <p className={`text-sm ${question.is_answered ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                                        {question.question_text}
                                      </p>
                                      <div className="flex items-center gap-2 mt-1">
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${getPriorityColor(question.priority)}`}>
                                          {question.priority}
                                        </span>
                                        {question.question_category && (
                                          <span className="text-xs text-gray-400 capitalize">
                                            {question.question_category}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleContinue}
          className="btn btn-primary flex items-center gap-2 px-6"
        >
          I have Made My Choice
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
