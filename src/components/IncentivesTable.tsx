import { useState } from 'react';
import { ChevronDown, ChevronRight, DollarSign, CheckSquare, Square, ExternalLink, Calendar, Clock, Info } from 'lucide-react';
import type { RebateProgram } from '../lib/types';

interface IncentivesTableProps {
  rebatePrograms: RebateProgram[];
  selectedIncentives: Set<string>;
  onToggleIncentive: (programId: string) => void;
}

export function IncentivesTable({ rebatePrograms, selectedIncentives, onToggleIncentive }: IncentivesTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleExpand = (programId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(programId)) {
      newExpanded.delete(programId);
    } else {
      newExpanded.add(programId);
    }
    setExpandedRows(newExpanded);
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getAmount = (program: RebateProgram) => {
    return program.max_rebate || program.rebate_amount || 0;
  };

  const totalSelectedAmount = Array.from(selectedIncentives).reduce((sum, id) => {
    const program = rebatePrograms.find(p => p.id === id);
    return sum + (program ? getAmount(program) : 0);
  }, 0);

  if (rebatePrograms.length === 0) {
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
        {rebatePrograms.map((program) => {
          const isExpanded = expandedRows.has(program.id);
          const isSelected = selectedIncentives.has(program.id);
          const amount = getAmount(program);

          return (
            <div key={program.id} className={isSelected ? 'bg-switch-green-50/50' : ''}>
              <div className="flex items-center gap-3 px-5 py-4">
                <button
                  onClick={() => toggleExpand(program.id)}
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
                    <h4 className="font-semibold text-gray-900">{program.program_name}</h4>
                    {program.program_type && (
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                        {program.program_type}
                      </span>
                    )}
                    {program.income_qualified && (
                      <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">
                        Income Qualified
                      </span>
                    )}
                  </div>
                  {!isExpanded && program.description && (
                    <p className="text-sm text-gray-500 mt-0.5 truncate">{program.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-lg font-bold text-switch-green-700">
                      {program.rebate_percentage
                        ? `Up to ${program.rebate_percentage}%`
                        : formatCurrency(amount)
                      }
                    </span>
                    {program.rebate_percentage && program.max_rebate && (
                      <p className="text-xs text-gray-500">Max: {formatCurrency(program.max_rebate)}</p>
                    )}
                  </div>

                  <button
                    onClick={() => onToggleIncentive(program.id)}
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
                  {program.description && (
                    <div>
                      <p className="text-sm text-gray-700">{program.description}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(program.valid_from || program.valid_until) && (
                      <div className="flex items-start gap-2">
                        <Calendar className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="text-xs font-medium text-gray-500 uppercase">Valid Period</span>
                          <p className="text-sm text-gray-900">
                            {program.valid_from && formatDate(program.valid_from)}
                            {program.valid_from && program.valid_until && ' - '}
                            {program.valid_until && formatDate(program.valid_until)}
                            {!program.valid_from && !program.valid_until && 'Ongoing'}
                          </p>
                        </div>
                      </div>
                    )}

                    {program.typical_processing_days && (
                      <div className="flex items-start gap-2">
                        <Clock className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="text-xs font-medium text-gray-500 uppercase">Processing Time</span>
                          <p className="text-sm text-gray-900">
                            ~{program.typical_processing_days} days
                          </p>
                        </div>
                      </div>
                    )}

                    {program.available_states && program.available_states.length > 0 && !program.available_nationwide && (
                      <div className="flex items-start gap-2">
                        <Info className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="text-xs font-medium text-gray-500 uppercase">Available In</span>
                          <p className="text-sm text-gray-900">
                            {program.available_states.join(', ')}
                          </p>
                        </div>
                      </div>
                    )}

                    {program.available_nationwide && (
                      <div className="flex items-start gap-2">
                        <Info className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="text-xs font-medium text-gray-500 uppercase">Availability</span>
                          <p className="text-sm text-gray-900">Available Nationwide</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {program.application_process && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <span className="text-xs font-medium text-gray-500 uppercase">How to Apply</span>
                      <p className="text-sm text-gray-700 mt-1">{program.application_process}</p>
                    </div>
                  )}

                  {program.requirements && Object.keys(program.requirements).length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <span className="text-xs font-medium text-gray-500 uppercase">Requirements</span>
                      <ul className="text-sm text-gray-700 mt-1 space-y-1">
                        {Object.entries(program.requirements).map(([key, value]) => (
                          <li key={key} className="flex items-start gap-2">
                            <span className="text-gray-400">-</span>
                            <span>{String(value)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {!program.stackable && program.cannot_stack_with && program.cannot_stack_with.length > 0 && (
                    <div className="text-sm text-amber-700 bg-amber-50 rounded-lg p-3">
                      <span className="font-medium">Note:</span> Cannot be combined with: {program.cannot_stack_with.join(', ')}
                    </div>
                  )}

                  {program.application_url && (
                    <a
                      href={program.application_url}
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
            {selectedIncentives.size} of {rebatePrograms.length} selected
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
