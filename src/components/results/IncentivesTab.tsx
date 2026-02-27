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

  useEffect(() => {
    async function loadRebatePrograms() {
      const zip = propertyZip;
      const stateCode = zip ? zipToState(zip) : undefined;
      try {
        const data = await getIncentivesByZip(zip || '', stateCode || undefined);
        if (data) {
          setRebatePrograms(data);
          setSelectedIncentives(new Set(data.map(p => p.id)));
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

  return (
    <div className="space-y-6">
      {/* Incentives Table */}
      {rebatePrograms.length > 0 ? (
        <IncentivesTable
          rebatePrograms={rebatePrograms}
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
