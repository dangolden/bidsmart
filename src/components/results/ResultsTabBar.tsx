import { DollarSign, Zap, Award, ClipboardList, MessageCircle, ClipboardCheck } from 'lucide-react';
import type { ResultsTab, AnalysisStatus } from '../../lib/types';

interface TabDef {
  key: ResultsTab;
  label: string;
  subtitle: string;
  icon: React.ReactNode;
}

const TABS: TabDef[] = [
  {
    key: 'incentives',
    label: 'Incentives',
    subtitle: 'Check which rebates and tax credits may apply to your project',
    icon: <DollarSign className="w-5 h-5" />,
  },
  {
    key: 'equipment',
    label: 'Equipment',
    subtitle: 'Compare system specs, efficiency ratings, and equipment details',
    icon: <Zap className="w-5 h-5" />,
  },
  {
    key: 'contractors',
    label: 'Contractors',
    subtitle: 'Review contractor credentials, licensing, and reputation',
    icon: <Award className="w-5 h-5" />,
  },
  {
    key: 'cost-scope',
    label: 'Cost & Scope',
    subtitle: 'Compare pricing, what\'s included, warranties, and timelines',
    icon: <ClipboardList className="w-5 h-5" />,
  },
  {
    key: 'questions',
    label: 'Questions',
    subtitle: 'Specific questions to ask each contractor before deciding',
    icon: <MessageCircle className="w-5 h-5" />,
  },
  {
    key: 'verify',
    label: 'Verify',
    subtitle: 'Quality installation checklist and contractor review after your project',
    icon: <ClipboardCheck className="w-5 h-5" />,
  },
];

interface ResultsTabBarProps {
  activeTab: ResultsTab;
  onTabChange: (tab: ResultsTab) => void;
  analysisStatus: AnalysisStatus;
  hasEquipmentData: boolean;
  hasContractorData: boolean;
  hasCostData: boolean;
  hasQuestionData: boolean;
}

export function ResultsTabBar({
  activeTab,
  onTabChange,
  analysisStatus,
  hasEquipmentData,
  hasContractorData,
  hasCostData,
  hasQuestionData,
}: ResultsTabBarProps) {
  const isTabWaiting = (tab: ResultsTab): boolean => {
    if (analysisStatus === 'complete') return false;
    switch (tab) {
      case 'incentives': return false; // Incentives load from zip, not MindPal
      case 'equipment': return !hasEquipmentData;
      case 'contractors': return !hasContractorData;
      case 'cost-scope': return !hasCostData;
      case 'questions': return !hasQuestionData;
      default: return false;
    }
  };

  return (
    <div>
      <div className="flex border-b border-gray-200 overflow-x-auto">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const waiting = isTabWaiting(tab.key);

          // Inactive text: dark for ready tabs, light grey for waiting tabs
          const inactiveTextClass = waiting
            ? 'border-transparent text-gray-300 hover:text-gray-400 hover:border-gray-200'
            : 'border-transparent text-gray-700 hover:text-gray-900 hover:border-gray-300';
          const inactiveIconClass = waiting ? 'text-gray-300' : 'text-gray-500';

          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={`
                flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors
                ${isActive
                  ? 'border-switch-green-600 text-switch-green-700'
                  : inactiveTextClass
                }
              `}
            >
              <span className={isActive ? 'text-switch-green-600' : inactiveIconClass}>
                {tab.icon}
              </span>
              {tab.label}
              {waiting && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" title="Waiting for data" />
              )}
            </button>
          );
        })}
      </div>

      {/* Subtitle bar */}
      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
        <p className="text-xs text-gray-500">
          {TABS.find(t => t.key === activeTab)?.subtitle}
        </p>
      </div>
    </div>
  );
}
