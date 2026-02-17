import { useState, useEffect } from 'react';
import {
  ArrowUpDown, Check, X, AlertTriangle, Award, Star, HelpCircle,
  Zap, Shield, Clock, DollarSign, ThermometerSun, Target, ClipboardList,
  Plug, Building2, MapPin, ThumbsUp
} from 'lucide-react';
import * as db from '../lib/database/bidsmartService';
import type { ContractorBid, BidEquipment, ProjectRequirements } from '../lib/types';
import { formatCurrency } from '../lib/utils/formatters';

interface BidComparisonTableProps {
  projectId: string;
  bids: ContractorBid[];
  requirements?: ProjectRequirements | null;
}

type CompareView = 'specs' | 'contractor' | 'pricing' | 'scope' | 'electrical';

export function BidComparisonTable({ projectId: _projectId, bids, requirements }: BidComparisonTableProps) {
  const [equipment, setEquipment] = useState<Record<string, BidEquipment[]>>({});
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<CompareView>('specs');
  const [sortBy, setSortBy] = useState<string>('overall_score');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    loadEquipment();
  }, [bids]);

  async function loadEquipment() {
    const equipMap: Record<string, BidEquipment[]> = {};
    for (const bid of bids) {
      equipMap[bid.id] = await db.getEquipmentByBid(bid.id);
    }
    setEquipment(equipMap);
    setLoading(false);
  }

  function getBestValue(values: (number | null | undefined)[], higherIsBetter = true): number | null {
    const valid = values.filter((v): v is number => v != null && v > 0);
    if (valid.length === 0) return null;
    return higherIsBetter ? Math.max(...valid) : Math.min(...valid);
  }

  function isBestValue(value: number | null | undefined, best: number | null, higherIsBetter = true): boolean {
    if (value == null || best == null) return false;
    return higherIsBetter ? value >= best : value <= best;
  }

  // Sort bids
  const sortedBids = [...bids].sort((a, b) => {
    let aVal: number | null = null;
    let bVal: number | null = null;

    switch (sortBy) {
      case 'overall_score':
        aVal = a.overall_score ?? null;
        bVal = b.overall_score ?? null;
        break;
      case 'total_bid_amount':
        aVal = a.total_bid_amount;
        bVal = b.total_bid_amount;
        break;
      case 'warranty':
        aVal = (a.labor_warranty_years || 0) + (a.equipment_warranty_years || 0);
        bVal = (b.labor_warranty_years || 0) + (b.equipment_warranty_years || 0);
        break;
      case 'timeline':
        aVal = a.estimated_days || 999;
        bVal = b.estimated_days || 999;
        break;
    }

    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return 1;
    if (bVal == null) return -1;

    return sortDir === 'desc' ? bVal - aVal : aVal - bVal;
  });

  function handleSort(field: string) {
    if (sortBy === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDir(field === 'total_bid_amount' || field === 'timeline' ? 'asc' : 'desc');
    }
  }

  // Calculate best values for highlighting
  const bestPrice = getBestValue(bids.map(b => b.total_bid_amount), false);
  const bestWarranty = getBestValue(bids.map(b => (b.labor_warranty_years || 0) + (b.equipment_warranty_years || 0)));
  const bestTimeline = getBestValue(bids.map(b => b.estimated_days), false);
  const bestScore = getBestValue(bids.map(b => b.overall_score));

  // Get SEER ratings from equipment
  function getSeerRating(bidId: string): number | null {
    const equip = equipment[bidId]?.find(e => e.equipment_type === 'outdoor_unit' || e.seer_rating || e.seer2_rating);
    return equip?.seer2_rating || equip?.seer_rating || null;
  }

  function getHspfRating(bidId: string): number | null {
    const equip = equipment[bidId]?.find(e => e.equipment_type === 'outdoor_unit' || e.hspf_rating || e.hspf2_rating);
    return equip?.hspf2_rating || equip?.hspf_rating || null;
  }

  function getCapacity(bidId: string): number | null {
    const equip = equipment[bidId]?.find(e => e.capacity_tons || e.capacity_btu);
    return equip?.capacity_tons || (equip?.capacity_btu ? equip.capacity_btu / 12000 : null);
  }

  function isVariableSpeed(bidId: string): boolean {
    return equipment[bidId]?.some(e => e.variable_speed) || false;
  }

  function isEnergyStar(bidId: string): boolean {
    return equipment[bidId]?.some(e => e.energy_star_certified) || false;
  }

  function getRefrigerantType(bidId: string): string | null {
    const equip = equipment[bidId]?.find(e => e.refrigerant_type);
    return equip?.refrigerant_type || null;
  }

  function getSoundLevel(bidId: string): number | null {
    const equip = equipment[bidId]?.find(e => e.sound_level_db);
    return equip?.sound_level_db || null;
  }

  function getEerRating(bidId: string): number | null {
    const equip = equipment[bidId]?.find(e => e.eer_rating);
    return equip?.eer_rating || null;
  }

  function getCop(bidId: string): number | null {
    const equip = equipment[bidId]?.find(e => e.cop);
    return equip?.cop || null;
  }

  function getAmperageDraw(bidId: string): number | null {
    const equip = equipment[bidId]?.find(e => e.amperage_draw);
    return equip?.amperage_draw || null;
  }

  function getMinCircuitAmperage(bidId: string): number | null {
    const equip = equipment[bidId]?.find(e => e.minimum_circuit_amperage);
    return equip?.minimum_circuit_amperage || null;
  }

  const bestSeer = getBestValue(bids.map(b => getSeerRating(b.id)));
  const bestHspf = getBestValue(bids.map(b => getHspfRating(b.id)));

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Loading comparison...</div>;
  }

  if (bids.length < 2) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Need More Bids</h3>
        <p className="text-gray-600">Upload at least 1 bid to see a comparison.</p>
      </div>
    );
  }

  function getTopPriorities(): { label: string; icon: typeof DollarSign }[] {
    if (!requirements) return [];
    const priorities: { key: string; value: number; label: string; icon: typeof DollarSign }[] = [
      { key: 'price', value: requirements.priority_price, label: 'Price', icon: DollarSign },
      { key: 'warranty', value: requirements.priority_warranty, label: 'Warranty', icon: Shield },
      { key: 'efficiency', value: requirements.priority_efficiency, label: 'Efficiency', icon: Zap },
      { key: 'timeline', value: requirements.priority_timeline, label: 'Timeline', icon: Clock },
      { key: 'reputation', value: requirements.priority_reputation, label: 'Reputation', icon: Star },
    ];
    return priorities
      .filter(p => p.value >= 4)
      .sort((a, b) => b.value - a.value)
      .map(p => ({ label: p.label, icon: p.icon }));
  }

  const topPriorities = getTopPriorities();

  return (
    <div className="space-y-6">
      {requirements?.completed_at && topPriorities.length > 0 && (
        <div className="bg-switch-green-50 border border-switch-green-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Target className="w-5 h-5 text-switch-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-switch-green-900 mb-1">Based on Your Priorities</h3>
              <div className="flex flex-wrap gap-2">
                {topPriorities.map(({ label, icon: Icon }) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-switch-green-200 rounded-full text-sm text-switch-green-700"
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </span>
                ))}
              </div>
              {requirements.must_have_features && requirements.must_have_features.length > 0 && (
                <p className="text-sm text-switch-green-700 mt-2">
                  Must-haves: {requirements.must_have_features.slice(0, 3).join(', ')}
                  {requirements.must_have_features.length > 3 && ` +${requirements.must_have_features.length - 3} more`}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* View Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <span className="text-sm text-gray-500 hidden sm:inline">Compare:</span>
        <div className="flex bg-gray-100 rounded-lg p-1 overflow-x-auto">
          {[
            { id: 'specs', label: 'Equipment', fullLabel: 'Equipment Specs', icon: ThermometerSun },
            { id: 'scope', label: 'Scope', fullLabel: 'Scope Included', icon: ClipboardList },
            { id: 'contractor', label: 'Contractor', fullLabel: 'Contractor Info', icon: Shield },
            { id: 'pricing', label: 'Pricing', fullLabel: 'Pricing Breakdown', icon: DollarSign },
            { id: 'electrical', label: 'Electrical', fullLabel: 'Electrical Details', icon: Plug },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setView(tab.id as CompareView)}
              className={`px-3 sm:px-4 py-2 sm:py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap min-h-[44px] sm:min-h-0 ${
                view === tab.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="sm:hidden">{tab.label}</span>
              <span className="hidden sm:inline">{tab.fullLabel}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Comparison Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto -webkit-overflow-scrolling-touch overscroll-x-contain">
          <table className="comparison-table">
            <thead>
              <tr>
                <th className="sticky left-0 bg-gray-50 z-10">Contractor</th>
                {sortedBids.map((bid) => (
                  <th key={bid.id} className="min-w-[200px]">
                    <div className="flex items-center gap-2">
                      {bid.contractor_name}
                      {bid.is_favorite && <Star className="w-4 h-4 text-yellow-500 fill-current" />}
                      {bid.contractor_is_switch_preferred && <Award className="w-4 h-4 text-switch-green-600" />}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Overall Score Row */}
              <tr className="bg-gray-50">
                <td className="sticky left-0 bg-gray-50 font-medium">
                  <button onClick={() => handleSort('overall_score')} className="flex items-center gap-1 hover:text-switch-green-600">
                    Overall Score
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </td>
                {sortedBids.map((bid) => (
                  <td key={bid.id}>
                    {bid.overall_score ? (
                      <span className={`score-badge ${
                        isBestValue(bid.overall_score, bestScore) ? 'score-high font-bold' :
                        bid.overall_score >= 60 ? 'score-medium' : 'score-low'
                      }`}>
                        {bid.overall_score.toFixed(0)}/100
                        {isBestValue(bid.overall_score, bestScore) && ' ★'}
                      </span>
                    ) : '—'}
                  </td>
                ))}
              </tr>

              {/* Price Row */}
              <tr>
                <td className="sticky left-0 bg-white font-medium">
                  <button onClick={() => handleSort('total_bid_amount')} className="flex items-center gap-1 hover:text-switch-green-600">
                    <DollarSign className="w-4 h-4" />
                    Total Price
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </td>
                {sortedBids.map((bid) => (
                  <td key={bid.id} className={isBestValue(bid.total_bid_amount, bestPrice, false) ? 'best-value' : ''}>
                    <span className="font-semibold">{formatCurrency(bid.total_bid_amount)}</span>
                    {isBestValue(bid.total_bid_amount, bestPrice, false) && (
                      <span className="ml-2 text-xs text-green-600 font-medium">LOWEST</span>
                    )}
                  </td>
                ))}
              </tr>

              {view === 'specs' && (
                <>
                  {/* SEER Rating */}
                  <tr>
                    <td className="sticky left-0 bg-white font-medium">
                      <div className="flex items-center gap-1">
                        <Zap className="w-4 h-4 text-amber-500" />
                        SEER / SEER2
                      </div>
                      <span className="text-xs text-gray-400 font-normal">Cooling efficiency</span>
                    </td>
                    {sortedBids.map((bid) => {
                      const seer = getSeerRating(bid.id);
                      return (
                        <td key={bid.id} className={isBestValue(seer, bestSeer) ? 'best-value' : ''}>
                          {seer ? (
                            <>
                              <span className="font-semibold">{seer}</span>
                              {isBestValue(seer, bestSeer) && (
                                <span className="ml-2 text-xs text-green-600 font-medium">BEST</span>
                              )}
                            </>
                          ) : '—'}
                        </td>
                      );
                    })}
                  </tr>

                  {/* HSPF Rating */}
                  <tr>
                    <td className="sticky left-0 bg-white font-medium">
                      <div className="flex items-center gap-1">
                        <ThermometerSun className="w-4 h-4 text-orange-500" />
                        HSPF / HSPF2
                      </div>
                      <span className="text-xs text-gray-400 font-normal">Heating efficiency</span>
                    </td>
                    {sortedBids.map((bid) => {
                      const hspf = getHspfRating(bid.id);
                      return (
                        <td key={bid.id} className={isBestValue(hspf, bestHspf) ? 'best-value' : ''}>
                          {hspf ? (
                            <>
                              <span className="font-semibold">{hspf}</span>
                              {isBestValue(hspf, bestHspf) && (
                                <span className="ml-2 text-xs text-green-600 font-medium">BEST</span>
                              )}
                            </>
                          ) : '—'}
                        </td>
                      );
                    })}
                  </tr>

                  {/* Capacity */}
                  <tr>
                    <td className="sticky left-0 bg-white font-medium">Capacity (tons)</td>
                    {sortedBids.map((bid) => (
                      <td key={bid.id}>
                        {getCapacity(bid.id)?.toFixed(1) || '—'}
                      </td>
                    ))}
                  </tr>

                  {/* Variable Speed */}
                  <tr>
                    <td className="sticky left-0 bg-white font-medium">Variable Speed</td>
                    {sortedBids.map((bid) => (
                      <td key={bid.id}>
                        {isVariableSpeed(bid.id) ? (
                          <Check className="w-5 h-5 text-green-600" />
                        ) : (
                          <X className="w-5 h-5 text-gray-300" />
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Energy Star */}
                  <tr>
                    <td className="sticky left-0 bg-white font-medium">ENERGY STAR</td>
                    {sortedBids.map((bid) => (
                      <td key={bid.id}>
                        {isEnergyStar(bid.id) ? (
                          <span className="inline-flex items-center gap-1 text-green-600">
                            <Check className="w-5 h-5" />
                            Certified
                          </span>
                        ) : (
                          <X className="w-5 h-5 text-gray-300" />
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Advanced Specs Header */}
                  <tr className="bg-gray-50">
                    <td className="sticky left-0 bg-gray-50 font-medium text-gray-500 text-sm pt-4">
                      Advanced Specs
                    </td>
                    {sortedBids.map((bid) => (
                      <td key={bid.id} className="text-gray-400 text-sm pt-4">—</td>
                    ))}
                  </tr>

                  {/* Refrigerant Type */}
                  <tr>
                    <td className="sticky left-0 bg-white font-medium">Refrigerant</td>
                    {sortedBids.map((bid) => (
                      <td key={bid.id}>
                        {getRefrigerantType(bid.id) || '—'}
                      </td>
                    ))}
                  </tr>

                  {/* Noise Level */}
                  <tr>
                    <td className="sticky left-0 bg-white font-medium">Noise Level</td>
                    {sortedBids.map((bid) => {
                      const sound = getSoundLevel(bid.id);
                      return (
                        <td key={bid.id}>
                          {sound ? `${sound} dB` : '—'}
                        </td>
                      );
                    })}
                  </tr>

                  {/* EER Rating */}
                  <tr>
                    <td className="sticky left-0 bg-white font-medium">
                      EER Rating
                      <span className="text-xs text-gray-400 font-normal block">Energy efficiency</span>
                    </td>
                    {sortedBids.map((bid) => {
                      const eer = getEerRating(bid.id);
                      return (
                        <td key={bid.id}>
                          {eer ? eer.toFixed(1) : '—'}
                        </td>
                      );
                    })}
                  </tr>

                  {/* COP */}
                  <tr>
                    <td className="sticky left-0 bg-white font-medium">
                      COP
                      <span className="text-xs text-gray-400 font-normal block">Heating coefficient</span>
                    </td>
                    {sortedBids.map((bid) => {
                      const cop = getCop(bid.id);
                      return (
                        <td key={bid.id}>
                          {cop ? cop.toFixed(1) : '—'}
                        </td>
                      );
                    })}
                  </tr>

                  {/* Amperage Draw */}
                  <tr>
                    <td className="sticky left-0 bg-white font-medium">Amperage Draw</td>
                    {sortedBids.map((bid) => {
                      const amps = getAmperageDraw(bid.id);
                      return (
                        <td key={bid.id}>
                          {amps ? `${amps}A` : '—'}
                        </td>
                      );
                    })}
                  </tr>

                  {/* Min Circuit Amps */}
                  <tr>
                    <td className="sticky left-0 bg-white font-medium">Min Circuit Amps</td>
                    {sortedBids.map((bid) => {
                      const minAmps = getMinCircuitAmperage(bid.id);
                      return (
                        <td key={bid.id}>
                          {minAmps ? `${minAmps}A` : '—'}
                        </td>
                      );
                    })}
                  </tr>
                </>
              )}

              {view === 'contractor' && (
                <>
                  {/* Years in Business */}
                  <tr>
                    <td className="sticky left-0 bg-white font-medium">Years in Business</td>
                    {sortedBids.map((bid) => (
                      <td key={bid.id}>
                        {bid.contractor_years_in_business ? (
                          <span className={bid.contractor_years_in_business >= 10 ? 'text-green-600 font-medium' : ''}>
                            {bid.contractor_years_in_business} years
                          </span>
                        ) : '—'}
                      </td>
                    ))}
                  </tr>

                  {/* Google Rating */}
                  <tr>
                    <td className="sticky left-0 bg-white font-medium">Google Rating</td>
                    {sortedBids.map((bid) => (
                      <td key={bid.id}>
                        {bid.contractor_google_rating ? (
                          <span className={bid.contractor_google_rating >= 4.5 ? 'text-green-600 font-medium' : ''}>
                            {bid.contractor_google_rating.toFixed(1)} ⭐
                            {bid.contractor_google_review_count && (
                              <span className="text-gray-400 text-sm ml-1">
                                ({bid.contractor_google_review_count})
                              </span>
                            )}
                          </span>
                        ) : '—'}
                      </td>
                    ))}
                  </tr>

                  {/* License */}
                  <tr>
                    <td className="sticky left-0 bg-white font-medium">License #</td>
                    {sortedBids.map((bid) => (
                      <td key={bid.id}>
                        {bid.contractor_license ? (
                          <>
                            {bid.contractor_license}
                            {bid.contractor_license_state && ` (${bid.contractor_license_state})`}
                          </>
                        ) : (
                          <span className="text-amber-600 flex items-center gap-1">
                            <AlertTriangle className="w-4 h-4" />
                            Not provided
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Certifications */}
                  <tr>
                    <td className="sticky left-0 bg-white font-medium">Certifications</td>
                    {sortedBids.map((bid) => (
                      <td key={bid.id}>
                        {bid.contractor_certifications && bid.contractor_certifications.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {bid.contractor_certifications.map((cert, i) => (
                              <span key={i} className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                                {cert}
                              </span>
                            ))}
                          </div>
                        ) : '—'}
                      </td>
                    ))}
                  </tr>

                  {/* Insurance */}
                  <tr>
                    <td className="sticky left-0 bg-white font-medium">Insurance Verified</td>
                    {sortedBids.map((bid) => (
                      <td key={bid.id}>
                        {bid.contractor_insurance_verified ? (
                          <Check className="w-5 h-5 text-green-600" />
                        ) : (
                          <span className="text-gray-400">Unknown</span>
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Yelp Rating */}
                  <tr>
                    <td className="sticky left-0 bg-white font-medium">Yelp Rating</td>
                    {sortedBids.map((bid) => (
                      <td key={bid.id}>
                        {bid.contractor_yelp_rating ? (
                          <span className={bid.contractor_yelp_rating >= 4.5 ? 'text-green-600 font-medium' : ''}>
                            {bid.contractor_yelp_rating.toFixed(1)} ⭐
                            {bid.contractor_yelp_review_count && (
                              <span className="text-gray-400 text-sm ml-1">
                                ({bid.contractor_yelp_review_count})
                              </span>
                            )}
                          </span>
                        ) : '—'}
                      </td>
                    ))}
                  </tr>

                  {/* BBB Rating */}
                  <tr>
                    <td className="sticky left-0 bg-white font-medium">BBB Rating</td>
                    {sortedBids.map((bid) => (
                      <td key={bid.id}>
                        {bid.contractor_bbb_rating ? (
                          <span className="flex items-center gap-1">
                            <span className="font-medium">{bid.contractor_bbb_rating}</span>
                            {bid.contractor_bbb_accredited && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Accredited</span>
                            )}
                          </span>
                        ) : '—'}
                      </td>
                    ))}
                  </tr>

                  {/* Bonded */}
                  <tr>
                    <td className="sticky left-0 bg-white font-medium">Bonded</td>
                    {sortedBids.map((bid) => (
                      <td key={bid.id}>
                        {bid.contractor_bonded ? (
                          <Check className="w-5 h-5 text-green-600" />
                        ) : (
                          <span className="text-gray-400">Unknown</span>
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Red Flags */}
                  <tr>
                    <td className="sticky left-0 bg-white font-medium">Issues Identified</td>
                    {sortedBids.map((bid) => (
                      <td key={bid.id}>
                        {bid.red_flags && bid.red_flags.length > 0 ? (
                          <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
                            <AlertTriangle className="w-4 h-4" />
                            {bid.red_flags.length} issue{bid.red_flags.length !== 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span className="text-green-600">None</span>
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Positive Indicators */}
                  <tr>
                    <td className="sticky left-0 bg-white font-medium">
                      <div className="flex items-center gap-1">
                        <ThumbsUp className="w-4 h-4 text-green-500" />
                        Positive Indicators
                      </div>
                    </td>
                    {sortedBids.map((bid) => (
                      <td key={bid.id}>
                        {bid.positive_indicators && bid.positive_indicators.length > 0 ? (
                          <span className="inline-flex items-center gap-1 text-green-600 font-medium">
                            <Check className="w-4 h-4" />
                            {bid.positive_indicators.length} positive{bid.positive_indicators.length !== 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Company Size */}
                  <tr>
                    <td className="sticky left-0 bg-white font-medium">
                      <div className="flex items-center gap-1">
                        <Building2 className="w-4 h-4 text-gray-500" />
                        Company Size
                      </div>
                    </td>
                    {sortedBids.map((bid) => (
                      <td key={bid.id}>
                        {bid.contractor_employee_count || '—'}
                      </td>
                    ))}
                  </tr>

                  {/* Service Area */}
                  <tr>
                    <td className="sticky left-0 bg-white font-medium">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4 text-gray-500" />
                        Service Area
                      </div>
                    </td>
                    {sortedBids.map((bid) => (
                      <td key={bid.id}>
                        {bid.contractor_service_area ? (
                          <span className="text-sm truncate max-w-[150px] block" title={bid.contractor_service_area}>
                            {bid.contractor_service_area.length > 30 ? `${bid.contractor_service_area.substring(0, 30)}...` : bid.contractor_service_area}
                          </span>
                        ) : '—'}
                      </td>
                    ))}
                  </tr>
                </>
              )}

              {view === 'pricing' && (
                <>
                  {/* Equipment Cost */}
                  <tr>
                    <td className="sticky left-0 bg-white font-medium">Equipment</td>
                    {sortedBids.map((bid) => (
                      <td key={bid.id}>{formatCurrency(bid.equipment_cost)}</td>
                    ))}
                  </tr>

                  {/* Labor Cost */}
                  <tr>
                    <td className="sticky left-0 bg-white font-medium">Labor</td>
                    {sortedBids.map((bid) => (
                      <td key={bid.id}>{formatCurrency(bid.labor_cost)}</td>
                    ))}
                  </tr>

                  {/* Materials */}
                  <tr>
                    <td className="sticky left-0 bg-white font-medium">Materials</td>
                    {sortedBids.map((bid) => (
                      <td key={bid.id}>{formatCurrency(bid.materials_cost)}</td>
                    ))}
                  </tr>

                  {/* Permits */}
                  <tr>
                    <td className="sticky left-0 bg-white font-medium">Permits</td>
                    {sortedBids.map((bid) => (
                      <td key={bid.id}>{formatCurrency(bid.permit_cost)}</td>
                    ))}
                  </tr>

                  {/* Disposal */}
                  <tr>
                    <td className="sticky left-0 bg-white font-medium">Disposal</td>
                    {sortedBids.map((bid) => (
                      <td key={bid.id}>{formatCurrency(bid.disposal_cost)}</td>
                    ))}
                  </tr>

                  {/* Electrical Work */}
                  <tr>
                    <td className="sticky left-0 bg-white font-medium">Electrical Work</td>
                    {sortedBids.map((bid) => (
                      <td key={bid.id}>{formatCurrency(bid.electrical_cost)}</td>
                    ))}
                  </tr>

                  {/* Rebates */}
                  <tr>
                    <td className="sticky left-0 bg-white font-medium text-green-600">Est. Rebates</td>
                    {sortedBids.map((bid) => (
                      <td key={bid.id} className="text-green-600">
                        {bid.estimated_rebates ? `-${formatCurrency(bid.estimated_rebates)}` : '—'}
                      </td>
                    ))}
                  </tr>

                  {/* After Rebates */}
                  <tr className="bg-green-50">
                    <td className="sticky left-0 bg-green-50 font-medium">After Rebates</td>
                    {sortedBids.map((bid) => (
                      <td key={bid.id} className="font-semibold">
                        {formatCurrency(bid.total_after_rebates || bid.total_bid_amount)}
                      </td>
                    ))}
                  </tr>
                </>
              )}

              {view === 'scope' && (
                <>
                  {[
                    { key: 'scope_permit_included', label: 'Permits & Filing' },
                    { key: 'scope_disposal_included', label: 'Old Equipment Disposal' },
                    { key: 'scope_electrical_included', label: 'Electrical Work' },
                    { key: 'scope_disconnect_included', label: 'Electrical Disconnect' },
                    { key: 'scope_ductwork_included', label: 'Ductwork Modifications' },
                    { key: 'scope_thermostat_included', label: 'Thermostat' },
                    { key: 'scope_manual_j_included', label: 'Manual J Calculation' },
                    { key: 'scope_commissioning_included', label: 'System Commissioning' },
                    { key: 'scope_air_handler_included', label: 'Air Handler' },
                    { key: 'scope_line_set_included', label: 'Refrigerant Line Set' },
                    { key: 'scope_pad_included', label: 'Equipment Pad' },
                    { key: 'scope_drain_line_included', label: 'Condensate Drain Line' },
                  ].map((item) => (
                    <tr key={item.key}>
                      <td className="sticky left-0 bg-white font-medium">{item.label}</td>
                      {sortedBids.map((bid) => {
                        const value = bid[item.key as keyof ContractorBid];
                        return (
                          <td key={bid.id}>
                            {value === true ? (
                              <Check className="w-5 h-5 text-green-600" />
                            ) : value === false ? (
                              <X className="w-5 h-5 text-red-400" />
                            ) : (
                              <span title="Not specified">
                                <HelpCircle className="w-5 h-5 text-gray-300" />
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </>
              )}

              {view === 'electrical' && (
                <>
                  {/* Panel Assessment */}
                  <tr>
                    <td className="sticky left-0 bg-white font-medium">
                      <div className="flex items-center gap-1">
                        <Plug className="w-4 h-4 text-amber-500" />
                        Panel Assessment
                      </div>
                    </td>
                    {sortedBids.map((bid) => (
                      <td key={bid.id}>
                        {bid.electrical_panel_assessment_included === true ? (
                          <Check className="w-5 h-5 text-green-600" />
                        ) : bid.electrical_panel_assessment_included === false ? (
                          <X className="w-5 h-5 text-red-400" />
                        ) : (
                          <HelpCircle className="w-5 h-5 text-gray-300" />
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Panel Upgrade Needed */}
                  <tr>
                    <td className="sticky left-0 bg-white font-medium">Panel Upgrade Needed</td>
                    {sortedBids.map((bid) => (
                      <td key={bid.id}>
                        {bid.electrical_panel_upgrade_included === true ? (
                          <span className="text-amber-600 font-medium">Yes</span>
                        ) : bid.electrical_panel_upgrade_included === false ? (
                          <span className="text-green-600">No</span>
                        ) : (
                          <HelpCircle className="w-5 h-5 text-gray-300" />
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Panel Upgrade Cost */}
                  <tr>
                    <td className="sticky left-0 bg-white font-medium">Upgrade Cost</td>
                    {sortedBids.map((bid) => (
                      <td key={bid.id}>
                        {bid.electrical_panel_upgrade_cost ? (
                          formatCurrency(bid.electrical_panel_upgrade_cost)
                        ) : '—'}
                      </td>
                    ))}
                  </tr>

                  {/* Current Panel Amps */}
                  <tr>
                    <td className="sticky left-0 bg-white font-medium">Current Panel</td>
                    {sortedBids.map((bid) => (
                      <td key={bid.id}>
                        {bid.electrical_existing_panel_amps ? (
                          <span>{bid.electrical_existing_panel_amps}A</span>
                        ) : '—'}
                      </td>
                    ))}
                  </tr>

                  {/* Required Panel Amps */}
                  <tr>
                    <td className="sticky left-0 bg-white font-medium">Required Panel</td>
                    {sortedBids.map((bid) => (
                      <td key={bid.id}>
                        {bid.electrical_proposed_panel_amps ? (
                          <span>{bid.electrical_proposed_panel_amps}A</span>
                        ) : '—'}
                      </td>
                    ))}
                  </tr>

                  {/* Breaker Size Required */}
                  <tr>
                    <td className="sticky left-0 bg-white font-medium">Breaker Size</td>
                    {sortedBids.map((bid) => (
                      <td key={bid.id}>
                        {bid.electrical_breaker_size_required ? (
                          <span>{bid.electrical_breaker_size_required}A</span>
                        ) : '—'}
                      </td>
                    ))}
                  </tr>

                  {/* Dedicated Circuit */}
                  <tr>
                    <td className="sticky left-0 bg-white font-medium">Dedicated Circuit</td>
                    {sortedBids.map((bid) => (
                      <td key={bid.id}>
                        {bid.electrical_dedicated_circuit_included === true ? (
                          <Check className="w-5 h-5 text-green-600" />
                        ) : bid.electrical_dedicated_circuit_included === false ? (
                          <X className="w-5 h-5 text-red-400" />
                        ) : (
                          <HelpCircle className="w-5 h-5 text-gray-300" />
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Electrical Permit */}
                  <tr>
                    <td className="sticky left-0 bg-white font-medium">Electrical Permit</td>
                    {sortedBids.map((bid) => (
                      <td key={bid.id}>
                        {bid.electrical_permit_included === true ? (
                          <Check className="w-5 h-5 text-green-600" />
                        ) : bid.electrical_permit_included === false ? (
                          <X className="w-5 h-5 text-red-400" />
                        ) : (
                          <HelpCircle className="w-5 h-5 text-gray-300" />
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Load Calculation */}
                  <tr>
                    <td className="sticky left-0 bg-white font-medium">Load Calculation</td>
                    {sortedBids.map((bid) => (
                      <td key={bid.id}>
                        {bid.electrical_load_calculation_included === true ? (
                          <Check className="w-5 h-5 text-green-600" />
                        ) : bid.electrical_load_calculation_included === false ? (
                          <X className="w-5 h-5 text-red-400" />
                        ) : (
                          <HelpCircle className="w-5 h-5 text-gray-300" />
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Electrical Notes */}
                  <tr>
                    <td className="sticky left-0 bg-white font-medium">Notes</td>
                    {sortedBids.map((bid) => (
                      <td key={bid.id}>
                        {bid.electrical_notes ? (
                          <span className="text-sm text-gray-600 truncate max-w-[200px] block" title={bid.electrical_notes}>
                            {bid.electrical_notes.length > 50 ? `${bid.electrical_notes.substring(0, 50)}...` : bid.electrical_notes}
                          </span>
                        ) : '—'}
                      </td>
                    ))}
                  </tr>
                </>
              )}

              {/* Warranty Row */}
              <tr>
                <td className="sticky left-0 bg-white font-medium">
                  <button onClick={() => handleSort('warranty')} className="flex items-center gap-1 hover:text-switch-green-600">
                    <Shield className="w-4 h-4" />
                    Warranty
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </td>
                {sortedBids.map((bid) => {
                  const totalWarranty = (bid.labor_warranty_years || 0) + (bid.equipment_warranty_years || 0);
                  return (
                    <td key={bid.id} className={isBestValue(totalWarranty, bestWarranty) ? 'best-value' : ''}>
                      {bid.labor_warranty_years || bid.equipment_warranty_years ? (
                        <>
                          {bid.labor_warranty_years && `${bid.labor_warranty_years}yr labor`}
                          {bid.labor_warranty_years && bid.equipment_warranty_years && ' / '}
                          {bid.equipment_warranty_years && `${bid.equipment_warranty_years}yr equip`}
                          {isBestValue(totalWarranty, bestWarranty) && (
                            <span className="ml-2 text-xs text-green-600 font-medium">BEST</span>
                          )}
                        </>
                      ) : '—'}
                    </td>
                  );
                })}
              </tr>

              {/* Timeline Row */}
              <tr>
                <td className="sticky left-0 bg-white font-medium">
                  <button onClick={() => handleSort('timeline')} className="flex items-center gap-1 hover:text-switch-green-600">
                    <Clock className="w-4 h-4" />
                    Timeline
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </td>
                {sortedBids.map((bid) => (
                  <td key={bid.id} className={isBestValue(bid.estimated_days, bestTimeline, false) ? 'best-value' : ''}>
                    {bid.estimated_days ? (
                      <>
                        {bid.estimated_days} days
                        {isBestValue(bid.estimated_days, bestTimeline, false) && (
                          <span className="ml-2 text-xs text-green-600 font-medium">FASTEST</span>
                        )}
                      </>
                    ) : '—'}
                  </td>
                ))}
              </tr>

              {/* Financing */}
              <tr>
                <td className="sticky left-0 bg-white font-medium">Financing</td>
                {sortedBids.map((bid) => (
                  <td key={bid.id}>
                    {bid.financing_offered ? (
                      <span className="text-green-600 flex items-center gap-1">
                        <Check className="w-4 h-4" />
                        Available
                      </span>
                    ) : (
                      <X className="w-5 h-5 text-gray-300" />
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-sm text-gray-500">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-50 border-l-4 border-green-500"></div>
          <span>Best in category</span>
        </div>
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4 text-yellow-500 fill-current" />
          <span>Your favorite</span>
        </div>
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-switch-green-600" />
          <span>Switch Preferred Contractor</span>
        </div>
      </div>
    </div>
  );
}
