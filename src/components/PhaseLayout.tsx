import { ReactNode } from 'react';
import { Check, Home, ChevronRight } from 'lucide-react';
import { usePhase, Phase } from '../context/PhaseContext';

interface PhaseLayoutProps {
  children: ReactNode;
  onNavigateHome?: () => void;
  projectName?: string;
}

const PHASES: { phase: Phase; label: string }[] = [
  { phase: 1, label: 'GATHER' },
  { phase: 2, label: 'COMPARE' },
  { phase: 3, label: 'DECIDE' },
  { phase: 4, label: 'VERIFY' },
];

export function PhaseLayout({ children, onNavigateHome, projectName }: PhaseLayoutProps) {
  const { currentPhase, phaseStatus, goToPhase, canAccessPhase } = usePhase();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          {onNavigateHome && (
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
              <button
                onClick={onNavigateHome}
                className="flex items-center gap-2 text-gray-600 hover:text-switch-green-600 transition-colors group"
                aria-label="Return to Bid Compare Dashboard"
              >
                <div className="w-8 h-8 rounded-lg bg-gray-100 group-hover:bg-switch-green-100 flex items-center justify-center transition-colors">
                  <Home className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium hidden sm:inline">Dashboard</span>
              </button>
              <ChevronRight className="w-4 h-4 text-gray-300" />
              <span className="text-sm font-medium text-gray-900 truncate max-w-[200px] sm:max-w-none">
                {projectName || 'Current Project'}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between">
            {PHASES.map((item, index) => {
              const status = phaseStatus[item.phase];
              const isActive = currentPhase === item.phase;
              const isClickable = canAccessPhase(item.phase);

              return (
                <div key={item.phase} className="flex items-center flex-1">
                  <button
                    onClick={() => isClickable && goToPhase(item.phase)}
                    disabled={!isClickable}
                    className={`
                      flex items-center gap-2 transition-all min-w-0
                      ${isClickable ? 'cursor-pointer' : 'cursor-not-allowed'}
                      ${isActive ? 'opacity-100' : isClickable ? 'opacity-70 hover:opacity-100' : 'opacity-40'}
                    `}
                    aria-label={`${item.label} (Phase ${item.phase})`}
                  >
                    <div
                      className={`
                        w-10 h-10 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors flex-shrink-0
                        ${status === 'completed' ? 'bg-switch-green-600 text-white' : ''}
                        ${status === 'active' && isActive ? 'bg-switch-green-600 text-white' : ''}
                        ${status === 'active' && !isActive ? 'bg-switch-green-100 text-switch-green-700 border-2 border-switch-green-600' : ''}
                        ${status === 'locked' ? 'bg-gray-200 text-gray-400' : ''}
                      `}
                    >
                      {status === 'completed' ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        item.phase
                      )}
                    </div>
                    <span
                      className={`
                        text-xs sm:text-sm font-medium hidden md:block truncate
                        ${isActive ? 'text-gray-900' : 'text-gray-500'}
                      `}
                    >
                      {item.label}
                    </span>
                  </button>

                  {index < PHASES.length - 1 && (
                    <div className="flex-1 mx-2 sm:mx-3 min-w-[12px]">
                      <div
                        className={`
                          h-0.5 transition-colors
                          ${phaseStatus[(index + 2) as Phase] !== 'locked' || phaseStatus[(index + 1) as Phase] === 'completed'
                            ? 'bg-switch-green-600'
                            : 'bg-gray-200'
                          }
                        `}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-3">
            <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-switch-green-600 transition-all duration-500"
                style={{
                  width: `${((currentPhase - 1) / 3) * 100 + (phaseStatus[currentPhase] === 'completed' ? 25 : 0)}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
