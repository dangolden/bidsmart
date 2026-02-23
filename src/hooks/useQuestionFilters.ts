import { useState, useMemo, useCallback, useEffect } from 'react';
import type { BidQuestion, QuestionTier, QuestionCategory } from '../lib/types';
import { TIER_ORDER, PRIORITY_ORDER, ALL_TIERS, COMMON_TIERS, ADVANCED_TIERS } from '../lib/types/questions';

const ALL_CATEGORIES: QuestionCategory[] = [
  'pricing', 'warranty', 'equipment', 'timeline', 'scope', 'credentials', 'electrical',
];

export interface QuestionFilterCounts {
  byTier: Record<QuestionTier, number>;
  byCategory: Record<QuestionCategory, number>;
  total: number;
  answered: number;
  unanswered: number;
}

export function useQuestionFilters(questions: BidQuestion[]) {
  const [selectedTiers, setSelectedTiers] = useState<Set<QuestionTier>>(new Set(ALL_TIERS));
  const [activeCategories, setActiveCategories] = useState<Set<QuestionCategory>>(new Set(ALL_CATEGORIES));
  const [showAnswered, setShowAnswered] = useState(false);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set());

  // Compute counts from unfiltered questions
  const counts = useMemo<QuestionFilterCounts>(() => {
    const byTier: Record<QuestionTier, number> = { essential: 0, clarification: 0, detailed: 0, expert: 0 };
    const byCategory = Object.fromEntries(ALL_CATEGORIES.map(c => [c, 0])) as Record<QuestionCategory, number>;
    let answered = 0;
    let unanswered = 0;

    for (const q of questions) {
      const tier = q.question_tier || 'clarification';
      if (tier in byTier) byTier[tier as QuestionTier]++;
      const cat = (q.question_category || q.category) as QuestionCategory | null | undefined;
      if (cat && cat in byCategory) byCategory[cat]++;
      if (q.is_answered) answered++;
      else unanswered++;
    }

    return { byTier, byCategory, total: questions.length, answered, unanswered };
  }, [questions]);

  // Filter + sort
  const filteredQuestions = useMemo(() => {
    return questions
      .filter(q => {
        const tier = q.question_tier || 'clarification';
        if (!selectedTiers.has(tier as QuestionTier)) return false;
        const cat = (q.question_category || q.category) as QuestionCategory | null | undefined;
        if (cat && !activeCategories.has(cat)) return false;
        if (!showAnswered && q.is_answered) return false;
        return true;
      })
      .sort((a, b) => {
        const tierA = TIER_ORDER.indexOf((a.question_tier || 'clarification') as QuestionTier);
        const tierB = TIER_ORDER.indexOf((b.question_tier || 'clarification') as QuestionTier);
        if (tierA !== tierB) return tierA - tierB;

        const priA = PRIORITY_ORDER[a.priority ?? 'medium'] ?? 1;
        const priB = PRIORITY_ORDER[b.priority ?? 'medium'] ?? 1;
        if (priA !== priB) return priA - priB;

        return (a.display_order ?? 999) - (b.display_order ?? 999);
      });
  }, [questions, selectedTiers, activeCategories, showAnswered]);

  // When filters change, remove selected IDs that are no longer visible
  useEffect(() => {
    const visibleIds = new Set(filteredQuestions.map(q => q.id));
    setSelectedQuestionIds(prev => {
      const next = new Set<string>();
      for (const id of prev) {
        if (visibleIds.has(id)) next.add(id);
      }
      return next.size === prev.size ? prev : next;
    });
  }, [filteredQuestions]);

  // Tier quick-actions
  const selectCommon = useCallback(() => setSelectedTiers(new Set(COMMON_TIERS)), []);
  const selectAdvanced = useCallback(() => setSelectedTiers(new Set(ADVANCED_TIERS)), []);
  const selectAllTiers = useCallback(() => setSelectedTiers(new Set(ALL_TIERS)), []);
  const toggleTier = useCallback((tier: QuestionTier) => {
    setSelectedTiers(prev => {
      const next = new Set(prev);
      if (next.has(tier)) next.delete(tier);
      else next.add(tier);
      return next;
    });
  }, []);

  // Category toggles
  const toggleCategory = useCallback((cat: QuestionCategory) => {
    setActiveCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }, []);

  // Question selection helpers
  const selectAll = useCallback(() => {
    const ids = new Set(filteredQuestions.filter(q => !q.is_answered).map(q => q.id));
    setSelectedQuestionIds(ids);
  }, [filteredQuestions]);

  const selectNone = useCallback(() => {
    setSelectedQuestionIds(new Set());
  }, []);

  const selectCommonOnly = useCallback(() => {
    const ids = new Set(
      filteredQuestions
        .filter(q => !q.is_answered && COMMON_TIERS.has((q.question_tier || 'clarification') as QuestionTier))
        .map(q => q.id)
    );
    setSelectedQuestionIds(ids);
  }, [filteredQuestions]);

  const selectAdvancedOnly = useCallback(() => {
    const ids = new Set(
      filteredQuestions
        .filter(q => !q.is_answered && ADVANCED_TIERS.has((q.question_tier || 'clarification') as QuestionTier))
        .map(q => q.id)
    );
    setSelectedQuestionIds(ids);
  }, [filteredQuestions]);

  const toggleQuestion = useCallback((id: string) => {
    setSelectedQuestionIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Computed helpers
  const selectedCount = selectedQuestionIds.size;

  const isCommonActive = useMemo(() => {
    return selectedTiers.size === COMMON_TIERS.size &&
      [...COMMON_TIERS].every(t => selectedTiers.has(t));
  }, [selectedTiers]);

  const isAdvancedActive = useMemo(() => {
    return selectedTiers.size === ADVANCED_TIERS.size &&
      [...ADVANCED_TIERS].every(t => selectedTiers.has(t));
  }, [selectedTiers]);

  const isAllTiersActive = useMemo(() => {
    return selectedTiers.size === ALL_TIERS.size;
  }, [selectedTiers]);

  return {
    // Filter state
    selectedTiers,
    activeCategories,
    showAnswered,
    setShowAnswered,

    // Tier actions
    toggleTier,
    selectCommon,
    selectAdvanced,
    selectAllTiers,
    isCommonActive,
    isAdvancedActive,
    isAllTiersActive,

    // Category actions
    toggleCategory,

    // Question selection
    selectedQuestionIds,
    toggleQuestion,
    selectAll,
    selectNone,
    selectCommonOnly,
    selectAdvancedOnly,
    selectedCount,

    // Computed
    filteredQuestions,
    counts,
  };
}
