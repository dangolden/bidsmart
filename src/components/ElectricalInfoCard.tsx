import { Zap, CheckCircle2, XCircle, AlertTriangle, DollarSign, Info } from 'lucide-react';
import type { ContractorBid } from '../lib/types';
import { formatCurrency } from '../lib/utils/formatters';

interface ElectricalInfoCardProps {
  bid: ContractorBid;
  className?: string;
}

export function ElectricalInfoCard({ bid, className = '' }: ElectricalInfoCardProps) {
  const hasElectricalInfo = 
    bid.electrical_panel_assessment_included !== null ||
    bid.electrical_panel_upgrade_included !== null ||
    bid.electrical_breaker_size_required !== null ||
    bid.electrical_notes;

  if (!hasElectricalInfo) {
    return (
      <div className={`bg-amber-50 border-2 border-amber-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-900">No Electrical Information</p>
            <p className="text-sm text-amber-700 mt-1">
              This bid does not include electrical panel assessment or requirements. 
              Consider asking the contractor about electrical capacity needs.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const needsPanelUpgrade = bid.electrical_panel_upgrade_included === true;
  const hasAssessment = bid.electrical_panel_assessment_included === true;

  return (
    <div className={`bg-white border-2 border-gray-200 rounded-lg overflow-hidden ${className}`}>
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-white" />
          <h3 className="font-semibold text-white">Electrical Requirements</h3>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Assessment Status */}
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
            {hasAssessment ? (
              <CheckCircle2 className="w-5 h-5 text-switch-green-600" />
            ) : (
              <XCircle className="w-5 h-5 text-gray-400" />
            )}
          </div>
          <div className="flex-1">
            <p className="font-medium text-gray-900">Panel Assessment</p>
            <p className="text-sm text-gray-600 mt-0.5">
              {hasAssessment 
                ? 'Electrical panel capacity assessment included' 
                : 'No panel assessment mentioned'}
            </p>
          </div>
        </div>

        {/* Panel Upgrade */}
        {bid.electrical_panel_upgrade_included !== null && (
          <div className="flex items-start gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              needsPanelUpgrade ? 'bg-amber-100' : 'bg-switch-green-100'
            }`}>
              {needsPanelUpgrade ? (
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-switch-green-600" />
              )}
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">Panel Upgrade</p>
              <p className="text-sm text-gray-600 mt-0.5">
                {needsPanelUpgrade ? (
                  <>
                    Upgrade required
                    {bid.electrical_existing_panel_amps && bid.electrical_proposed_panel_amps && (
                      <> from {bid.electrical_existing_panel_amps}A to {bid.electrical_proposed_panel_amps}A</>
                    )}
                  </>
                ) : (
                  'No upgrade needed - existing panel adequate'
                )}
              </p>
              {needsPanelUpgrade && bid.electrical_panel_upgrade_cost && (
                <div className="flex items-center gap-1 mt-2">
                  <DollarSign className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-semibold text-gray-900">
                    {formatCurrency(bid.electrical_panel_upgrade_cost)}
                  </span>
                  <span className="text-xs text-gray-500">upgrade cost</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Current Panel Info */}
        {bid.electrical_existing_panel_amps && (
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-500 text-xs">Current Panel</p>
                <p className="font-semibold text-gray-900">{bid.electrical_existing_panel_amps}A</p>
              </div>
              {bid.electrical_proposed_panel_amps && (
                <div>
                  <p className="text-gray-500 text-xs">Proposed Panel</p>
                  <p className="font-semibold text-gray-900">{bid.electrical_proposed_panel_amps}A</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Breaker & Circuit Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {bid.electrical_breaker_size_required && (
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xs text-blue-700 font-medium mb-1">Required Breaker</p>
              <p className="text-lg font-bold text-blue-900">{bid.electrical_breaker_size_required}A</p>
            </div>
          )}
          
          {bid.electrical_dedicated_circuit_included !== null && (
            <div className={`rounded-lg p-3 ${
              bid.electrical_dedicated_circuit_included ? 'bg-switch-green-50' : 'bg-gray-50'
            }`}>
              <p className={`text-xs font-medium mb-1 ${
                bid.electrical_dedicated_circuit_included ? 'text-switch-green-700' : 'text-gray-600'
              }`}>
                Dedicated Circuit
              </p>
              <p className={`text-sm font-semibold ${
                bid.electrical_dedicated_circuit_included ? 'text-switch-green-900' : 'text-gray-700'
              }`}>
                {bid.electrical_dedicated_circuit_included ? 'Included' : 'Not Included'}
              </p>
            </div>
          )}
        </div>

        {/* Additional Requirements */}
        <div className="space-y-2">
          {bid.electrical_permit_included !== null && (
            <div className="flex items-center gap-2">
              {bid.electrical_permit_included ? (
                <CheckCircle2 className="w-4 h-4 text-switch-green-600" />
              ) : (
                <XCircle className="w-4 h-4 text-gray-400" />
              )}
              <span className="text-sm text-gray-700">
                Electrical permit {bid.electrical_permit_included ? 'included' : 'not included'}
              </span>
            </div>
          )}
          
          {bid.electrical_load_calculation_included !== null && (
            <div className="flex items-center gap-2">
              {bid.electrical_load_calculation_included ? (
                <CheckCircle2 className="w-4 h-4 text-switch-green-600" />
              ) : (
                <XCircle className="w-4 h-4 text-gray-400" />
              )}
              <span className="text-sm text-gray-700">
                Load calculation {bid.electrical_load_calculation_included ? 'included' : 'not included'}
              </span>
            </div>
          )}
        </div>

        {/* Notes */}
        {bid.electrical_notes && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-blue-900 mb-1">Contractor Notes</p>
                <p className="text-sm text-blue-700 whitespace-pre-wrap">{bid.electrical_notes}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
