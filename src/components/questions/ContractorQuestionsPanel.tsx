import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { MessageCircle, Mail, Info, Maximize2, Minimize2 } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { getContractorDisplayName } from '../../lib/utils/bidDeduplication';
import { useQuestionFilters } from '../../hooks/useQuestionFilters';
import { TierToggle } from './TierToggle';
import { CategoryFilter } from './CategoryFilter';
import { QuestionCard } from './QuestionCard';
import { ContractorCardHeader } from './ContractorCardHeader';
import { CraftEmailModal } from './CraftEmailModal';
import type { BidQuestion, QuestionTier, Bid, BidContractor, BidEquipment, BidScope, BidScore } from '../../lib/types';
import { ALL_TIERS, COMMON_TIERS, ADVANCED_TIERS } from '../../lib/types/questions';

interface BidEntry {
  bid: Bid;
  contractor?: BidContractor | null;
  equipment: BidEquipment[];
  scope?: BidScope | null;
  scores?: BidScore | null;
}

interface ContractorQuestionsPanelProps {
  bids: BidEntry[];
  questions: BidQuestion[];
  refreshQuestions?: () => Promise<void>;
}

// Green scale for visual contrast between contractor blocks
const GREEN_SCALE = [
  { border: 'border-l-green-700', badge: 'bg-green-700' },
  { border: 'border-l-green-500', badge: 'bg-green-600' },
  { border: 'border-l-emerald-500', badge: 'bg-emerald-600' },
  { border: 'border-l-teal-500', badge: 'bg-teal-600' },
  { border: 'border-l-cyan-500', badge: 'bg-cyan-600' },
];

