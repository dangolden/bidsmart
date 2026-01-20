import { useState } from 'react';
import { ArrowRight, Award, Zap, DollarSign, Star, CheckCircle, XCircle } from 'lucide-react';
import { usePhase } from '../../context/PhaseContext';

type CompareTab = 'equipment' | 'contractors' | 'costs';

interface TabConfig {
  key: CompareTab;
  label: string;
  description: string;
  icon: React.ReactNode;
}

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

  const tabs: TabConfig[] = [
    {
      key: 'equipment',
      label: 'Equipment',
      description: 'Specs, efficiency ratings, and features',
      icon: <Zap className="w-5 h-5" />
    },
    {
      key: 'contractors',
      label: 'Contractors',
      description: 'Experience, ratings, and certifications',
      icon: <Award className="w-5 h-5" />
    },
    {
      key: 'costs',
      label: 'Costs',
      description: 'Pricing, warranties, and inclusions',
      icon: <DollarSign className="w-5 h-5" />
    },
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

      <div className="grid grid-cols-3 gap-4 mb-6">
        {tabs.map((tab, index) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`
              relative p-4 rounded-xl text-left transition-all duration-200 border-2
              ${activeTab === tab.key
                ? 'bg-gradient-to-br from-switch-green-50 to-switch-green-100 border-switch-green-500 shadow-md'
                : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
              }
            `}
          >
            <div className="flex items-start gap-3">
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
                ${activeTab === tab.key
                  ? 'bg-switch-green-600 text-white'
                  : 'bg-gray-100 text-gray-500'
                }
              `}>
                {tab.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`
                    text-xs font-medium px-2 py-0.5 rounded-full
                    ${activeTab === tab.key
                      ? 'bg-switch-green-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                    }
                  `}>
                    {index + 1} of 3
                  </span>
                </div>
                <h3 className={`
                  font-semibold mt-1
                  ${activeTab === tab.key ? 'text-switch-green-800' : 'text-gray-900'}
                `}>
                  {tab.label}
                </h3>
                <p className={`
                  text-sm mt-0.5
                  ${activeTab === tab.key ? 'text-switch-green-700' : 'text-gray-500'}
                `}>
                  {tab.description}
                </p>
              </div>
            </div>
            {activeTab === tab.key && (
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2">
                <div className="w-3 h-3 bg-switch-green-500 rotate-45"></div>
              </div>
            )}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border-2 border-gray-200 shadow-lg overflow-hidden">
        <div className={`
          px-5 py-3 border-b-2 border-gray-200 flex items-center gap-3
          bg-gradient-to-r from-switch-green-600 to-switch-green-700
        `}>
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white">
            {tabs.find(t => t.key === activeTab)?.icon}
          </div>
          <h2 className="font-semibold text-white">
            {tabs.find(t => t.key === activeTab)?.label} Comparison
          </h2>
        </div>

        <div className="overflow-x-auto">
          {activeTab === 'equipment' && (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-900">
                  <th className="px-5 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider border-r border-gray-700">
                    Specification
                  </th>
                  {equipmentData.map((e, idx) => (
                    <th key={e.bidId} className={`px-5 py-4 text-left text-sm font-semibold text-white ${idx < equipmentData.length - 1 ? 'border-r border-gray-700' : ''}`}>
                      {e.contractor}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-200">
                  <td className="px-5 py-4 text-sm font-medium text-gray-700 bg-gray-50 border-r border-gray-200">Manufacturer & Model</td>
                  {equipmentData.map((e, idx) => (
                    <td key={e.bidId} className={`px-5 py-4 text-sm font-semibold text-gray-900 ${idx < equipmentData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                      {e.brand} {e.model}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-gray-200 bg-gray-50/50">
                  <td className="px-5 py-4 text-sm font-medium text-gray-700 bg-gray-50 border-r border-gray-200">SEER2 Rating</td>
                  {equipmentData.map((e, idx) => (
                    <td
                      key={e.bidId}
                      className={`px-5 py-4 text-sm font-semibold ${isHighlighted(e.seer2, bestSeer) ? 'text-switch-green-700 bg-gradient-to-r from-switch-green-50 to-switch-green-100' : 'text-gray-900'} ${idx < equipmentData.length - 1 ? 'border-r border-gray-100' : ''}`}
                    >
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
                  <td className="px-5 py-4 text-sm font-medium text-gray-700 bg-gray-50 border-r border-gray-200">HSPF2 Rating</td>
                  {equipmentData.map((e, idx) => (
                    <td
                      key={e.bidId}
                      className={`px-5 py-4 text-sm font-semibold ${isHighlighted(e.hspf2, bestHspf) ? 'text-switch-green-700 bg-gradient-to-r from-switch-green-50 to-switch-green-100' : 'text-gray-900'} ${idx < equipmentData.length - 1 ? 'border-r border-gray-100' : ''}`}
                    >
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
                  <td className="px-5 py-4 text-sm font-medium text-gray-700 bg-gray-50 border-r border-gray-200">Capacity (tons)</td>
                  {equipmentData.map((e, idx) => (
                    <td key={e.bidId} className={`px-5 py-4 text-sm font-semibold text-gray-900 ${idx < equipmentData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                      {e.capacityTons || '-'}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="px-5 py-4 text-sm font-medium text-gray-700 bg-gray-50 border-r border-gray-200">Variable Speed</td>
                  {equipmentData.map((e, idx) => (
                    <td key={e.bidId} className={`px-5 py-4 text-sm ${idx < equipmentData.length - 1 ? 'border-r border-gray-100' : ''}`}>
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
                  <td className="px-5 py-4 text-sm font-medium text-gray-700 bg-gray-50 border-r border-gray-200">Sound Level (dB)</td>
                  {equipmentData.map((e, idx) => (
                    <td key={e.bidId} className={`px-5 py-4 text-sm font-semibold text-gray-900 ${idx < equipmentData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                      {e.soundLevel || '-'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="px-5 py-4 text-sm font-medium text-gray-700 bg-gray-50 border-r border-gray-200">ENERGY STAR</td>
                  {equipmentData.map((e, idx) => (
                    <td key={e.bidId} className={`px-5 py-4 text-sm ${idx < equipmentData.length - 1 ? 'border-r border-gray-100' : ''}`}>
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
              </tbody>
            </table>
          )}

          {activeTab === 'contractors' && (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-900">
                  <th className="px-5 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider border-r border-gray-700">
                    Information
                  </th>
                  {contractorData.map((c, idx) => (
                    <th key={c.bidId} className={`px-5 py-4 text-left text-sm font-semibold text-white ${idx < contractorData.length - 1 ? 'border-r border-gray-700' : ''}`}>
                      {c.contractor}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-200">
                  <td className="px-5 py-4 text-sm font-medium text-gray-700 bg-gray-50 border-r border-gray-200">Years in Business</td>
                  {contractorData.map((c, idx) => (
                    <td
                      key={c.bidId}
                      className={`px-5 py-4 text-sm font-semibold ${isHighlighted(c.yearsInBusiness, bestYears) ? 'text-switch-green-700 bg-gradient-to-r from-switch-green-50 to-switch-green-100' : 'text-gray-900'} ${idx < contractorData.length - 1 ? 'border-r border-gray-100' : ''}`}
                    >
                      <span className="flex items-center gap-2">
                        {c.yearsInBusiness ? `${c.yearsInBusiness} years` : '-'}
                        {isHighlighted(c.yearsInBusiness, bestYears) && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-switch-green-600 text-white text-xs font-medium rounded-full">
                            <Star className="w-3 h-3" /> MOST
                          </span>
                        )}
                      </span>
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-gray-200 bg-gray-50/50">
                  <td className="px-5 py-4 text-sm font-medium text-gray-700 bg-gray-50 border-r border-gray-200">Google Rating</td>
                  {contractorData.map((c, idx) => (
                    <td
                      key={c.bidId}
                      className={`px-5 py-4 text-sm font-semibold ${isHighlighted(c.googleRating, bestRating) ? 'text-switch-green-700 bg-gradient-to-r from-switch-green-50 to-switch-green-100' : 'text-gray-900'} ${idx < contractorData.length - 1 ? 'border-r border-gray-100' : ''}`}
                    >
                      <span className="flex items-center gap-2">
                        {c.googleRating ? (
                          <span className="flex items-center gap-1">
                            {c.googleRating}
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          </span>
                        ) : '-'}
                        {isHighlighted(c.googleRating, bestRating) && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-switch-green-600 text-white text-xs font-medium rounded-full">
                            TOP
                          </span>
                        )}
                      </span>
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="px-5 py-4 text-sm font-medium text-gray-700 bg-gray-50 border-r border-gray-200">Review Count</td>
                  {contractorData.map((c, idx) => (
                    <td key={c.bidId} className={`px-5 py-4 text-sm font-semibold text-gray-900 ${idx < contractorData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                      {c.reviewCount ? `${c.reviewCount} reviews` : '-'}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-gray-200 bg-gray-50/50">
                  <td className="px-5 py-4 text-sm font-medium text-gray-700 bg-gray-50 border-r border-gray-200">Certifications</td>
                  {contractorData.map((c, idx) => (
                    <td key={c.bidId} className={`px-5 py-4 text-sm text-gray-900 ${idx < contractorData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                      {c.certifications.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {c.certifications.slice(0, 3).map((cert, i) => (
                            <span key={i} className="inline-flex px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-medium rounded">
                              {cert}
                            </span>
                          ))}
                          {c.certifications.length > 3 && (
                            <span className="inline-flex px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded">
                              +{c.certifications.length - 3}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="px-5 py-4 text-sm font-medium text-gray-700 bg-gray-50 border-r border-gray-200">License Number</td>
                  {contractorData.map((c, idx) => (
                    <td key={c.bidId} className={`px-5 py-4 text-sm font-semibold text-gray-900 ${idx < contractorData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                      {c.license || <span className="text-gray-400">Not provided</span>}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="px-5 py-4 text-sm font-medium text-gray-700 bg-gray-50 border-r border-gray-200">Switch Preferred</td>
                  {contractorData.map((c, idx) => (
                    <td key={c.bidId} className={`px-5 py-4 text-sm ${idx < contractorData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                      {c.isSwitchPreferred ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-switch-green-500 to-switch-green-600 text-white rounded-full text-xs font-semibold shadow-sm">
                          <CheckCircle className="w-3.5 h-3.5" /> Preferred Partner
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
                <tr className="bg-gray-900">
                  <th className="px-5 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider border-r border-gray-700">
                    Cost Item
                  </th>
                  {costData.map((c, idx) => (
                    <th key={c.bidId} className={`px-5 py-4 text-left text-sm font-semibold text-white ${idx < costData.length - 1 ? 'border-r border-gray-700' : ''}`}>
                      {c.contractor}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b-2 border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                  <td className="px-5 py-5 text-sm font-bold text-gray-900 bg-gray-100 border-r border-gray-200">Total Bid Amount</td>
                  {costData.map((c, idx) => (
                    <td
                      key={c.bidId}
                      className={`px-5 py-5 ${isHighlighted(c.totalAmount, lowestPrice) ? 'bg-gradient-to-r from-switch-green-50 to-switch-green-100' : ''} ${idx < costData.length - 1 ? 'border-r border-gray-100' : ''}`}
                    >
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
                  <td className="px-5 py-4 text-sm font-medium text-gray-700 bg-gray-50 border-r border-gray-200">Equipment Cost</td>
                  {costData.map((c, idx) => (
                    <td key={c.bidId} className={`px-5 py-4 text-sm font-semibold text-gray-900 ${idx < costData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                      {formatCurrency(c.equipmentCost)}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="px-5 py-4 text-sm font-medium text-gray-700 bg-gray-50 border-r border-gray-200">Labor Cost</td>
                  {costData.map((c, idx) => (
                    <td key={c.bidId} className={`px-5 py-4 text-sm font-semibold text-gray-900 ${idx < costData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                      {formatCurrency(c.laborCost)}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-gray-200 bg-gray-50/50">
                  <td className="px-5 py-4 text-sm font-medium text-gray-700 bg-gray-50 border-r border-gray-200">Labor Warranty</td>
                  {costData.map((c, idx) => (
                    <td
                      key={c.bidId}
                      className={`px-5 py-4 text-sm font-semibold ${isHighlighted(c.laborWarranty, bestLaborWarranty) ? 'text-switch-green-700 bg-gradient-to-r from-switch-green-50 to-switch-green-100' : 'text-gray-900'} ${idx < costData.length - 1 ? 'border-r border-gray-100' : ''}`}
                    >
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
                  <td className="px-5 py-4 text-sm font-medium text-gray-700 bg-gray-50 border-r border-gray-200">Equipment Warranty</td>
                  {costData.map((c, idx) => (
                    <td
                      key={c.bidId}
                      className={`px-5 py-4 text-sm font-semibold ${isHighlighted(c.equipmentWarranty, bestEquipmentWarranty) ? 'text-switch-green-700 bg-gradient-to-r from-switch-green-50 to-switch-green-100' : 'text-gray-900'} ${idx < costData.length - 1 ? 'border-r border-gray-100' : ''}`}
                    >
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
                  <td className="px-5 py-4 text-sm font-medium text-gray-700 bg-gray-50 border-r border-gray-200">Financing Available</td>
                  {costData.map((c, idx) => (
                    <td key={c.bidId} className={`px-5 py-4 text-sm ${idx < costData.length - 1 ? 'border-r border-gray-100' : ''}`}>
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
                <tr className="border-b border-gray-200">
                  <td className="px-5 py-4 text-sm font-medium text-gray-700 bg-gray-50 border-r border-gray-200">What is Included</td>
                  {costData.map((c, idx) => (
                    <td key={c.bidId} className={`px-5 py-4 text-sm text-gray-900 ${idx < costData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                      {c.inclusions.length > 0 ? (
                        <ul className="text-xs space-y-1.5">
                          {c.inclusions.slice(0, 4).map((item, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <CheckCircle className="w-3.5 h-3.5 text-switch-green-600 flex-shrink-0 mt-0.5" />
                              <span className="text-gray-700">{item}</span>
                            </li>
                          ))}
                          {c.inclusions.length > 4 && (
                            <li className="text-gray-500 pl-5">+{c.inclusions.length - 4} more items</li>
                          )}
                        </ul>
                      ) : (
                        <span className="text-gray-400">Not specified</span>
                      )}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="px-5 py-4 text-sm font-medium text-gray-700 bg-gray-50 border-r border-gray-200">What is NOT Included</td>
                  {costData.map((c, idx) => (
                    <td key={c.bidId} className={`px-5 py-4 text-sm text-gray-900 ${idx < costData.length - 1 ? 'border-r border-gray-100' : ''}`}>
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
