import { useState, useEffect } from 'react';
import { 
  ArrowUpDown, Check, X, AlertTriangle, Award, Star,
  Zap, Shield, Clock, DollarSign, ThermometerSun
} from 'lucide-react';
import * as db from '../lib/database/bidsmartService';
import type { ContractorBid, BidEquipment } from '../lib/types';

interface BidComparisonTableProps {
  projectId: string;
  bids: ContractorBid[];
}

type CompareView = 'specs' | 'contractor' | 'pricing';

export function BidComparisonTable({ projectId: _projectId, bids }: BidComparisonTableProps) {
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

  function formatCurrency(amount: number | null | undefined) {
    if (amount == null) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
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
        <p className="text-gray-600">Upload at least 2 bids to see a comparison.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* View Toggle */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">Compare:</span>
        <div className="flex bg-gray-100 rounded-lg p-1">
          {[
            { id: 'specs', label: 'Equipment Specs', icon: ThermometerSun },
            { id: 'contractor', label: 'Contractor Info', icon: Shield },
            { id: 'pricing', label: 'Pricing Breakdown', icon: DollarSign },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setView(tab.id as CompareView)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                view === tab.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Comparison Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
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