export function ContractorQuestionsPanel({ bids, questions, refreshQuestions: refreshQuestionsProp }: ContractorQuestionsPanelProps) {
  const refreshQuestions = refreshQuestionsProp || (async () => {});
  const [emailModalBidId, setEmailModalBidId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const hasAutoSelected = useRef(false);

  // Per-bid tier visibility state
  const [perBidTiers, setPerBidTiers] = useState<Record<string, Set<QuestionTier>>>({});

  // Escape key to close expanded view + body scroll lock
  useEffect(() => {
    if (!isExpanded) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsExpanded(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isExpanded]);

  // Use the global filter hook — but we won't use its tier filtering (we handle tiers per-bid)
  // Force all tiers active so the hook doesn't filter by tier
  const filters = useQuestionFilters(questions);

  // Initialize per-bid tiers when bids arrive
  useEffect(() => {
    if (bids.length === 0) return;
    setPerBidTiers(prev => {
      // Only initialize bids that don't already have state
      const next = { ...prev };
      let changed = false;
      bids.forEach((b, idx) => {
        if (!next[b.bid.id]) {
          // First contractor: show only Common tiers; others: show all
          next[b.bid.id] = idx === 0 ? new Set(COMMON_TIERS) : new Set(ALL_TIERS);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [bids]);

  // Auto-select Essential+Clarification questions for the first contractor on mount
  useEffect(() => {
    if (hasAutoSelected.current || bids.length === 0 || questions.length === 0) return;
    hasAutoSelected.current = true;

    const firstBidId = bids[0].bid.id;
    const autoSelectIds = new Set(
      questions
        .filter(q =>
          q.bid_id === firstBidId &&
          COMMON_TIERS.has((q.question_tier || 'clarification') as QuestionTier) &&
          !q.is_answered
        )
        .map(q => q.id)
    );

    if (autoSelectIds.size > 0) {
      filters.setSelectedQuestionIds(autoSelectIds);
    }
  }, [bids, questions]);

  // Force all tiers active in the hook so it doesn't filter by tier
  useEffect(() => {
    if (filters.selectedTiers.size !== ALL_TIERS.size) {
      filters.selectAllTiers();
    }
  }, []);

  const toggleQuestionAnswered = useCallback(async (question: BidQuestion) => {
    await supabase
      .from('contractor_questions')
      .update({
        is_answered: !question.is_answered,
        answered_at: !question.is_answered ? new Date().toISOString() : null,
      })
      .eq('id', question.id);

    refreshQuestions();
  }, [refreshQuestions]);

  // Get questions for a bid, filtered by global category + answered + per-bid tier
  const getQuestionsForBid = useCallback((bidId: string) => {
    const bidTiers = perBidTiers[bidId] || new Set(ALL_TIERS);
    return filters.filteredQuestions.filter(q => {
      if (q.bid_id !== bidId) return false;
      const tier = (q.question_tier || 'clarification') as QuestionTier;
      return bidTiers.has(tier);
    });
  }, [filters.filteredQuestions, perBidTiers]);

  // Per-bid tier counts (from category-filtered questions, not tier-filtered)
  const perBidTierCounts = useMemo(() => {
    const map: Record<string, Record<QuestionTier, number>> = {};
    for (const q of filters.filteredQuestions) {
      if (!map[q.bid_id]) {
        map[q.bid_id] = { essential: 0, clarification: 0, detailed: 0, expert: 0 };
      }
      const tier = (q.question_tier || 'clarification') as QuestionTier;
      if (tier in map[q.bid_id]) map[q.bid_id][tier]++;
    }
    return map;
  }, [filters.filteredQuestions]);

  // Count selected per bid (from visible questions only)
  const selectedCountByBid = useMemo(() => {
    const map = new Map<string, number>();
    for (const bid of bids) {
      const bidQuestions = getQuestionsForBid(bid.bid.id);
      const count = bidQuestions.filter(q => filters.selectedQuestionIds.has(q.id)).length;
      if (count > 0) map.set(bid.bid.id, count);
    }
    return map;
  }, [bids, getQuestionsForBid, filters.selectedQuestionIds]);

  // For the email modal — get selected questions for a specific bid
  const getSelectedQuestionsForBid = useCallback((bidId: string) => {
    return getQuestionsForBid(bidId).filter(q => filters.selectedQuestionIds.has(q.id));
  }, [getQuestionsForBid, filters.selectedQuestionIds]);

  // Per-bid tier toggle handlers
  const toggleBidTier = useCallback((bidId: string, tier: QuestionTier) => {
    setPerBidTiers(prev => {
      const current = prev[bidId] || new Set(ALL_TIERS);
      const next = new Set(current);
      if (next.has(tier)) next.delete(tier);
      else next.add(tier);
      return { ...prev, [bidId]: next };
    });
  }, []);

  const selectBidCommon = useCallback((bidId: string) => {
    setPerBidTiers(prev => ({ ...prev, [bidId]: new Set(COMMON_TIERS) }));
  }, []);

  const selectBidAdvanced = useCallback((bidId: string) => {
    setPerBidTiers(prev => ({ ...prev, [bidId]: new Set(ADVANCED_TIERS) }));
  }, []);

  const selectBidAllTiers = useCallback((bidId: string) => {
    setPerBidTiers(prev => ({ ...prev, [bidId]: new Set(ALL_TIERS) }));
  }, []);

  // Per-bid computed tier helpers
  const isBidCommonActive = useCallback((bidId: string) => {
    const tiers = perBidTiers[bidId] || new Set(ALL_TIERS);
    return tiers.size === COMMON_TIERS.size && [...COMMON_TIERS].every(t => tiers.has(t));
  }, [perBidTiers]);

  const isBidAdvancedActive = useCallback((bidId: string) => {
    const tiers = perBidTiers[bidId] || new Set(ALL_TIERS);
    return tiers.size === ADVANCED_TIERS.size && [...ADVANCED_TIERS].every(t => tiers.has(t));
  }, [perBidTiers]);

  const isBidAllTiersActive = useCallback((bidId: string) => {
    const tiers = perBidTiers[bidId] || new Set(ALL_TIERS);
    return tiers.size === ALL_TIERS.size;
  }, [perBidTiers]);

  // Per-bid selection helpers
  const selectAllForBid = useCallback((bidId: string) => {
    const bidQuestions = getQuestionsForBid(bidId);
    const newIds = new Set(filters.selectedQuestionIds);
    bidQuestions.filter(q => !q.is_answered).forEach(q => newIds.add(q.id));
    filters.setSelectedQuestionIds(newIds);
  }, [getQuestionsForBid, filters]);

  const selectNoneForBid = useCallback((bidId: string) => {
    const bidQuestionIds = new Set(questions.filter(q => q.bid_id === bidId).map(q => q.id));
    const newIds = new Set([...filters.selectedQuestionIds].filter(id => !bidQuestionIds.has(id)));
    filters.setSelectedQuestionIds(newIds);
  }, [questions, filters]);

  // Email modal data
  const emailModalBid = emailModalBidId ? bids.find(b => b.bid.id === emailModalBidId) : null;
  const emailModalQuestions = emailModalBidId ? getSelectedQuestionsForBid(emailModalBidId) : [];

  // ── Empty state: no questions yet ──
  if (questions.length === 0) {
    if (bids.length > 0) {
      return (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-2">
              <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-900">Questions to Ask Your Contractors</p>
                <p className="text-sm text-blue-700 mt-1">
                  Questions are being generated based on your bid analysis. They&apos;ll appear below once ready.
                </p>
              </div>
            </div>
          </div>

          {bids.map((bidData, bidIndex) => {
            const style = GREEN_SCALE[bidIndex % GREEN_SCALE.length];
            return (
              <div key={bidData.bid.id} className={`bg-white rounded-xl border border-gray-200 border-l-4 ${style.border} overflow-hidden shadow-sm`}>
                <ContractorCardHeader
                  bid={bidData.bid}
                  contractor={bidData.contractor}
                  index={bidIndex}
                  subtitle="Generating questions..."
                  badgeColor={style.badge}
                />
                <div className="p-4 space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="rounded-lg border border-gray-100 bg-gray-50 p-4 animate-pulse">
                      <div className="h-3 bg-gray-200 rounded w-3/4 mb-2" />
                      <div className="h-2 bg-gray-100 rounded w-1/2" />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    return (
      <div className="bg-white rounded-xl border-2 border-gray-200 p-12 text-center">
        <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Questions Generated Yet</h3>
        <p className="text-gray-600">Questions will appear here once bid analysis is complete.</p>
      </div>
    );
  }

  // ── Global filters (category + show answered) ──
  const globalFiltersBlock = (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
      <CategoryFilter
        activeCategories={filters.activeCategories}
        onToggleCategory={filters.toggleCategory}
        counts={filters.counts.byCategory}
      />
      <div className="flex items-center justify-end">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.showAnswered}
            onChange={e => filters.setShowAnswered(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-switch-green-600 focus:ring-switch-green-500"
          />
          <span className="text-sm text-gray-600">
            Show answered ({filters.counts.answered})
          </span>
        </label>
      </div>
    </div>
  );

  // ── Per-bid sections with inline tier toggles ──
  const bidSections = (
    <>
      {bids.map((bidData, bidIndex) => {
        const bidId = bidData.bid.id;
        const bidQuestions = getQuestionsForBid(bidId);
        const selectedForBid = selectedCountByBid.get(bidId) || 0;
        const answeredForBid = bidQuestions.filter(q => q.is_answered).length;
        const totalForBid = bidQuestions.length;
        const bidTiers = perBidTiers[bidId] || new Set(ALL_TIERS);
        const bidCounts = perBidTierCounts[bidId] || { essential: 0, clarification: 0, detailed: 0, expert: 0 };
        const style = GREEN_SCALE[bidIndex % GREEN_SCALE.length];

        // Check if bid has any questions at all (across all tiers)
        const allBidQuestions = filters.filteredQuestions.filter(q => q.bid_id === bidId);
        if (allBidQuestions.length === 0) return null;

        const subtitleParts: string[] = [];
        subtitleParts.push(`${totalForBid} question${totalForBid !== 1 ? 's' : ''}`);
        if (answeredForBid > 0) subtitleParts.push(`${answeredForBid} answered`);
        if (selectedForBid > 0) subtitleParts.push(`${selectedForBid} selected`);

        return (
          <div key={bidId} className={`bg-white rounded-xl border border-gray-200 border-l-4 ${style.border} overflow-hidden shadow-sm`}>
            <ContractorCardHeader
              bid={bidData.bid}
              contractor={bidData.contractor}
              index={bidIndex}
              subtitle={subtitleParts.join(' · ')}
              badgeColor={style.badge}
            />

            {/* Per-bid tier toggle + selection bar */}
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 space-y-2.5">
              <TierToggle
                selectedTiers={bidTiers}
                onToggleTier={(tier) => toggleBidTier(bidId, tier)}
                onSelectCommon={() => selectBidCommon(bidId)}
                onSelectAdvanced={() => selectBidAdvanced(bidId)}
                onSelectAll={() => selectBidAllTiers(bidId)}
                isCommonActive={isBidCommonActive(bidId)}
                isAdvancedActive={isBidAdvancedActive(bidId)}
                isAllTiersActive={isBidAllTiersActive(bidId)}
                counts={bidCounts}
              />

              <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-gray-200">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500">Select:</span>
                  <button
                    onClick={() => selectAllForBid(bidId)}
                    className="px-2 py-0.5 rounded text-xs font-medium bg-white text-gray-600 border border-gray-300 hover:bg-gray-50 transition-colors"
                  >
                    All
                  </button>
                  <button
                    onClick={() => selectNoneForBid(bidId)}
                    className="px-2 py-0.5 rounded text-xs font-medium bg-white text-gray-600 border border-gray-300 hover:bg-gray-50 transition-colors"
                  >
                    None
                  </button>
                  <span className="text-xs text-gray-400 ml-1">
                    {selectedForBid} selected
                  </span>
                </div>
                <button
                  onClick={() => setEmailModalBidId(bidId)}
                  disabled={selectedForBid === 0}
                  className="btn btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Mail className="w-4 h-4" />
                  Craft Email ({selectedForBid})
                </button>
              </div>
            </div>

            {/* Questions */}
            <div className="p-4 space-y-2">
              {bidQuestions.length > 0 ? (
                bidQuestions.map(question => (
                  <QuestionCard
                    key={question.id}
                    question={question}
                    isSelected={filters.selectedQuestionIds.has(question.id)}
                    onToggleSelected={() => filters.toggleQuestion(question.id)}
                    onToggleAnswered={() => toggleQuestionAnswered(question)}
                  />
                ))
              ) : (
                <div className="text-center py-3 text-sm text-gray-400">
                  No questions match selected tiers. Try toggling more tiers above.
                </div>
              )}
            </div>
          </div>
        );
      })}

      {filters.filteredQuestions.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-500">No questions match current filters. Try adjusting category filters.</p>
        </div>
      )}
    </>
  );

  const emailModal = emailModalBid && (
    <CraftEmailModal
      isOpen={!!emailModalBidId}
      onClose={() => setEmailModalBidId(null)}
      contractorName={getContractorDisplayName(emailModalBid.bid.contractor_name, undefined, emailModalBid.contractor)}
      contractorEmail={emailModalBid.contractor?.email}
      questions={emailModalQuestions}
    />
  );

  // ── Expanded (fullscreen) mode ──
  if (isExpanded) {
    return (
      <div className="fixed inset-0 bg-white z-40 flex flex-col">
        {/* Sticky header */}
        <div className="flex-shrink-0 border-b border-gray-200 bg-white px-6 py-4 space-y-3">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <p className="text-sm font-medium text-blue-900">Questions to Ask Your Contractors</p>
              </div>
              <button
                onClick={() => setIsExpanded(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <Minimize2 className="w-4 h-4" />
                Collapse
              </button>
            </div>
            {globalFiltersBlock}
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-6 py-4 space-y-4">
            {bidSections}
          </div>
        </div>

        {emailModal}
      </div>
    );
  }

  // ── Normal (inline) mode ──
  return (
    <div className="space-y-4">
      {/* Info banner with expand button */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-900">Questions to Ask Your Contractors</p>
              <p className="text-sm text-blue-700 mt-1">
                Select the questions you want to ask, then use &quot;Craft Email&quot; to generate a ready-to-send message.
                Use the tier toggles within each contractor section to filter by question depth.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsExpanded(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-700 hover:text-blue-900 bg-white hover:bg-blue-100 border border-blue-300 rounded-lg transition-colors flex-shrink-0"
          >
            <Maximize2 className="w-4 h-4" />
            Expand
          </button>
        </div>
      </div>

      {globalFiltersBlock}
      {bidSections}
      {emailModal}
    </div>
  );
}
