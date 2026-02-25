import { Zap, CheckCircle2, XCircle, AlertTriangle, DollarSign, Info } from 'lucide-react';
import type { BidScope } from '../lib/types';
import { formatCurrency } from '../lib/utils/formatters';

interface ElectricalInfoCardProps {
  scope: BidScope | null | undefined;
  className?: string;
}

export function ElectricalInfoCard({ scope, className = '' }: ElectricalInfoCardProps) {
  const hasElectricalInfo = scope && (
    scope.panel_assessment_included !== null ||
    scope.panel_upgrade_included !== null ||
    scope.breaker_size_required !== null ||
    scope.electrical_notes
  );

  if (!hasElectricalInfo) {
    return null;
  }

  const needsPanelUpgrade = scope.panel_upgrade_included === true;
  const hasAssessment = scope.panel_assessment_included === true;

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
        {scope.panel_upgrade_included !== null && (
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
                    {scope.existing_panel_amps && scope.proposed_panel_amps && (
                      <> from {scope.existing_panel_amps}A to {scope.proposed_panel_amps}A</>
                    )}
                  </>
                ) : (
                  'No upgrade needed - existing panel adequate'
                )}
              </p>
              {needsPanelUpgrade && scope.panel_upgrade_cost && (
                <div className="flex items-center gap-1 mt-2">
                  <DollarSign className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-semibold text-gray-900">
                    {formatCurrency(scope.panel_upgrade_cost)}
                  </span>
                  <span className="text-xs text-gray-500">upgrade cost</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Current Panel Info */}
        {scope.existing_panel_amps && (
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-500 text-xs">Current Panel</p>
                <p className="font-semibold text-gray-900">{scope.existing_panel_amps}A</p>
              </div>
              {scope.proposed_panel_amps && (
                <div>
                  <p className="text-gray-500 text-xs">Proposed Panel</p>
                  <p className="font-semibold text-gray-900">{scope.proposed_panel_amps}A</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Breaker & Circuit Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {scope.breaker_size_required && (
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xs text-blue-700 font-medium mb-1">Required Breaker</p>
              <p className="text-lg font-bold text-blue-900">{scope.breaker_size_required}A</p>
            </div>
          )}

          {scope.dedicated_circuit_included !== null && (
            <div className={`rounded-lg p-3 ${
              scope.dedicated_circuit_included ? 'bg-switch-green-50' : 'bg-gray-50'
            }`}>
              <p className={`text-xs font-medium mb-1 ${
                scope.dedicated_circuit_included ? 'text-switch-green-700' : 'text-gray-600'
              }`}>
                Dedicated Circuit
              </p>
              <p className={`text-sm font-semibold ${
                scope.dedicated_circuit_included ? 'text-switch-green-900' : 'text-gray-700'
              }`}>
                {scope.dedicated_circuit_included ? 'Included' : 'Not Included'}
              </p>
            </div>
          )}
        </div>

        {/* Additional Requirements */}
        <div className="space-y-2">
          {scope.electrical_permit_included !== null && (
            <div className="flex items-center gap-2">
              {scope.electrical_permit_included ? (
                <CheckCircle2 className="w-4 h-4 text-switch-green-600" />
              ) : (
                <XCircle className="w-4 h-4 text-gray-400" />
              )}
              <span className="text-sm text-gray-700">
                Electrical permit {scope.electrical_permit_included ? 'included' : 'not included'}
              </span>
            </div>
          )}

          {scope.load_calculation_included !== null && (
            <div className="flex items-center gap-2">
              {scope.load_calculation_included ? (
                <CheckCircle2 className="w-4 h-4 text-switch-green-600" />
              ) : (
                <XCircle className="w-4 h-4 text-gray-400" />
              )}
              <span className="text-sm text-gray-700">
                Load calculation {scope.load_calculation_included ? 'included' : 'not included'}
              </span>
            </div>
          )}
        </div>

        {/* Notes */}
        {scope.electrical_notes && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-blue-900 mb-1">Contractor Notes</p>
                <p className="text-sm text-blue-700 whitespace-pre-wrap">{scope.electrical_notes}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
