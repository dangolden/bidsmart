import type { QuestionCategory } from '../../lib/types';
import { CATEGORY_CONFIG } from '../../lib/types/questions';

const CATEGORY_ORDER: QuestionCategory[] = [
  'pricing', 'warranty', 'equipment', 'timeline', 'scope', 'credentials', 'electrical',
];

interface CategoryFilterProps {
  activeCategories: Set<QuestionCategory>;
  onToggleCategory: (category: QuestionCategory) => void;
  counts: Record<QuestionCategory, number>;
}

export function CategoryFilter({ activeCategories, onToggleCategory, counts }: CategoryFilterProps) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-xs font-medium text-gray-500 mr-1">Categories:</span>
      {CATEGORY_ORDER.map(cat => {
        const config = CATEGORY_CONFIG[cat];
        const isActive = activeCategories.has(cat);
        const count = counts[cat];

        // Don't show categories with zero questions
        if (count === 0) return null;

        return (
          <button
            key={cat}
            onClick={() => onToggleCategory(cat)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
              isActive ? config.pillActive : config.pillInactive
            }`}
          >
            {config.label}
            {count > 0 && (
              <span className={`ml-1 ${isActive ? 'opacity-75' : 'text-gray-400'}`}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
