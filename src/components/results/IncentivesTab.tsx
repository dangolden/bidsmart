import { useState, useEffect } from 'react';
import { DollarSign, AlertTriangle, CheckCircle } from 'lucide-react';
import { IncentivesTable } from '../IncentivesTable';
import type { RebateProgram, BidScore } from '../../lib/types';
import { getIncentivesByZip } from '../../lib/database/bidsmartService';
import { zipToState } from '../../lib/utils/zipToState';

interface BidScoreEntry {
  bidId: string;
  contractorName: string;
  scores: BidScore | null | undefined;
}

interface IncentivesTabProps {
  propertyZip: string | null | undefined;
  bidScores: BidScoreEntry[];
}

export function IncentivesTab({ propertyZip, bidScores }: IncentivesTabProps) {
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

  const hasRedFlags = bidScores.some(b => b.scores?.red_flags && b.scores.red_flags.length > 0);
  const hasPositiveIndicators = bidScores.some(b => b.scores?.positive_indicators && b.scores.positive_indicators.length > 0);

  return (
    <div className="space-y-6">
      {/* Red Flags Alert */}
      {hasRedFlags && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-red-900 mb-2">Potential Issues Identified</h3>
              <div className="space-y-2">
                {bidScores.filter(b => b.scores?.red_flags && b.scores.red_flags.length > 0).map(b => (
                  <div key={b.bidId} className="text-sm">
                    <span className="font-medium text-red-800">{b.contractorName}:</span>
                    <ul className="list-disc ml-5 mt-1 text-red-700">
                      {b.scores?.red_flags?.slice(0, 3).map((flag, i) => (
                        <li key={i}>{flag.issue}</li>
                      ))}
                      {b.scores?.red_flags && b.scores.red_flags.length > 3 && (
                        <li className="text-red-500">+{b.scores.red_flags.length - 3} more issues</li>
                      )}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Positive Indicators */}
      {hasPositiveIndicators && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-green-900 mb-2">Positive Indicators</h3>
              <div className="space-y-2">
                {bidScores.filter(b => b.scores?.positive_indicators && b.scores.positive_indicators.length > 0).map(b => (
                  <div key={b.bidId} className="text-sm">
                    <span className="font-medium text-green-800">{b.contractorName}:</span>
                    <ul className="list-disc ml-5 mt-1 text-green-700">
                      {b.scores?.positive_indicators?.slice(0, 3).map((indicator, i) => (
                        <li key={i}>{indicator.indicator}</li>
                      ))}
                      {b.scores?.positive_indicators && b.scores.positive_indicators.length > 3 && (
                        <li className="text-green-500">+{b.scores.positive_indicators.length - 3} more</li>
                      )}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

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
