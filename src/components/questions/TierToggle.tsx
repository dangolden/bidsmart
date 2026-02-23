import type { QuestionTier } from '../../lib/types';
import { TIER_CONFIG, TIER_ORDER } from '../../lib/types/questions';

interface TierToggleProps {
  selectedTiers: Set<QuestionTier>;
  onToggleTier: (tier: QuestionTier) => void;
  onSelectCommon: () => void;
  onSelectAdvanced: () => void;
  onSelectAll: () => void;
  isCommonActive: boolean;
  isAdvancedActive: boolean;
  isAllTiersActive: boolean;
  counts: Record<QuestionTier, number>;
}

export function TierToggle({
  selectedTiers,
  onToggleTier,
  onSelectCommon,
  onSelectAdvanced,
  onSelectAll,
  isCommonActive,
  isAdvancedActive,
  isAllTiersActive,
  counts,
}: TierToggleProps) {
  const quickButtonBase = 'px-3 py-1 rounded-md text-xs font-medium transition-colors';
  const quickActive = 'bg-gray-800 text-white';
  const quickInactive = 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50';

  return (
    <div className="space-y-2">
      {/* Quick-action buttons */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-gray-500 mr-1">Show:</span>
        <button
          onClick={onSelectAll}
          className={`${quickButtonBase} ${isAllTiersActive ? quickActive : quickInactive}`}
        >
          All
        </button>
        <button
          onClick={onSelectCommon}
          className={`${quickButtonBase} ${isCommonActive ? quickActive : quickInactive}`}
        >
          Common
        </button>
        <button
          onClick={onSelectAdvanced}
          className={`${quickButtonBase} ${isAdvancedActive ? quickActive : quickInactive}`}
        >
          Advanced
        </button>
      </div>

      {/* Individual tier pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {TIER_ORDER.map(tier => {
          const config = TIER_CONFIG[tier];
          const isActive = selectedTiers.has(tier);
          const count = counts[tier];

          return (
            <button
              key={tier}
              onClick={() => onToggleTier(tier)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                isActive ? config.pillActive : config.pillInactive
              }`}
            >
              {config.label}
              {count > 0 && (
                <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${
                  isActive ? 'bg-white/20' : 'bg-gray-100'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
