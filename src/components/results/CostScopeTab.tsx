import { useState } from 'react';
import { Star, CheckCircle, XCircle, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { deduplicateBids, type BidEntry } from '../../lib/utils/bidDeduplication';
import { getHighestValue, isHighlighted, LABEL_COL_WIDTH, BID_COL_MIN_WIDTH, SCOPE_ITEMS } from '../../lib/utils/comparisonHelpers';
import { formatCurrency, formatDate } from '../../lib/utils/formatters';
import { ElectricalComparisonTable } from '../ElectricalComparisonTable';

interface CostScopeTabProps {
  bids: BidEntry[];
}

export function CostScopeTab({ bids }: CostScopeTabProps) {
  const [showFinancingDetails, setShowFinancingDetails] = useState(false);

  const deduplicatedBids = deduplicateBids(bids);

  const formatDateDisplay = (dateString: string | null | undefined) => {
    return formatDate(dateString) || '-';
  };

  const costData = deduplicatedBids.map((b) => {
    const sc = b.scope;
    return {
      bidId: b.bid.id,
      contractor: b.bid.contractor_name || 'Unknown',
      totalAmount: sc?.total_bid_amount ?? 0,
      equipmentCost: sc?.equipment_cost,
      laborCost: sc?.labor_cost,
      materialsCost: sc?.materials_cost,
      permitCost: sc?.permit_cost,
      laborWarranty: sc?.labor_warranty_years,
      equipmentWarranty: sc?.equipment_warranty_years,
      financingAvailable: sc?.financing_offered,
      financingTerms: sc?.financing_terms,
      exclusions: sc?.exclusions || [],
      estimatedDays: sc?.estimated_days,
      startDateAvailable: sc?.start_date_available,
      validUntil: sc?.valid_until,
      bidDate: sc?.bid_date,
      depositRequired: sc?.deposit_required,
      depositPercentage: sc?.deposit_percentage,
      paymentSchedule: sc?.payment_schedule,
      mergedBidCount: (b as ReturnType<typeof deduplicateBids>[0]).mergedBidCount,
    };
  });

  const scopeData = deduplicatedBids.map((b) => {
    const sc = b.scope;
    return {
      bidId: b.bid.id,
      contractor: b.bid.contractor_name || 'Unknown',
      permit: sc?.permit_included,
      permitDetail: sc?.permit_detail,
      disposal: sc?.disposal_included,
      disposalDetail: sc?.disposal_detail,
      electrical: sc?.electrical_included,
      electricalDetail: sc?.electrical_detail,
      ductwork: sc?.ductwork_included,
      ductworkDetail: sc?.ductwork_detail,
      thermostat: sc?.thermostat_included,
      thermostatDetail: sc?.thermostat_detail,
      manualJ: sc?.manual_j_included,
      manualJDetail: sc?.manual_j_detail,
      commissioning: sc?.commissioning_included,
      commissioningDetail: sc?.commissioning_detail,
      airHandler: sc?.air_handler_included,
      airHandlerDetail: sc?.air_handler_detail,
      lineSet: sc?.line_set_included,
      lineSetDetail: sc?.line_set_detail,
      disconnect: sc?.disconnect_included,
      disconnectDetail: sc?.disconnect_detail,
      pad: sc?.pad_included,
      padDetail: sc?.pad_detail,
      drainLine: sc?.drain_line_included,
      drainLineDetail: sc?.drain_line_detail,
      mergedBidCount: (b as ReturnType<typeof deduplicateBids>[0]).mergedBidCount,
    };
  });

  const lowestPrice = getHighestValue(costData.map((c) => c.totalAmount), false);
  const bestLaborWarranty = getHighestValue(costData.map((c) => c.laborWarranty));
  const bestEquipmentWarranty = getHighestValue(costData.map((c) => c.equipmentWarranty));
  const fastestTimeline = getHighestValue(costData.map((c) => c.estimatedDays), false);

  const bidCount = deduplicatedBids.length;
  const tableMinWidth = `calc(${LABEL_COL_WIDTH} + (${bidCount} * ${BID_COL_MIN_WIDTH}))`;
  const labelCellStyle = { width: LABEL_COL_WIDTH, minWidth: LABEL_COL_WIDTH, maxWidth: LABEL_COL_WIDTH };
  const bidCellStyle = { minWidth: BID_COL_MIN_WIDTH };

  return (
    <div className="space-y-6">
      {/* Cost Comparison Table */}
      <div className="bg-white rounded-xl border-2 border-gray-200 shadow-lg overflow-hidden">
        <div className="px-5 py-3 border-b-2 border-gray-200 flex items-center gap-3 bg-gradient-to-r from-switch-green-600 to-switch-green-700">
          <h2 className="font-semibold text-white">Cost & Warranty Comparison</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full" style={{ minWidth: tableMinWidth, tableLayout: 'fixed' }}>
            <thead>
              <tr className="bg-gray-900">
                <th style={labelCellStyle} className="px-5 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider border-r border-gray-700">
                  Cost Item
                </th>
                {costData.map((c, idx) => (
                  <th key={c.bidId} style={bidCellStyle} className={`px-5 py-4 text-left text-sm font-semibold text-white ${idx < costData.length - 1 ? 'border-r border-gray-700' : ''}`}>
                    {c.contractor}
                    {c.mergedBidCount && c.mergedBidCount > 1 && (
                      <span className="block text-xs font-normal text-gray-400 mt-0.5">
                        {c.mergedBidCount} bids merged
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b-2 border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                <td style={labelCellStyle} className="px-5 py-5 text-sm font-bold text-gray-900 bg-gray-100 border-r border-gray-200">Total Bid Amount</td>
                {costData.map((c, idx) => (
                  <td key={c.bidId} style={bidCellStyle} className={`px-5 py-5 ${isHighlighted(c.totalAmount, lowestPrice) ? 'bg-gradient-to-r from-switch-green-50 to-switch-green-100' : ''} ${idx < costData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                    <span className="flex items-center gap-2">
                      <span className={`text-xl font-bold ${isHighlighted(c.totalAmount, lowestPrice) ? 'text-switch-green-700' : 'text-gray-900'}`}>
                        {formatCurrency(c.totalAmount)}
                      </span>
                      {isHighlighted(c.totalAmount, lowestPrice) && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-switch-green-600 text-white text-xs font-medium rounded-full">
                          <Star className="w-3 h-3" /> LOWEST
                        </span>
                      )}
                    </span>
                  </td>
                ))}
              </tr>
              <tr className="border-b border-gray-200 bg-gray-50/50">
                <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-700 bg-gray-50 border-r border-gray-200">Equipment Cost</td>
                {costData.map((c, idx) => (
                  <td key={c.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm font-semibold text-gray-900 ${idx < costData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                    {formatCurrency(c.equipmentCost)}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-gray-200">
                <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-700 bg-gray-50 border-r border-gray-200">Labor Cost</td>
                {costData.map((c, idx) => (
                  <td key={c.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm font-semibold text-gray-900 ${idx < costData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                    {formatCurrency(c.laborCost)}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-gray-200 bg-gray-50/50">
                <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-700 bg-gray-50 border-r border-gray-200">Labor Warranty</td>
                {costData.map((c, idx) => (
                  <td key={c.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm font-semibold ${isHighlighted(c.laborWarranty, bestLaborWarranty) ? 'text-switch-green-700 bg-gradient-to-r from-switch-green-50 to-switch-green-100' : 'text-gray-900'} ${idx < costData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                    <span className="flex items-center gap-2">
                      {c.laborWarranty ? `${c.laborWarranty} years` : '-'}
                      {isHighlighted(c.laborWarranty, bestLaborWarranty) && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-switch-green-600 text-white text-xs font-medium rounded-full">
                          <Star className="w-3 h-3" /> BEST
                        </span>
                      )}
                    </span>
                  </td>
                ))}
              </tr>
              <tr className="border-b border-gray-200">
                <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-700 bg-gray-50 border-r border-gray-200">Equipment Warranty</td>
                {costData.map((c, idx) => (
                  <td key={c.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm font-semibold ${isHighlighted(c.equipmentWarranty, bestEquipmentWarranty) ? 'text-switch-green-700 bg-gradient-to-r from-switch-green-50 to-switch-green-100' : 'text-gray-900'} ${idx < costData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                    <span className="flex items-center gap-2">
                      {c.equipmentWarranty ? `${c.equipmentWarranty} years` : '-'}
                      {isHighlighted(c.equipmentWarranty, bestEquipmentWarranty) && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-switch-green-600 text-white text-xs font-medium rounded-full">
                          <Star className="w-3 h-3" /> BEST
                        </span>
                      )}
                    </span>
                  </td>
                ))}
              </tr>
              <tr className="border-b border-gray-200 bg-gray-50/50">
                <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-700 bg-gray-50 border-r border-gray-200">Estimated Duration</td>
                {costData.map((c, idx) => (
                  <td key={c.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm ${isHighlighted(c.estimatedDays, fastestTimeline) ? 'text-switch-green-700 font-semibold' : 'text-gray-600'} ${idx < costData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                    {c.estimatedDays ? `${c.estimatedDays} days` : '-'}
                    {isHighlighted(c.estimatedDays, fastestTimeline) && c.estimatedDays && (
                      <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 bg-switch-green-600 text-white text-xs font-medium rounded-full">
                        FASTEST
                      </span>
                    )}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-gray-200">
                <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-700 bg-gray-50 border-r border-gray-200">Financing Available</td>
                {costData.map((c, idx) => (
                  <td key={c.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm ${idx < costData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                    {c.financingAvailable ? (
                      <span className="inline-flex items-center gap-1 text-switch-green-700 font-medium">
                        <CheckCircle className="w-5 h-5" /> Available
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-gray-400">
                        <XCircle className="w-5 h-5" /> No
                      </span>
                    )}
                  </td>
                ))}
              </tr>
              <tr className={showFinancingDetails ? 'border-b border-gray-200 bg-gray-50/50' : ''}>
                <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-700 bg-gray-50 border-r border-gray-200">What is NOT Included</td>
                {costData.map((c, idx) => (
                  <td key={c.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm text-gray-900 ${idx < costData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                    {c.exclusions.length > 0 ? (
                      <ul className="text-xs space-y-1.5">
                        {c.exclusions.slice(0, 4).map((item, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                            <span className="text-gray-700">{item}</span>
                          </li>
                        ))}
                        {c.exclusions.length > 4 && (
                          <li className="text-gray-500 pl-5">+{c.exclusions.length - 4} more items</li>
                        )}
                      </ul>
                    ) : (
                      <span className="text-gray-400">Not specified</span>
                    )}
                  </td>
                ))}
              </tr>

              {showFinancingDetails && (
                <>
                  <tr className="border-b border-gray-200">
                    <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-500 bg-gray-50 border-r border-gray-200">Available Start Date</td>
                    {costData.map((c, idx) => (
                      <td key={c.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm text-gray-600 ${idx < costData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                        {formatDateDisplay(c.startDateAvailable)}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-gray-200 bg-gray-50/50">
                    <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-500 bg-gray-50 border-r border-gray-200">Quote Valid Until</td>
                    {costData.map((c, idx) => (
                      <td key={c.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm text-gray-600 ${idx < costData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                        {formatDateDisplay(c.validUntil)}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-500 bg-gray-50 border-r border-gray-200">Bid Date</td>
                    {costData.map((c, idx) => (
                      <td key={c.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm text-gray-600 ${idx < costData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                        {formatDateDisplay(c.bidDate)}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-gray-200 bg-gray-50/50">
                    <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-500 bg-gray-50 border-r border-gray-200">Materials Cost</td>
                    {costData.map((c, idx) => (
                      <td key={c.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm text-gray-600 ${idx < costData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                        {formatCurrency(c.materialsCost)}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-500 bg-gray-50 border-r border-gray-200">Permit Cost</td>
                    {costData.map((c, idx) => (
                      <td key={c.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm text-gray-600 ${idx < costData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                        {formatCurrency(c.permitCost)}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-gray-200 bg-gray-50/50">
                    <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-500 bg-gray-50 border-r border-gray-200">Deposit Required</td>
                    {costData.map((c, idx) => (
                      <td key={c.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm text-gray-600 ${idx < costData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                        {c.depositRequired ? formatCurrency(c.depositRequired) : c.depositPercentage ? `${c.depositPercentage}%` : '-'}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-500 bg-gray-50 border-r border-gray-200">Payment Schedule</td>
                    {costData.map((c, idx) => (
                      <td key={c.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm text-gray-600 ${idx < costData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                        {c.paymentSchedule || '-'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-500 bg-gray-50 border-r border-gray-200">Financing Terms</td>
                    {costData.map((c, idx) => (
                      <td key={c.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm text-gray-600 ${idx < costData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                        {c.financingTerms || '-'}
                      </td>
                    ))}
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-3 bg-gray-50 border-t border-gray-200">
          <button
            onClick={() => setShowFinancingDetails(!showFinancingDetails)}
            className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            {showFinancingDetails ? (
              <>
                <ChevronUp className="w-4 h-4" />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                Show Financial Terms & Details
              </>
            )}
          </button>
        </div>
      </div>

      {/* Scope Table */}
      <div className="bg-white rounded-xl border-2 border-gray-200 shadow-lg overflow-hidden">
        <div className="px-5 py-3 border-b-2 border-gray-200 bg-gradient-to-r from-gray-700 to-gray-800">
          <h2 className="font-semibold text-white">Scope - What's Included</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full" style={{ minWidth: tableMinWidth, tableLayout: 'fixed' }}>
            <thead>
              <tr className="bg-gray-900">
                <th style={labelCellStyle} className="px-5 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider border-r border-gray-700">
                  Scope Item
                </th>
                {scopeData.map((s, idx) => (
                  <th key={s.bidId} style={bidCellStyle} className={`px-5 py-4 text-left text-sm font-semibold text-white ${idx < scopeData.length - 1 ? 'border-r border-gray-700' : ''}`}>
                    {s.contractor}
                    {s.mergedBidCount && s.mergedBidCount > 1 && (
                      <span className="block text-xs font-normal text-gray-400 mt-0.5">
                        {s.mergedBidCount} bids merged
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SCOPE_ITEMS.map((item, rowIdx) => (
                <tr key={item.key} className={`border-b border-gray-200 ${rowIdx % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                  <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-700 bg-gray-50 border-r border-gray-200">
                    {item.label}
                  </td>
                  {scopeData.map((s, idx) => {
                    const value = s[item.key as keyof typeof s];
                    const detail = s[item.detailKey as keyof typeof s];
                    return (
                      <td key={s.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm ${idx < scopeData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                        {value === true ? (
                          <div>
                            <span className="inline-flex items-center gap-1 text-switch-green-700 font-medium">
                              <CheckCircle className="w-5 h-5" /> Included
                            </span>
                            {detail && typeof detail === 'string' && (
                              <p className="text-xs text-gray-600 mt-1">{detail}</p>
                            )}
                          </div>
                        ) : value === false ? (
                          <span className="inline-flex items-center gap-1 text-red-500">
                            <XCircle className="w-5 h-5" /> Not Included
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-gray-400" title="Not specified in bid">
                            <HelpCircle className="w-5 h-5" /> Unknown
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Electrical Comparison */}
      <ElectricalComparisonTable
        rows={deduplicatedBids.map(b => ({
          bidId: b.bid.id,
          contractorName: b.bid.contractor_name,
          scope: b.scope,
        }))}
      />
    </div>
  );
}
