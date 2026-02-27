import { useState } from 'react';
import { Star, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { deduplicateBids, getContractorDisplayName, type BidEntry } from '../../lib/utils/bidDeduplication';
import { getHighestValue, isHighlighted, LABEL_COL_WIDTH, BID_COL_MIN_WIDTH } from '../../lib/utils/comparisonHelpers';

interface EquipmentTabProps {
  bids: BidEntry[];
}

export function EquipmentTab({ bids }: EquipmentTabProps) {
  const [showMore, setShowMore] = useState(false);

  const deduplicatedBids = deduplicateBids(bids);

  const equipmentData = deduplicatedBids.map((b, idx) => {
    const mainEquipment = b.equipment.find(
      (e) => e.equipment_type === 'outdoor_unit' || e.equipment_type === 'heat_pump'
    ) || b.equipment[0];

    return {
      bidId: b.bid.id,
      contractor: getContractorDisplayName(b.bid.contractor_name, idx),
      brand: mainEquipment?.brand || '-',
      model: mainEquipment?.model_number || mainEquipment?.model_name || '-',
      seer2: mainEquipment?.seer2_rating || mainEquipment?.seer_rating,
      hspf2: mainEquipment?.hspf2_rating || mainEquipment?.hspf_rating,
      capacityTons: mainEquipment?.capacity_tons,
      capacityBtu: mainEquipment?.capacity_btu,
      variableSpeed: mainEquipment?.variable_speed,
      soundLevel: mainEquipment?.sound_level_db,
      energyStar: mainEquipment?.energy_star_certified,
      energyStarMostEfficient: mainEquipment?.energy_star_most_efficient,
      refrigerantType: mainEquipment?.refrigerant_type,
      voltage: mainEquipment?.voltage,
      stages: mainEquipment?.stages,
      cop: mainEquipment?.cop,
      eer: mainEquipment?.eer_rating,
      compressorWarranty: mainEquipment?.compressor_warranty_years,
      mergedBidCount: (b as ReturnType<typeof deduplicateBids>[0]).mergedBidCount,
    };
  });

  const bestSeer = getHighestValue(equipmentData.map((e) => e.seer2));
  const bestHspf = getHighestValue(equipmentData.map((e) => e.hspf2));

  const bidCount = deduplicatedBids.length;
  const tableMinWidth = `calc(${LABEL_COL_WIDTH} + (${bidCount} * ${BID_COL_MIN_WIDTH}))`;
  const labelCellStyle = { width: LABEL_COL_WIDTH, minWidth: LABEL_COL_WIDTH, maxWidth: LABEL_COL_WIDTH };
  const bidCellStyle = { minWidth: BID_COL_MIN_WIDTH };

  return (
    <div className="bg-white rounded-xl border-2 border-gray-200 shadow-lg overflow-hidden">
      <div className="px-5 py-3 border-b-2 border-gray-200 flex items-center gap-3 bg-gradient-to-r from-switch-green-600 to-switch-green-700">
        <h2 className="font-semibold text-white">Equipment Comparison</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full" style={{ minWidth: tableMinWidth, tableLayout: 'fixed' }}>
          <thead>
            <tr className="bg-gray-900">
              <th style={labelCellStyle} className="px-5 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider border-r border-gray-700">
                Specification
              </th>
              {equipmentData.map((e, idx) => (
                <th key={e.bidId} style={bidCellStyle} className={`px-5 py-4 text-left text-sm font-semibold text-white ${idx < equipmentData.length - 1 ? 'border-r border-gray-700' : ''}`}>
                  {e.contractor}
                  {e.mergedBidCount && e.mergedBidCount > 1 && (
                    <span className="block text-xs font-normal text-gray-400 mt-0.5">
                      {e.mergedBidCount} bids merged
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-200">
              <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-700 bg-gray-50 border-r border-gray-200">Manufacturer & Model</td>
              {equipmentData.map((e, idx) => (
                <td key={e.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm font-semibold text-gray-900 ${idx < equipmentData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                  {e.brand} {e.model}
                </td>
              ))}
            </tr>
            <tr className="border-b border-gray-200 bg-gray-50/50">
              <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-700 bg-gray-50 border-r border-gray-200">SEER2 Rating</td>
              {equipmentData.map((e, idx) => (
                <td key={e.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm font-semibold ${isHighlighted(e.seer2, bestSeer) ? 'text-switch-green-700 bg-gradient-to-r from-switch-green-50 to-switch-green-100' : 'text-gray-900'} ${idx < equipmentData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                  <span className="flex items-center gap-2">
                    {e.seer2 || '-'}
                    {isHighlighted(e.seer2, bestSeer) && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-switch-green-600 text-white text-xs font-medium rounded-full">
                        <Star className="w-3 h-3" /> BEST
                      </span>
                    )}
                  </span>
                </td>
              ))}
            </tr>
            <tr className="border-b border-gray-200">
              <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-700 bg-gray-50 border-r border-gray-200">HSPF2 Rating</td>
              {equipmentData.map((e, idx) => (
                <td key={e.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm font-semibold ${isHighlighted(e.hspf2, bestHspf) ? 'text-switch-green-700 bg-gradient-to-r from-switch-green-50 to-switch-green-100' : 'text-gray-900'} ${idx < equipmentData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                  <span className="flex items-center gap-2">
                    {e.hspf2 || '-'}
                    {isHighlighted(e.hspf2, bestHspf) && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-switch-green-600 text-white text-xs font-medium rounded-full">
                        <Star className="w-3 h-3" /> BEST
                      </span>
                    )}
                  </span>
                </td>
              ))}
            </tr>
            <tr className="border-b border-gray-200 bg-gray-50/50">
              <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-700 bg-gray-50 border-r border-gray-200">Capacity (tons)</td>
              {equipmentData.map((e, idx) => (
                <td key={e.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm font-semibold text-gray-900 ${idx < equipmentData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                  {e.capacityTons || '-'}
                </td>
              ))}
            </tr>
            <tr className="border-b border-gray-200">
              <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-700 bg-gray-50 border-r border-gray-200">Variable Speed</td>
              {equipmentData.map((e, idx) => (
                <td key={e.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm ${idx < equipmentData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                  {e.variableSpeed ? (
                    <span className="inline-flex items-center gap-1 text-switch-green-700 font-medium">
                      <CheckCircle className="w-5 h-5" /> Yes
                    </span>
                  ) : e.variableSpeed === false ? (
                    <span className="inline-flex items-center gap-1 text-gray-400">
                      <XCircle className="w-5 h-5" /> No
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
              ))}
            </tr>
            <tr className="border-b border-gray-200 bg-gray-50/50">
              <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-700 bg-gray-50 border-r border-gray-200">Sound Level (dB)</td>
              {equipmentData.map((e, idx) => (
                <td key={e.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm font-semibold text-gray-900 ${idx < equipmentData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                  {e.soundLevel || '-'}
                </td>
              ))}
            </tr>
            <tr className={showMore ? 'border-b border-gray-200' : ''}>
              <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-700 bg-gray-50 border-r border-gray-200">ENERGY STAR</td>
              {equipmentData.map((e, idx) => (
                <td key={e.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm ${idx < equipmentData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                  {e.energyStar ? (
                    <span className="inline-flex items-center gap-1 text-switch-green-700 font-medium">
                      <CheckCircle className="w-5 h-5" /> Certified
                    </span>
                  ) : e.energyStar === false ? (
                    <span className="inline-flex items-center gap-1 text-gray-400">
                      <XCircle className="w-5 h-5" /> No
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
              ))}
            </tr>

            {showMore && (
              <>
                <tr className="border-b border-gray-200 bg-gray-50/50">
                  <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-500 bg-gray-50 border-r border-gray-200">Capacity (BTU)</td>
                  {equipmentData.map((e, idx) => (
                    <td key={e.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm text-gray-600 ${idx < equipmentData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                      {e.capacityBtu ? e.capacityBtu.toLocaleString() : '-'}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-gray-200">
                  <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-500 bg-gray-50 border-r border-gray-200">Refrigerant Type</td>
                  {equipmentData.map((e, idx) => (
                    <td key={e.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm text-gray-600 ${idx < equipmentData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                      {e.refrigerantType || '-'}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-gray-200 bg-gray-50/50">
                  <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-500 bg-gray-50 border-r border-gray-200">Voltage</td>
                  {equipmentData.map((e, idx) => (
                    <td key={e.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm text-gray-600 ${idx < equipmentData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                      {e.voltage ? `${e.voltage}V` : '-'}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-gray-200">
                  <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-500 bg-gray-50 border-r border-gray-200">Stages</td>
                  {equipmentData.map((e, idx) => (
                    <td key={e.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm text-gray-600 ${idx < equipmentData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                      {e.stages || '-'}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-gray-200 bg-gray-50/50">
                  <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-500 bg-gray-50 border-r border-gray-200">COP Rating</td>
                  {equipmentData.map((e, idx) => (
                    <td key={e.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm text-gray-600 ${idx < equipmentData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                      {e.cop || '-'}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-gray-200">
                  <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-500 bg-gray-50 border-r border-gray-200">EER Rating</td>
                  {equipmentData.map((e, idx) => (
                    <td key={e.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm text-gray-600 ${idx < equipmentData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                      {e.eer || '-'}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-gray-200 bg-gray-50/50">
                  <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-500 bg-gray-50 border-r border-gray-200">Compressor Warranty</td>
                  {equipmentData.map((e, idx) => (
                    <td key={e.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm text-gray-600 ${idx < equipmentData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                      {e.compressorWarranty ? `${e.compressorWarranty} years` : '-'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-500 bg-gray-50 border-r border-gray-200">Most Efficient</td>
                  {equipmentData.map((e, idx) => (
                    <td key={e.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm ${idx < equipmentData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                      {e.energyStarMostEfficient ? (
                        <span className="inline-flex items-center gap-1 text-switch-green-700 font-medium">
                          <CheckCircle className="w-5 h-5" /> Yes
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
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
          onClick={() => setShowMore(!showMore)}
          className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
        >
          {showMore ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Show Less
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              Show More Details
            </>
          )}
        </button>
      </div>
    </div>
  );
}
