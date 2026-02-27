import { useState, useMemo, useCallback, useEffect } from 'react';
import { MessageCircle, Mail, Info, Maximize2, Minimize2 } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { getContractorDisplayName } from '../../lib/utils/bidDeduplication';
import { useQuestionFilters } from '../../hooks/useQuestionFilters';
import { TierToggle } from './TierToggle';
import { CategoryFilter } from './CategoryFilter';
import { QuestionCard } from './QuestionCard';
import { ContractorCardHeader } from './ContractorCardHeader';
import { CraftEmailModal } from './CraftEmailModal';
import type { BidQuestion, Bid, BidContractor, BidEquipment, BidScope, BidScore } from '../../lib/types';

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

export function ContractorQuestionsPanel({ bids, questions, refreshQuestions: refreshQuestionsProp }: ContractorQuestionsPanelProps) {
  const refreshQuestions = refreshQuestionsProp || (async () => {});
  const [emailModalBidId, setEmailModalBidId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

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

  const filters = useQuestionFilters(questions);

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

  // Group filtered questions by bid
  const questionsByBid = useMemo(() => {
    const map = new Map<string, BidQuestion[]>();
    for (const q of filters.filteredQuestions) {
      const list = map.get(q.bid_id) || [];
      list.push(q);
      map.set(q.bid_id, list);
    }
    return map;
  }, [filters.filteredQuestions]);

  // For the email modal — get selected questions for a specific bid
  const getSelectedQuestionsForBid = useCallback((bidId: string) => {
    return (questionsByBid.get(bidId) || []).filter(q => filters.selectedQuestionIds.has(q.id));
  }, [questionsByBid, filters.selectedQuestionIds]);

  // Count selected per bid
  const selectedCountByBid = useMemo(() => {
    const map = new Map<string, number>();
    for (const q of filters.filteredQuestions) {
      if (filters.selectedQuestionIds.has(q.id)) {
        map.set(q.bid_id, (map.get(q.bid_id) || 0) + 1);
      }
    }
    return map;
  }, [filters.filteredQuestions, filters.selectedQuestionIds]);

  // Email modal data
  const emailModalBid = emailModalBidId ? bids.find(b => b.bid.id === emailModalBidId) : null;
  const emailModalQuestions = emailModalBidId ? getSelectedQuestionsForBid(emailModalBidId) : [];

  // ── Empty state: no questions yet ──
  if (questions.length === 0) {
    // Show contractor card shells with placeholder content while generating
    if (bids.length > 0) {
      return (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-2">
              <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-900">Questions to Ask Your Contractors</p>
                <p className="text-sm text-blue-700 mt-1">
                  Questions are being generated based on your bid analysis. They'll appear below once ready.
                </p>
              </div>
            </div>
          </div>

          {bids.map((bidData, bidIndex) => (
            <div key={bidData.bid.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <ContractorCardHeader
                bid={bidData.bid}
                contractor={bidData.contractor}
                index={bidIndex}
                subtitle="Generating questions..."
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
          ))}
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

  // ── Shared content blocks ──

  const filtersBlock = (
    <>
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <TierToggle
          selectedTiers={filters.selectedTiers}
          onToggleTier={filters.toggleTier}
          onSelectCommon={filters.selectCommon}
          onSelectAdvanced={filters.selectAdvanced}
          onSelectAll={filters.selectAllTiers}
          isCommonActive={filters.isCommonActive}
          isAdvancedActive={filters.isAdvancedActive}
          isAllTiersActive={filters.isAllTiersActive}
          counts={filters.counts.byTier}
        />
        <CategoryFilter
          activeCategories={filters.activeCategories}
          onToggleCategory={filters.toggleCategory}
          counts={filters.counts.byCategory}
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Select:</span>
          <button onClick={filters.selectAll} className="px-2.5 py-1 rounded-md text-xs font-medium bg-white text-gray-600 border border-gray-300 hover:bg-gray-50 transition-colors">
            All
          </button>
          <button onClick={filters.selectCommonOnly} className="px-2.5 py-1 rounded-md text-xs font-medium bg-white text-gray-600 border border-gray-300 hover:bg-gray-50 transition-colors">
            Common Only
          </button>
          <button onClick={filters.selectAdvancedOnly} className="px-2.5 py-1 rounded-md text-xs font-medium bg-white text-gray-600 border border-gray-300 hover:bg-gray-50 transition-colors">
            Advanced Only
          </button>
          <button onClick={filters.selectNone} className="px-2.5 py-1 rounded-md text-xs font-medium bg-white text-gray-600 border border-gray-300 hover:bg-gray-50 transition-colors">
            None
          </button>
        </div>
        <span className="text-sm text-gray-500">
          {filters.selectedCount} question{filters.selectedCount !== 1 ? 's' : ''} selected
        </span>
      </div>

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
    </>
  );

  const bidSections = (
    <>
      {bids.map((bidData, bidIndex) => {
        const bidQuestions = questionsByBid.get(bidData.bid.id) || [];
        const selectedForBid = selectedCountByBid.get(bidData.bid.id) || 0;
        const answeredForBid = bidQuestions.filter(q => q.is_answered).length;
        const totalForBid = bidQuestions.length;

        if (totalForBid === 0 && !filters.showAnswered) {
          const allBidQuestions = questions.filter(q => q.bid_id === bidData.bid.id);
          if (allBidQuestions.length === 0) return null;
          return null;
        }

        if (totalForBid === 0) return null;

        const subtitleParts: string[] = [];
        subtitleParts.push(`${totalForBid} question${totalForBid !== 1 ? 's' : ''}`);
        if (answeredForBid > 0) subtitleParts.push(`${answeredForBid} answered`);
        if (selectedForBid > 0) subtitleParts.push(`${selectedForBid} selected`);

        return (
          <div key={bidData.bid.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <ContractorCardHeader
              bid={bidData.bid}
              contractor={bidData.contractor}
              index={bidIndex}
              subtitle={subtitleParts.join(' · ')}
              action={
                <button
                  onClick={() => setEmailModalBidId(bidData.bid.id)}
                  disabled={selectedForBid === 0}
                  className="btn btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Mail className="w-4 h-4" />
                  Craft Email ({selectedForBid})
                </button>
              }
            />

            <div className="p-4 space-y-2">
              {bidQuestions.map(question => (
                <QuestionCard
                  key={question.id}
                  question={question}
                  isSelected={filters.selectedQuestionIds.has(question.id)}
                  onToggleSelected={() => filters.toggleQuestion(question.id)}
                  onToggleAnswered={() => toggleQuestionAnswered(question)}
                />
              ))}
            </div>
          </div>
        );
      })}

      {filters.filteredQuestions.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-500">No questions match current filters. Try adjusting tier or category filters.</p>
        </div>
      )}
    </>
  );

  const emailModal = emailModalBid && (
    <CraftEmailModal
      isOpen={!!emailModalBidId}
      onClose={() => setEmailModalBidId(null)}
      contractorName={getContractorDisplayName(emailModalBid.bid.contractor_name)}
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
            <div className="space-y-3">
              {filtersBlock}
            </div>
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
                Select the questions you want to ask, then use "Craft Email" to generate a ready-to-send message.
                Use the filters to focus on what matters most.
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

      {filtersBlock}
      {bidSections}
      {emailModal}
    </div>
  );
}
