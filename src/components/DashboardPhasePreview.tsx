import { Upload, BarChart3, CheckCircle, ClipboardCheck } from 'lucide-react';

const PHASES = [
  {
    number: 1,
    label: 'GATHER',
    title: 'Upload & Prioritize',
    description: 'Upload contractor bids and set your priorities',
    icon: Upload,
    color: 'bg-switch-green-100 text-switch-green-700',
  },
  {
    number: 2,
    label: 'COMPARE',
    title: 'Analyze Options',
    description: 'Compare equipment, costs, and contractors side-by-side',
    icon: BarChart3,
    color: 'bg-blue-100 text-blue-700',
  },
  {
    number: 3,
    label: 'DECIDE',
    title: 'Make Your Choice',
    description: 'Review incentives and select your contractor',
    icon: CheckCircle,
    color: 'bg-amber-100 text-amber-700',
  },
  {
    number: 4,
    label: 'VERIFY',
    title: 'Quality Check',
    description: 'Ensure proper installation with our checklist',
    icon: ClipboardCheck,
    color: 'bg-purple-100 text-purple-700',
  },
];

interface DashboardPhasePreviewProps {
  onStartProject?: () => void;
}

export function DashboardPhasePreview({ onStartProject }: DashboardPhasePreviewProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Your Bid Comparison Journey
        </h2>
        <p className="text-gray-600 text-sm">
          Follow these four simple steps to confidently choose the right heat pump contractor
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {PHASES.map((phase, index) => {
          const Icon = phase.icon;
          return (
            <div key={phase.number} className="relative">
              <div className="bg-gray-50 rounded-lg p-4 h-full flex flex-col items-center text-center transition-all hover:shadow-md hover:bg-gray-100 cursor-default">
                <div className={`w-12 h-12 rounded-full ${phase.color} flex items-center justify-center mb-3`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="mb-2">
                  <div className="text-xs font-semibold text-gray-500 mb-1">
                    STEP {phase.number}
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm mb-1">
                    {phase.title}
                  </h3>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  {phase.description}
                </p>
              </div>
              {index < PHASES.length - 1 && (
                <div className="hidden md:block absolute top-1/4 -right-2 w-4 h-4">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="w-full h-full text-gray-300"
                  >
                    <path
                      d="M9 5l7 7-7 7"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {onStartProject && (
        <div className="text-center pt-4 border-t border-gray-100">
          <button
            onClick={onStartProject}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-switch-green-600 text-white rounded-lg font-medium hover:bg-switch-green-700 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Get Started with Your Bids
          </button>
        </div>
      )}
    </div>
  );
}
