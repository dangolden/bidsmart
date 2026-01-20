import { useState, useEffect } from 'react';
import { DollarSign, Star, Shield, Zap, CheckCircle, Copy, Check, ArrowRight, HelpCircle, Award } from 'lucide-react';
import { usePhase } from '../../context/PhaseContext';
import { supabase } from '../../lib/supabaseClient';
import type { BidQuestion, RebateProgram } from '../../lib/types';

export function DecidePhase() {
  const { bids, questions, refreshQuestions, completePhase } = usePhase();
  const [rebatePrograms, setRebatePrograms] = useState<RebateProgram[]>([]);
  const [selectedContractor, setSelectedContractor] = useState<string | null>(null);
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
        return 'bg-red-100 text-red-700 border-red-200';
      case 'medium':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const getBidData = () => {
    return bids.map((b) => {
      const mainEquipment = b.equipment.find(
        (e) => e.equipment_type === 'outdoor_unit' || e.equipment_type === 'heat_pump'
      ) || b.equipment[0];

      const estimatedRebates = b.bid.estimated_rebates || 0;
      const netCost = b.bid.total_bid_amount - estimatedRebates;

      return {
        bidId: b.bid.id,
        contractor: b.bid.contractor_name || b.bid.contractor_company || 'Unknown',
        totalAmount: b.bid.total_bid_amount,
        estimatedRebates,
        netCost,
        equipmentBrand: mainEquipment?.brand || '-',
        equipmentModel: mainEquipment?.model_number || mainEquipment?.model_name || '-',
        seer2: mainEquipment?.seer2_rating || mainEquipment?.seer_rating,
        googleRating: b.bid.contractor_google_rating,
        reviewCount: b.bid.contractor_google_review_count,
        laborWarranty: b.bid.labor_warranty_years,
        equipmentWarranty: b.bid.equipment_warranty_years,
        isSwitchPreferred: b.bid.contractor_is_switch_preferred,
      };
    });
  };

  const bidData = getBidData();
  const lowestPrice = Math.min(...bidData.map((b) => b.totalAmount || Infinity));
  const lowestNetCost = Math.min(...bidData.map((b) => b.netCost || Infinity));
  const bestRating = Math.max(...bidData.map((b) => b.googleRating || 0));
  const bestSeer = Math.max(...bidData.map((b) => b.seer2 || 0));
  const bestWarranty = Math.max(...bidData.map((b) => (b.laborWarranty || 0) + (b.equipmentWarranty || 0)));

  const handleContinue = () => {
    completePhase(3);
  };

  const toggleSelection = (bidId: string) => {
    setSelectedContractor(selectedContractor === bidId ? null : bidId);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Make Your Decision</h1>
        <p className="text-gray-600 mt-1">
          Review each bid side by side, ask clarifying questions, and choose your contractor.
        </p>
      </div>

      {rebatePrograms.length > 0 && (
        <div className="bg-gradient-to-r from-switch-green-50 to-switch-green-100 border-2 border-switch-green-200 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-switch-green-600 rounded-full flex items-center justify-center flex-shrink-0">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-switch-green-900">Available Rebates & Incentives</h3>
              <p className="text-sm text-switch-green-700 mt-1">
                You may qualify for {rebatePrograms.length} rebate program{rebatePrograms.length !== 1 ? 's' : ''} totaling up to{' '}
                <span className="font-bold">
                  {formatCurrency(rebatePrograms.reduce((sum, p) => sum + (Number(p.max_rebate) || Number(p.rebate_amount) || 0), 0))}
                </span>{' '}
                in savings.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {bidData.map((bid) => {
          const bidQuestions = getQuestionsForBid(bid.bidId);
          const answeredCount = bidQuestions.filter((q) => q.is_answered).length;
          const unansweredQuestions = bidQuestions.filter((q) => !q.is_answered);
          const isSelected = selectedContractor === bid.bidId;

          const isBestPrice = bid.totalAmount === lowestPrice;
          const isBestNetCost = bid.netCost === lowestNetCost;
          const isBestRating = bid.googleRating === bestRating && bid.googleRating > 0;
          const isBestEfficiency = bid.seer2 === bestSeer && bid.seer2 > 0;
          const totalWarranty = (bid.laborWarranty || 0) + (bid.equipmentWarranty || 0);
          const isBestWarranty = totalWarranty === bestWarranty && totalWarranty > 0;

          return (
            <div
              key={bid.bidId}
              className={`
                relative bg-white rounded-xl overflow-hidden transition-all duration-200
                ${isSelected
                  ? 'ring-4 ring-switch-green-500 shadow-xl border-2 border-switch-green-500'
                  : 'border-2 border-gray-200 shadow-md hover:shadow-lg hover:border-gray-300'
                }
              `}
            >
              <div className={`
                absolute top-0 left-0 w-1.5 h-full
                ${isSelected ? 'bg-switch-green-500' : 'bg-gradient-to-b from-switch-green-400 to-switch-green-600'}
              `} />

              <div className="p-6 pl-8">
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-center gap-4">
                    <h3 className="text-xl font-bold text-gray-900">{bid.contractor}</h3>
                    {bid.isSwitchPreferred && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-switch-green-500 to-switch-green-600 text-white rounded-full text-xs font-medium">
                        <Award className="w-3 h-3" /> Switch Preferred
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {isSelected && (
                      <div className="w-8 h-8 bg-switch-green-500 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-white" />
                      </div>
                    )}
                    <button
                      onClick={() => toggleSelection(bid.bidId)}
                      className={`
                        py-2 px-4 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 text-sm
                        ${isSelected
                          ? 'bg-switch-green-600 text-white hover:bg-switch-green-700'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                        }
                      `}
                    >
                      {isSelected ? (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          My Choice
                        </>
                      ) : (
                        'Mark as My Choice'
                      )}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-5 space-y-4">
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5 border border-gray-200">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Total Price</span>
                        {isBestPrice && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-switch-green-600 text-white text-xs font-semibold rounded-full">
                            <Star className="w-3 h-3" /> LOWEST
                          </span>
                        )}
                      </div>
                      <div className={`text-3xl font-bold ${isBestPrice ? 'text-switch-green-700' : 'text-gray-900'}`}>
                        {formatCurrency(bid.totalAmount)}
                      </div>
                      {bid.estimatedRebates > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">Est. Rebates</span>
                            <span className="text-switch-green-600 font-semibold">-{formatCurrency(bid.estimatedRebates)}</span>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-sm font-semibold text-gray-700">Net Cost</span>
                            <span className={`text-xl font-bold ${isBestNetCost ? 'text-switch-green-700' : 'text-gray-900'}`}>
                              {formatCurrency(bid.netCost)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Zap className="w-4 h-4 text-amber-500" />
                          <span className="text-xs font-semibold text-gray-500 uppercase">Equipment</span>
                        </div>
                        <div className="text-sm font-bold text-gray-900" title={`${bid.equipmentBrand} ${bid.equipmentModel}`}>
                          {bid.equipmentBrand}
                        </div>
                        {bid.seer2 && (
                          <div className="flex items-center gap-1 mt-1">
                            <span className={`text-xs ${isBestEfficiency ? 'text-switch-green-700 font-bold' : 'text-gray-600'}`}>
                              SEER2: {bid.seer2}
                            </span>
                            {isBestEfficiency && <Star className="w-3 h-3 text-switch-green-600" />}
                          </div>
                        )}
                      </div>

                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Star className="w-4 h-4 text-yellow-500" />
                          <span className="text-xs font-semibold text-gray-500 uppercase">Rating</span>
                        </div>
                        {bid.googleRating ? (
                          <>
                            <div className={`text-sm font-bold ${isBestRating ? 'text-switch-green-700' : 'text-gray-900'}`}>
                              {bid.googleRating.toFixed(1)} / 5
                              {isBestRating && <Star className="w-3 h-3 inline ml-1 text-switch-green-600" />}
                            </div>
                            {bid.reviewCount && (
                              <div className="text-xs text-gray-500 mt-0.5">{bid.reviewCount} reviews</div>
                            )}
                          </>
                        ) : (
                          <div className="text-sm text-gray-400">N/A</div>
                        )}
                      </div>

                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Shield className="w-4 h-4 text-switch-green-600" />
                          <span className="text-xs font-semibold text-gray-500 uppercase">Warranty</span>
                        </div>
                        {(bid.laborWarranty || bid.equipmentWarranty) ? (
                          <div className="space-y-0.5">
                            {bid.laborWarranty && (
                              <div className={`text-xs ${isBestWarranty ? 'text-switch-green-700 font-bold' : 'text-gray-900'}`}>
                                {bid.laborWarranty}yr labor
                              </div>
                            )}
                            {bid.equipmentWarranty && (
                              <div className={`text-xs ${isBestWarranty ? 'text-switch-green-700 font-bold' : 'text-gray-900'}`}>
                                {bid.equipmentWarranty}yr equip
                              </div>
                            )}
                            {isBestWarranty && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-switch-green-600 text-white text-[10px] font-medium rounded mt-1">
                                BEST
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-400">N/A</div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-7">
                    <div className="border-2 border-gray-200 rounded-xl overflow-hidden h-full flex flex-col">
                      <div className="bg-gray-100 px-5 py-3 flex items-center justify-between border-b border-gray-200">
                        <div className="flex items-center gap-2">
                          <HelpCircle className="w-5 h-5 text-gray-600" />
                          <span className="text-sm font-bold text-gray-800">Questions to Ask This Contractor</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded-full border">
                            {answeredCount}/{bidQuestions.length} answered
                          </span>
                          {unansweredQuestions.length > 0 && (
                            <button
                              onClick={() => copyQuestionsToClipboard(bid.bidId, bid.contractor)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg transition-colors"
                              title="Copy questions"
                            >
                              {copiedContractor === bid.bidId ? (
                                <>
                                  <Check className="w-4 h-4 text-switch-green-600" />
                                  <span className="text-switch-green-600 font-medium">Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-4 h-4" />
                                  <span>Copy All</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="p-4 flex-1 overflow-y-auto max-h-72">
                        {bidQuestions.length === 0 ? (
                          <p className="text-sm text-gray-500 text-center py-6">
                            No questions for this bid.
                          </p>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {bidQuestions.map((question) => (
                              <div
                                key={question.id}
                                className={`flex items-start gap-2 p-3 rounded-lg transition-colors ${
                                  question.is_answered ? 'bg-gray-50 opacity-60' : 'bg-white border border-gray-200 hover:border-gray-300'
                                }`}
                              >
                                <button
                                  onClick={() => toggleQuestionAnswered(question)}
                                  className="flex-shrink-0 mt-0.5"
                                >
                                  {question.is_answered ? (
                                    <CheckCircle className="w-5 h-5 text-switch-green-600" />
                                  ) : (
                                    <div className="w-5 h-5 rounded-full border-2 border-gray-300 hover:border-switch-green-500 transition-colors" />
                                  )}
                                </button>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm ${question.is_answered ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                                    {question.question_text}
                                  </p>
                                  {!question.is_answered && (
                                    <div className="flex items-center gap-1 mt-1.5">
                                      <span className={`text-[10px] px-2 py-0.5 rounded border font-medium ${getPriorityColor(question.priority)}`}>
                                        {question.priority}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {bids.length === 0 && (
        <div className="bg-white rounded-xl border-2 border-gray-200 p-12 text-center">
          <HelpCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Bids to Compare</h3>
          <p className="text-gray-600">Upload your contractor bids in the Gather phase to see them here.</p>
        </div>
      )}

      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
        <p className="text-sm text-gray-600">
          <strong>Note:</strong> Marking a contractor as your choice is optional and for your reference only.
          You will work directly with your chosen contractor to finalize the installation.
        </p>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleContinue}
          className="btn btn-primary flex items-center gap-2 px-6"
        >
          Continue
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
