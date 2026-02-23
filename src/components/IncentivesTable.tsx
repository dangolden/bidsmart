import { useState } from 'react';
import { ChevronDown, ChevronRight, DollarSign, CheckSquare, Square, ExternalLink, Info } from 'lucide-react';
import type { ProjectIncentive } from '../lib/types';
import { formatCurrency } from '../lib/utils/formatters';

interface IncentivesTableProps {
  projectIncentives: ProjectIncentive[];
  selectedIncentives: Set<string>;
  onToggleIncentive: (incentiveId: string) => void;
}

export function IncentivesTable({ projectIncentives, selectedIncentives, onToggleIncentive }: IncentivesTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleExpand = (incentiveId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(incentiveId)) {
      newExpanded.delete(incentiveId);
    } else {
      newExpanded.add(incentiveId);
    }
    setExpandedRows(newExpanded);
  };

  const getAmount = (incentive: ProjectIncentive) => {
    return incentive.amount_max || incentive.amount_min || 0;
  };

  const totalSelectedAmount = Array.from(selectedIncentives).reduce((sum, id) => {
    const incentive = projectIncentives.find(i => i.id === id);
    return sum + (incentive ? getAmount(incentive) : 0);
  }, 0);

  if (projectIncentives.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl border-2 border-gray-200 shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-switch-green-600 to-switch-green-700 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-lg">Available Rebates & Incentives</h3>
            <p className="text-switch-green-100 text-sm">
              Select the incentives you plan to apply for
            </p>
          </div>
        </div>
      </div>

      <div className="divide-y divide-gray-200">
        {projectIncentives.map((incentive) => {
          const isExpanded = expandedRows.has(incentive.id);
          const isSelected = selectedIncentives.has(incentive.id);
          const amount = getAmount(incentive);

          return (
            <div key={incentive.id} className={isSelected ? 'bg-switch-green-50/50' : ''}>
              <div className="flex items-center gap-3 px-5 py-4">
                <button
                  onClick={() => toggleExpand(incentive.id)}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-500" />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-gray-900">{incentive.program_name}</h4>
                    {incentive.program_type && (
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full capitalize">
                        {incentive.program_type.replace(/_/g, ' ')}
                      </span>
                    )}
                    {incentive.income_qualified && (
                      <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">
                        Income Qualified
                      </span>
                    )}
                    {incentive.still_active === false && (
                      <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full">
                        Inactive
                      </span>
                    )}
                  </div>
                  {!isExpanded && incentive.eligibility_requirements && (
                    <p className="text-sm text-gray-500 mt-0.5 truncate">{incentive.eligibility_requirements}</p>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    {incentive.amount_description ? (
                      <span className="text-base font-bold text-switch-green-700">
                        {incentive.amount_description}
                      </span>
                    ) : amount > 0 ? (
                      <>
                        <span className="text-lg font-bold text-switch-green-700">
                          {incentive.amount_min && incentive.amount_max && incentive.amount_min !== incentive.amount_max
                            ? `${formatCurrency(incentive.amount_min)}–${formatCurrency(incentive.amount_max)}`
                            : formatCurrency(amount)
                          }
                        </span>
                      </>
                    ) : (
                      <span className="text-sm text-gray-400">Amount varies</span>
                    )}
                  </div>

                  <button
                    onClick={() => onToggleIncentive(incentive.id)}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-6 h-6 text-switch-green-600" />
                    ) : (
                      <Square className="w-6 h-6 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="px-5 pb-5 pl-14 space-y-4">
                  {incentive.eligibility_requirements && (
                    <div>
                      <span className="text-xs font-medium text-gray-500 uppercase">Eligibility</span>
                      <p className="text-sm text-gray-700 mt-1">{incentive.eligibility_requirements}</p>
                    </div>
                  )}

                  {incentive.income_limits && (
                    <div className="flex items-start gap-2">
                      <Info className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="text-xs font-medium text-gray-500 uppercase">Income Limits</span>
                        <p className="text-sm text-gray-900">{incentive.income_limits}</p>
                      </div>
                    </div>
                  )}

                  {incentive.equipment_types_eligible && incentive.equipment_types_eligible.length > 0 && (
                    <div>
                      <span className="text-xs font-medium text-gray-500 uppercase">Eligible Equipment</span>
                      <p className="text-sm text-gray-900 mt-1">
                        {incentive.equipment_types_eligible.join(', ')}
                      </p>
                    </div>
                  )}

                  {incentive.application_process && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <span className="text-xs font-medium text-gray-500 uppercase">How to Apply</span>
                      <p className="text-sm text-gray-700 mt-1">{incentive.application_process}</p>
                    </div>
                  )}

                  {incentive.stacking_notes && (
                    <div className="text-sm text-amber-700 bg-amber-50 rounded-lg p-3">
                      <span className="font-medium">Stacking Note:</span> {incentive.stacking_notes}
                    </div>
                  )}

                  {incentive.confidence && (
                    <div className="text-xs text-gray-500">
                      Confidence: <span className="capitalize font-medium">{incentive.confidence}</span>
                      {incentive.verification_source && (
                        <span className="ml-2 text-gray-400">· Source: {incentive.verification_source}</span>
                      )}
                    </div>
                  )}

                  {incentive.application_url && (
                    <a
                      href={incentive.application_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-switch-green-600 hover:text-switch-green-700 font-medium"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View Application Details
                    </a>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-gray-50 px-5 py-4 border-t-2 border-gray-200">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {selectedIncentives.size} of {projectIncentives.length} selected
          </div>
          <div className="text-right">
            <span className="text-sm text-gray-500">Estimated Total Savings</span>
            <p className="text-2xl font-bold text-switch-green-700">
              {formatCurrency(totalSelectedAmount)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
