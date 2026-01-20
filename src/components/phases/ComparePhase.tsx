import { useState } from 'react';
import { ArrowRight, Award, Zap, ShieldCheck, Star, CheckCircle, XCircle } from 'lucide-react';
import { usePhase } from '../../context/PhaseContext';

type CompareTab = 'equipment' | 'contractors' | 'costs';

export function ComparePhase() {
  const { bids, requirements, completePhase } = usePhase();
  const [activeTab, setActiveTab] = useState<CompareTab>('equipment');

  const formatCurrency = (amount: number | null | undefined) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getHighestValue = (
    values: (number | null | undefined)[],
    higherIsBetter = true
  ): number | null => {
    const validValues = values.filter((v): v is number => v != null);
    if (validValues.length === 0) return null;
    return higherIsBetter ? Math.max(...validValues) : Math.min(...validValues);
  };

  const isHighlighted = (
    value: number | null | undefined,
    bestValue: number | null
  ): boolean => {
    if (value == null || bestValue == null) return false;
    return value === bestValue;
  };

  const tabs: { key: CompareTab; label: string; icon: React.ReactNode }[] = [
    { key: 'equipment', label: 'Equipment', icon: <Zap className="w-4 h-4" /> },
    { key: 'contractors', label: 'Contractors', icon: <Award className="w-4 h-4" /> },
    { key: 'costs', label: 'Costs', icon: <ShieldCheck className="w-4 h-4" /> },
  ];

  const getEquipmentData = () => {
    return bids.map((b) => {
      const mainEquipment = b.equipment.find(
        (e) => e.equipment_type === 'outdoor_unit' || e.equipment_type === 'heat_pump'
      ) || b.equipment[0];

      return {
        bidId: b.bid.id,
        contractor: b.bid.contractor_name || b.bid.contractor_company || 'Unknown',
        brand: mainEquipment?.brand || '-',
        model: mainEquipment?.model_number || mainEquipment?.model_name || '-',
        seer2: mainEquipment?.seer2_rating || mainEquipment?.seer_rating,
        hspf2: mainEquipment?.hspf2_rating || mainEquipment?.hspf_rating,
        capacityTons: mainEquipment?.capacity_tons,
        variableSpeed: mainEquipment?.variable_speed,
        soundLevel: mainEquipment?.sound_level_db,
        energyStar: mainEquipment?.energy_star_certified,
      };
    });
  };

  const getContractorData = () => {
    return bids.map((b) => ({
      bidId: b.bid.id,
      contractor: b.bid.contractor_name || b.bid.contractor_company || 'Unknown',
      yearsInBusiness: b.bid.contractor_years_in_business,
      googleRating: b.bid.contractor_google_rating,
      reviewCount: b.bid.contractor_google_review_count,
      certifications: b.bid.contractor_certifications || [],
      license: b.bid.contractor_license,
      isSwitchPreferred: b.bid.contractor_is_switch_preferred,
    }));
  };

  const getCostData = () => {
    return bids.map((b) => ({
      bidId: b.bid.id,
      contractor: b.bid.contractor_name || b.bid.contractor_company || 'Unknown',
      totalAmount: b.bid.total_bid_amount,
      equipmentCost: b.bid.equipment_cost,
      laborCost: b.bid.labor_cost,
      laborWarranty: b.bid.labor_warranty_years,
      equipmentWarranty: b.bid.equipment_warranty_years,
      financingAvailable: b.bid.financing_offered,
      inclusions: b.bid.inclusions || [],
      exclusions: b.bid.exclusions || [],
    }));
  };

  const equipmentData = getEquipmentData();
  const contractorData = getContractorData();
  const costData = getCostData();

  const bestSeer = getHighestValue(equipmentData.map((e) => e.seer2));
  const bestHspf = getHighestValue(equipmentData.map((e) => e.hspf2));
  const bestYears = getHighestValue(contractorData.map((c) => c.yearsInBusiness));
  const bestRating = getHighestValue(contractorData.map((c) => c.googleRating));
  const lowestPrice = getHighestValue(costData.map((c) => c.totalAmount), false);
  const bestLaborWarranty = getHighestValue(costData.map((c) => c.laborWarranty));
  const bestEquipmentWarranty = getHighestValue(costData.map((c) => c.equipmentWarranty));

  const getRecommendation = () => {
    if (!requirements || bids.length === 0) return null;

    let bestBidId: string | null = null;
    let bestScore = -1;

    bids.forEach((b) => {
      const eq = equipmentData.find((e) => e.bidId === b.bid.id);
      const cost = costData.find((c) => c.bidId === b.bid.id);
      const contr = contractorData.find((c) => c.bidId === b.bid.id);

      let score = 0;

      if (cost?.totalAmount && lowestPrice) {
        const priceScore = (lowestPrice / cost.totalAmount) * requirements.priority_price;
        score += priceScore;
      }

      if (eq?.seer2 && bestSeer) {
        const effScore = (eq.seer2 / bestSeer) * requirements.priority_efficiency;
        score += effScore;
      }

      if (cost?.laborWarranty && bestLaborWarranty) {
        const warrantyScore = (cost.laborWarranty / bestLaborWarranty) * requirements.priority_warranty;
        score += warrantyScore;
      }

      if (contr?.googleRating && bestRating) {
        const repScore = (contr.googleRating / bestRating) * requirements.priority_reputation;
        score += repScore;
      }

      if (score > bestScore) {
        bestScore = score;
        bestBidId = b.bid.id;
      }
    });

    const bestBid = bids.find((b) => b.bid.id === bestBidId);
    if (!bestBid) return null;

    return {
      contractor: bestBid.bid.contractor_name || bestBid.bid.contractor_company || 'Unknown',
      reason: generateReasonText(bestBid.bid.id),
    };
  };

  const generateReasonText = (bidId: string) => {
    const reasons: string[] = [];
    const cost = costData.find((c) => c.bidId === bidId);
    const eq = equipmentData.find((e) => e.bidId === bidId);

    if (cost?.totalAmount === lowestPrice) {
      reasons.push('lowest price');
    }
    if (eq?.seer2 === bestSeer) {
      reasons.push('highest efficiency');
    }
    if (cost?.laborWarranty === bestLaborWarranty && bestLaborWarranty && bestLaborWarranty > 1) {
      reasons.push('best warranty');
    }

    if (reasons.length === 0) {
      reasons.push('best overall balance of your priorities');
    }

    return `Based on your priorities, this bid offers the ${reasons.join(', ')}.`;
  };

  const recommendation = getRecommendation();

  const handleContinue = () => {
    completePhase(2);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Compare Your Bids</h1>
        <p className="text-gray-600 mt-1">
          Review the equipment, contractors, and costs side by side.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`
                flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors
                ${activeTab === tab.key
                  ? 'text-switch-green-700 bg-switch-green-50 border-b-2 border-switch-green-600'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }
              `}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          {activeTab === 'equipment' && (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Specification
                  </th>
                  {equipmentData.map((e) => (
                    <th key={e.bidId} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {e.contractor}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="px-4 py-3 text-sm text-gray-600">Manufacturer & Model</td>
                  {equipmentData.map((e) => (
                    <td key={e.bidId} className="px-4 py-3 text-sm font-medium text-gray-900">
                      {e.brand} {e.model}
                    </td>
                  ))}
                </tr>
                <tr className="bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-600">SEER2 Rating</td>
                  {equipmentData.map((e) => (
                    <td
                      key={e.bidId}
                      className={`px-4 py-3 text-sm font-medium ${isHighlighted(e.seer2, bestSeer) ? 'text-switch-green-700 bg-switch-green-50' : 'text-gray-900'}`}
                    >
                      {e.seer2 || '-'}
                      {isHighlighted(e.seer2, bestSeer) && <Star className="w-3 h-3 inline ml-1 text-switch-green-600" />}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="px-4 py-3 text-sm text-gray-600">HSPF2 Rating</td>
                  {equipmentData.map((e) => (
                    <td
                      key={e.bidId}
                      className={`px-4 py-3 text-sm font-medium ${isHighlighted(e.hspf2, bestHspf) ? 'text-switch-green-700 bg-switch-green-50' : 'text-gray-900'}`}
                    >
                      {e.hspf2 || '-'}
                      {isHighlighted(e.hspf2, bestHspf) && <Star className="w-3 h-3 inline ml-1 text-switch-green-600" />}
                    </td>
                  ))}
                </tr>
                <tr className="bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-600">Capacity (tons)</td>
                  {equipmentData.map((e) => (
                    <td key={e.bidId} className="px-4 py-3 text-sm font-medium text-gray-900">
                      {e.capacityTons || '-'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="px-4 py-3 text-sm text-gray-600">Variable Speed</td>
                  {equipmentData.map((e) => (
                    <td key={e.bidId} className="px-4 py-3 text-sm">
                      {e.variableSpeed ? (
                        <CheckCircle className="w-5 h-5 text-switch-green-600" />
                      ) : e.variableSpeed === false ? (
                        <XCircle className="w-5 h-5 text-gray-300" />
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  ))}
                </tr>
                <tr className="bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-600">Sound Level (dB)</td>
                  {equipmentData.map((e) => (
                    <td key={e.bidId} className="px-4 py-3 text-sm font-medium text-gray-900">
                      {e.soundLevel || '-'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="px-4 py-3 text-sm text-gray-600">ENERGY STAR</td>
                  {equipmentData.map((e) => (
                    <td key={e.bidId} className="px-4 py-3 text-sm">
                      {e.energyStar ? (
                        <CheckCircle className="w-5 h-5 text-switch-green-600" />
                      ) : e.energyStar === false ? (
                        <XCircle className="w-5 h-5 text-gray-300" />
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          )}

          {activeTab === 'contractors' && (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Information
                  </th>
                  {contractorData.map((c) => (
                    <th key={c.bidId} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {c.contractor}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="px-4 py-3 text-sm text-gray-600">Years in Business</td>
                  {contractorData.map((c) => (
                    <td
                      key={c.bidId}
                      className={`px-4 py-3 text-sm font-medium ${isHighlighted(c.yearsInBusiness, bestYears) ? 'text-switch-green-700 bg-switch-green-50' : 'text-gray-900'}`}
                    >
                      {c.yearsInBusiness || '-'}
                      {isHighlighted(c.yearsInBusiness, bestYears) && <Star className="w-3 h-3 inline ml-1 text-switch-green-600" />}
                    </td>
                  ))}
                </tr>
                <tr className="bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-600">Google Rating</td>
                  {contractorData.map((c) => (
                    <td
                      key={c.bidId}
                      className={`px-4 py-3 text-sm font-medium ${isHighlighted(c.googleRating, bestRating) ? 'text-switch-green-700 bg-switch-green-50' : 'text-gray-900'}`}
                    >
                      {c.googleRating ? `${c.googleRating}/5` : '-'}
                      {isHighlighted(c.googleRating, bestRating) && <Star className="w-3 h-3 inline ml-1 text-switch-green-600" />}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="px-4 py-3 text-sm text-gray-600">Review Count</td>
                  {contractorData.map((c) => (
                    <td key={c.bidId} className="px-4 py-3 text-sm font-medium text-gray-900">
                      {c.reviewCount || '-'}
                    </td>
                  ))}
                </tr>
                <tr className="bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-600">Certifications</td>
                  {contractorData.map((c) => (
                    <td key={c.bidId} className="px-4 py-3 text-sm text-gray-900">
                      {c.certifications.length > 0 ? (
                        <ul className="text-xs space-y-1">
                          {c.certifications.slice(0, 3).map((cert, i) => (
                            <li key={i}>{cert}</li>
                          ))}
                          {c.certifications.length > 3 && (
                            <li className="text-gray-500">+{c.certifications.length - 3} more</li>
                          )}
                        </ul>
                      ) : (
                        '-'
                      )}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="px-4 py-3 text-sm text-gray-600">License Number</td>
                  {contractorData.map((c) => (
                    <td key={c.bidId} className="px-4 py-3 text-sm font-medium text-gray-900">
                      {c.license || '-'}
                    </td>
                  ))}
                </tr>
                <tr className="bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-600">Switch Preferred</td>
                  {contractorData.map((c) => (
                    <td key={c.bidId} className="px-4 py-3 text-sm">
                      {c.isSwitchPreferred ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-switch-green-100 text-switch-green-800 rounded-full text-xs font-medium">
                          <CheckCircle className="w-3 h-3" /> Preferred
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          )}

          {activeTab === 'costs' && (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cost Item
                  </th>
                  {costData.map((c) => (
                    <th key={c.bidId} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {c.contractor}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">Total Bid Amount</td>
                  {costData.map((c) => (
                    <td
                      key={c.bidId}
                      className={`px-4 py-3 text-sm font-bold ${isHighlighted(c.totalAmount, lowestPrice) ? 'text-switch-green-700 bg-switch-green-50' : 'text-gray-900'}`}
                    >
                      {formatCurrency(c.totalAmount)}
                      {isHighlighted(c.totalAmount, lowestPrice) && <Star className="w-3 h-3 inline ml-1 text-switch-green-600" />}
                    </td>
                  ))}
                </tr>
                <tr className="bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-600">Equipment Cost</td>
                  {costData.map((c) => (
                    <td key={c.bidId} className="px-4 py-3 text-sm font-medium text-gray-900">
                      {formatCurrency(c.equipmentCost)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="px-4 py-3 text-sm text-gray-600">Labor Cost</td>
                  {costData.map((c) => (
                    <td key={c.bidId} className="px-4 py-3 text-sm font-medium text-gray-900">
                      {formatCurrency(c.laborCost)}
                    </td>
                  ))}
                </tr>
                <tr className="bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-600">Labor Warranty</td>
                  {costData.map((c) => (
                    <td
                      key={c.bidId}
                      className={`px-4 py-3 text-sm font-medium ${isHighlighted(c.laborWarranty, bestLaborWarranty) ? 'text-switch-green-700 bg-switch-green-50' : 'text-gray-900'}`}
                    >
                      {c.laborWarranty ? `${c.laborWarranty} years` : '-'}
                      {isHighlighted(c.laborWarranty, bestLaborWarranty) && <Star className="w-3 h-3 inline ml-1 text-switch-green-600" />}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="px-4 py-3 text-sm text-gray-600">Equipment Warranty</td>
                  {costData.map((c) => (
                    <td
                      key={c.bidId}
                      className={`px-4 py-3 text-sm font-medium ${isHighlighted(c.equipmentWarranty, bestEquipmentWarranty) ? 'text-switch-green-700 bg-switch-green-50' : 'text-gray-900'}`}
                    >
                      {c.equipmentWarranty ? `${c.equipmentWarranty} years` : '-'}
                      {isHighlighted(c.equipmentWarranty, bestEquipmentWarranty) && <Star className="w-3 h-3 inline ml-1 text-switch-green-600" />}
                    </td>
                  ))}
                </tr>
                <tr className="bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-600">Financing Available</td>
                  {costData.map((c) => (
                    <td key={c.bidId} className="px-4 py-3 text-sm">
                      {c.financingAvailable ? (
                        <CheckCircle className="w-5 h-5 text-switch-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-gray-300" />
                      )}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="px-4 py-3 text-sm text-gray-600">What is Included</td>
                  {costData.map((c) => (
                    <td key={c.bidId} className="px-4 py-3 text-sm text-gray-900">
                      {c.inclusions.length > 0 ? (
                        <ul className="text-xs space-y-1">
                          {c.inclusions.slice(0, 4).map((item, i) => (
                            <li key={i} className="flex items-start gap-1">
                              <CheckCircle className="w-3 h-3 text-switch-green-600 flex-shrink-0 mt-0.5" />
                              {item}
                            </li>
                          ))}
                          {c.inclusions.length > 4 && (
                            <li className="text-gray-500">+{c.inclusions.length - 4} more</li>
                          )}
                        </ul>
                      ) : (
                        '-'
                      )}
                    </td>
                  ))}
                </tr>
                <tr className="bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-600">What is NOT Included</td>
                  {costData.map((c) => (
                    <td key={c.bidId} className="px-4 py-3 text-sm text-gray-900">
                      {c.exclusions.length > 0 ? (
                        <ul className="text-xs space-y-1">
                          {c.exclusions.slice(0, 4).map((item, i) => (
                            <li key={i} className="flex items-start gap-1">
                              <XCircle className="w-3 h-3 text-red-400 flex-shrink-0 mt-0.5" />
                              {item}
                            </li>
                          ))}
                          {c.exclusions.length > 4 && (
                            <li className="text-gray-500">+{c.exclusions.length - 4} more</li>
                          )}
                        </ul>
                      ) : (
                        '-'
                      )}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </div>

      {recommendation && (
        <div className="bg-switch-green-50 border border-switch-green-200 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-switch-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Star className="w-5 h-5 text-switch-green-700" />
            </div>
            <div>
              <h3 className="font-semibold text-switch-green-900">
                Recommended: {recommendation.contractor}
              </h3>
              <p className="text-sm text-switch-green-700 mt-1">
                {recommendation.reason}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={handleContinue}
          className="btn btn-primary flex items-center gap-2 px-6"
        >
          Continue to Decide
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
