import type { QuestionTier, QuestionCategory } from './index';

export type { QuestionTier, QuestionCategory };

export interface TierConfig {
  label: string;
  description: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  pillActive: string;
  pillInactive: string;
}

export interface CategoryConfig {
  label: string;
  pillActive: string;
  pillInactive: string;
}

export const TIER_CONFIG: Record<QuestionTier, TierConfig> = {
  essential: {
    label: 'Essential',
    description: 'Must-ask questions before signing',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-500',
    pillActive: 'bg-blue-600 text-white',
    pillInactive: 'bg-white text-blue-600 border border-blue-300 hover:bg-blue-50',
  },
  clarification: {
    label: 'Clarification',
    description: 'Fill gaps in the bid',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-400',
    pillActive: 'bg-amber-500 text-white',
    pillInactive: 'bg-white text-amber-600 border border-amber-300 hover:bg-amber-50',
  },
  detailed: {
    label: 'Detailed',
    description: 'Deeper technical follow-ups',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-700',
    borderColor: 'border-purple-400',
    pillActive: 'bg-purple-500 text-white',
    pillInactive: 'bg-white text-purple-600 border border-purple-300 hover:bg-purple-50',
  },
  expert: {
    label: 'Expert',
    description: 'Advanced technical verification',
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-600',
    borderColor: 'border-gray-300',
    pillActive: 'bg-gray-500 text-white',
    pillInactive: 'bg-white text-gray-500 border border-gray-300 border-dashed hover:bg-gray-50',
  },
};

export const CATEGORY_CONFIG: Record<QuestionCategory, CategoryConfig> = {
  pricing: {
    label: 'Pricing',
    pillActive: 'bg-green-600 text-white',
    pillInactive: 'bg-white text-green-700 border border-green-300',
  },
  warranty: {
    label: 'Warranty',
    pillActive: 'bg-indigo-600 text-white',
    pillInactive: 'bg-white text-indigo-700 border border-indigo-300',
  },
  equipment: {
    label: 'Equipment',
    pillActive: 'bg-sky-600 text-white',
    pillInactive: 'bg-white text-sky-700 border border-sky-300',
  },
  timeline: {
    label: 'Timeline',
    pillActive: 'bg-orange-600 text-white',
    pillInactive: 'bg-white text-orange-700 border border-orange-300',
  },
  scope: {
    label: 'Scope',
    pillActive: 'bg-teal-600 text-white',
    pillInactive: 'bg-white text-teal-700 border border-teal-300',
  },
  credentials: {
    label: 'Credentials',
    pillActive: 'bg-rose-600 text-white',
    pillInactive: 'bg-white text-rose-700 border border-rose-300',
  },
  electrical: {
    label: 'Electrical',
    pillActive: 'bg-yellow-600 text-white',
    pillInactive: 'bg-white text-yellow-700 border border-yellow-300',
  },
};

export const TIER_ORDER: QuestionTier[] = ['essential', 'clarification', 'detailed', 'expert'];
export const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

export const COMMON_TIERS: Set<QuestionTier> = new Set(['essential', 'clarification']);
export const ADVANCED_TIERS: Set<QuestionTier> = new Set(['detailed', 'expert']);
export const ALL_TIERS: Set<QuestionTier> = new Set(['essential', 'clarification', 'detailed', 'expert']);
