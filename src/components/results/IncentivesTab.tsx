import { useState, useEffect } from 'react';
import { DollarSign } from 'lucide-react';
import { IncentivesTable } from '../IncentivesTable';
import type { RebateProgram } from '../../lib/types';
import { getIncentivesByZip } from '../../lib/database/bidsmartService';
import { zipToState } from '../../lib/utils/zipToState';

// TODO: Re-add red_flags/positive_indicators when scoring node is active

interface IncentivesTabProps {
  propertyZip: string | null | undefined;
}

export function IncentivesTab({ propertyZip }: IncentivesTabProps) {
  const [rebatePrograms, setRebatePrograms] = useState<RebateProgram[]>([]);
  const [selectedIncentives, setSelectedIncentives] = useState<Set<string>>(new Set());
  const [showLowIncome, setShowLowIncome] = useState(false);

  useEffect(() => {
    async function loadRebatePrograms() {
      const zip = propertyZip;
      const stateCode = zip ? zipToState(zip) : undefined;
      try {
        const data = await getIncentivesByZip(zip || '', stateCode || undefined);
        if (data) {
          setRebatePrograms(data);
          // Only auto-select non-income-qualified programs by default
          setSelectedIncentives(new Set(data.filter(p => !p.income_qualified).map(p => p.id)));
        }
      } catch (error) {
        console.error('Error loading incentives:', error);
      }
    }
    loadRebatePrograms();
  }, [propertyZip]);

  const toggleIncentive = (programId: string) => {
    const newSelected = new Set(selectedIncentives);
    if (newSelected.has(programId)) {
      newSelected.delete(programId);
    } else {
      newSelected.add(programId);
    }
    setSelectedIncentives(newSelected);
  };

  const lowIncomeCount = rebatePrograms.filter(p => p.income_qualified).length;
  const visiblePrograms = showLowIncome
    ? rebatePrograms
    : rebatePrograms.filter(p => !p.income_qualified);

  return (
    <div className="space-y-4">
      {/* Low Income Programs Toggle */}
      {lowIncomeCount > 0 && (
        <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <div>
              <span className="text-sm font-medium text-amber-900">
                {lowIncomeCount} Low Income Qualified Program{lowIncomeCount !== 1 ? 's' : ''} available
              </span>
              <p className="text-xs text-amber-700 mt-0.5">
                These programs have income eligibility requirements
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowLowIncome(prev => !prev)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
              showLowIncome ? 'bg-amber-500' : 'bg-gray-300'
            }`}
            aria-label="Toggle low income qualified programs"
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                showLowIncome ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      )}

      {/* Incentives Table */}
      {visiblePrograms.length > 0 ? (
        <IncentivesTable
          rebatePrograms={visiblePrograms}
          selectedIncentives={selectedIncentives}
          onToggleIncentive={toggleIncentive}
        />
      ) : (
        <div className="bg-white rounded-xl border-2 border-gray-200 p-12 text-center">
          <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Incentives Available</h3>
          <p className="text-gray-600">There are currently no active rebate programs in the system.</p>
        </div>
      )}
    </div>
  );
}
