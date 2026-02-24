import { Zap, CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react';
import type { BidScope } from '../lib/types';
import { formatCurrency } from '../lib/utils/formatters';

interface BidScopeRow {
  bidId: string;
  contractorName: string;
  scope?: BidScope | null;
}

interface ElectricalComparisonTableProps {
  rows: BidScopeRow[];
  className?: string;
}

export function ElectricalComparisonTable({ rows, className = '' }: ElectricalComparisonTableProps) {
  if (!rows || rows.length === 0) {
    return null;
  }

  const hasAnyElectricalData = rows.some(row =>
    row.scope?.panel_assessment_included !== null && row.scope?.panel_assessment_included !== undefined ||
    row.scope?.panel_upgrade_included !== null && row.scope?.panel_upgrade_included !== undefined ||
    row.scope?.breaker_size_required !== null && row.scope?.breaker_size_required !== undefined
  );

  if (!hasAnyElectricalData) {
    return (
      <div className={`bg-amber-50 border-2 border-amber-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-900">Limited Electrical Information</p>
            <p className="text-sm text-amber-700 mt-1">
              None of the bids include detailed electrical requirements.
              Consider asking contractors about electrical panel capacity and upgrade needs.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const getStatusIcon = (value: boolean | null | undefined) => {
    if (value === true) return <CheckCircle2 className="w-5 h-5 text-switch-green-600" />;
    if (value === false) return <XCircle className="w-5 h-5 text-gray-400" />;
    return <span className="text-gray-400 text-sm">—</span>;
  };

  return (
    <div className={`bg-white rounded-xl border-2 border-gray-200 shadow-md overflow-hidden ${className}`}>
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-4">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-white" />
          <h3 className="font-semibold text-white text-lg">Electrical Requirements Comparison</h3>
        </div>
        <p className="text-blue-50 text-sm mt-1">
          Compare electrical capacity assessments across all bids
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                Requirement
              </th>
              {rows.map((row, index) => (
                <th key={row.bidId} className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold">
                      {index + 1}
                    </div>
                    <span className="text-xs font-normal text-gray-600 truncate max-w-[120px]">
                      {row.contractorName}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {/* Panel Assessment */}
            <tr className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm font-medium text-gray-900">
                Panel Assessment Included
              </td>
              {rows.map(row => (
                <td key={row.bidId} className="px-4 py-3 text-center">
                  {getStatusIcon(row.scope?.panel_assessment_included)}
                </td>
              ))}
            </tr>

            {/* Current Panel Amps */}
            <tr className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm font-medium text-gray-900">
                Current Panel Capacity
              </td>
              {rows.map(row => (
                <td key={row.bidId} className="px-4 py-3 text-center text-sm text-gray-700">
                  {row.scope?.existing_panel_amps ? (
                    <span className="font-semibold">{row.scope.existing_panel_amps}A</span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
              ))}
            </tr>

            {/* Panel Upgrade Required */}
            <tr className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm font-medium text-gray-900">
                Panel Upgrade Required
              </td>
              {rows.map(row => (
                <td key={row.bidId} className="px-4 py-3 text-center">
                  {row.scope?.panel_upgrade_included === true ? (
                    <div className="flex flex-col items-center gap-1">
                      <AlertTriangle className="w-5 h-5 text-amber-600" />
                      {row.scope?.proposed_panel_amps && (
                        <span className="text-xs text-gray-600">
                          to {row.scope.proposed_panel_amps}A
                        </span>
                      )}
                    </div>
                  ) : row.scope?.panel_upgrade_included === false ? (
                    <CheckCircle2 className="w-5 h-5 text-switch-green-600" />
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
              ))}
            </tr>

            {/* Upgrade Cost */}
            <tr className="hover:bg-gray-50 bg-amber-50/30">
              <td className="px-4 py-3 text-sm font-medium text-gray-900">
                Panel Upgrade Cost
              </td>
              {rows.map(row => (
                <td key={row.bidId} className="px-4 py-3 text-center">
                  {row.scope?.panel_upgrade_cost ? (
                    <span className="font-semibold text-gray-900">
                      {formatCurrency(row.scope.panel_upgrade_cost)}
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
              ))}
            </tr>

            {/* Breaker Size */}
            <tr className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm font-medium text-gray-900">
                Required Breaker Size
              </td>
              {rows.map(row => (
                <td key={row.bidId} className="px-4 py-3 text-center text-sm text-gray-700">
                  {row.scope?.breaker_size_required ? (
                    <span className="font-semibold">{row.scope.breaker_size_required}A</span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
              ))}
            </tr>

            {/* Dedicated Circuit */}
            <tr className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm font-medium text-gray-900">
                Dedicated Circuit Included
              </td>
              {rows.map(row => (
                <td key={row.bidId} className="px-4 py-3 text-center">
                  {getStatusIcon(row.scope?.dedicated_circuit_included)}
                </td>
              ))}
            </tr>

            {/* Electrical Permit */}
            <tr className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm font-medium text-gray-900">
                Electrical Permit Included
              </td>
              {rows.map(row => (
                <td key={row.bidId} className="px-4 py-3 text-center">
                  {getStatusIcon(row.scope?.electrical_permit_included)}
                </td>
              ))}
            </tr>

            {/* Load Calculation */}
            <tr className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm font-medium text-gray-900">
                Load Calculation Included
              </td>
              {rows.map(row => (
                <td key={row.bidId} className="px-4 py-3 text-center">
                  {getStatusIcon(row.scope?.load_calculation_included)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border-t-2 border-blue-200 px-5 py-4">
        <div className="flex items-start gap-2">
          <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-blue-900">Why This Matters</p>
            <p className="text-blue-700 mt-1">
              Heat pumps require dedicated electrical circuits and adequate panel capacity.
              Panel upgrades can add $1,500-$3,500 to your total cost. Ensure contractors
              have assessed your electrical system before committing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
