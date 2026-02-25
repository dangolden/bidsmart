import { useMemo, useState } from 'react';
import {
  ArrowUpDown, Check, X, AlertTriangle, Star, HelpCircle,
  Zap, Shield, Clock, DollarSign, ThermometerSun, Target, ClipboardList,
  Plug, Building2, MapPin, ThumbsUp
} from 'lucide-react';
import type {
  BidComparisonTableRow,
  BidEquipment,
  BidScope,
  BidContractor,
  BidScore,
  ProjectRequirements,
  MindPalRedFlag,
  MindPalPositiveIndicator,
} from '../lib/types';
import { formatCurrency } from '../lib/utils/formatters';

// ---------------------------------------------------------------------------
// Flattened row type — gives the JSX a single flat object per bid so we don't
// have to sprinkle `row.scope?.` / `row.contractor?.` everywhere.
// ---------------------------------------------------------------------------

interface FlatBidRow {
  // From Bid
  id: string;
  contractor_name: string;
  is_favorite: boolean;

  // From BidScope — pricing
  total_bid_amount?: number | null;
  equipment_cost?: number | null;
  labor_cost?: number | null;
  materials_cost?: number | null;
  permit_cost?: number | null;
  disposal_cost?: number | null;
  electrical_cost?: number | null;
  estimated_rebates?: number | null;
  total_after_rebates?: number | null;

  // From BidScope — warranty / timeline
  labor_warranty_years?: number | null;
  equipment_warranty_years?: number | null;
  estimated_days?: number | null;
  financing_offered?: boolean | null;

  // From BidScope — electrical sub-group
  panel_assessment_included?: boolean | null;
  panel_upgrade_included?: boolean | null;
  panel_upgrade_cost?: number | null;
  existing_panel_amps?: number | null;
  proposed_panel_amps?: number | null;
  breaker_size_required?: number | null;
  dedicated_circuit_included?: boolean | null;
  electrical_permit_included?: boolean | null;
  load_calculation_included?: boolean | null;
  electrical_notes?: string | null;

  // From BidScope — scope booleans
  permit_included?: boolean | null;
  disposal_included?: boolean | null;
  electrical_included?: boolean | null;
  disconnect_included?: boolean | null;
  ductwork_included?: boolean | null;
  thermostat_included?: boolean | null;
  manual_j_included?: boolean | null;
  commissioning_included?: boolean | null;
  air_handler_included?: boolean | null;
  line_set_included?: boolean | null;
  pad_included?: boolean | null;
  drain_line_included?: boolean | null;

  // From BidContractor
  years_in_business?: number | null;
  google_rating?: number | null;
  google_review_count?: number | null;
  license?: string | null;
  license_state?: string | null;
  certifications?: string[] | null;
  insurance_verified?: boolean | null;
  yelp_rating?: number | null;
  yelp_review_count?: number | null;
  bbb_rating?: string | null;
  bbb_accredited?: boolean | null;
  bonded?: boolean | null;
  employee_count?: number | null;
  service_area?: string | null;

  // From BidScore
  overall_score?: number | null;
  red_flags?: MindPalRedFlag[] | null;
  positive_indicators?: MindPalPositiveIndicator[] | null;
}

function flattenRow(row: BidComparisonTableRow): FlatBidRow {
  const s: BidScope | null | undefined = row.scope;
  const c: BidContractor | null | undefined = row.contractor;
  const sc: BidScore | null | undefined = row.scores;

  return {
    // Bid identity
    id: row.bid.id,
    contractor_name: row.bid.contractor_name,
    is_favorite: row.bid.is_favorite,

    // Scope — pricing
    total_bid_amount: s?.total_bid_amount ?? null,
    equipment_cost: s?.equipment_cost ?? null,
    labor_cost: s?.labor_cost ?? null,
    materials_cost: s?.materials_cost ?? null,
    permit_cost: s?.permit_cost ?? null,
    disposal_cost: s?.disposal_cost ?? null,
    electrical_cost: s?.electrical_cost ?? null,
    estimated_rebates: s?.estimated_rebates ?? null,
    total_after_rebates: s?.total_after_rebates ?? null,

    // Scope — warranty / timeline
    labor_warranty_years: s?.labor_warranty_years ?? null,
    equipment_warranty_years: s?.equipment_warranty_years ?? null,
    estimated_days: s?.estimated_days ?? null,
    financing_offered: s?.financing_offered ?? null,

    // Scope — electrical sub-group
    panel_assessment_included: s?.panel_assessment_included ?? null,
    panel_upgrade_included: s?.panel_upgrade_included ?? null,
    panel_upgrade_cost: s?.panel_upgrade_cost ?? null,
    existing_panel_amps: s?.existing_panel_amps ?? null,
    proposed_panel_amps: s?.proposed_panel_amps ?? null,
    breaker_size_required: s?.breaker_size_required ?? null,
    dedicated_circuit_included: s?.dedicated_circuit_included ?? null,
    electrical_permit_included: s?.electrical_permit_included ?? null,
    load_calculation_included: s?.load_calculation_included ?? null,
    electrical_notes: s?.electrical_notes ?? null,

    // Scope — booleans
    permit_included: s?.permit_included ?? null,
    disposal_included: s?.disposal_included ?? null,
    electrical_included: s?.electrical_included ?? null,
    disconnect_included: s?.disconnect_included ?? null,
    ductwork_included: s?.ductwork_included ?? null,
    thermostat_included: s?.thermostat_included ?? null,
    manual_j_included: s?.manual_j_included ?? null,
    commissioning_included: s?.commissioning_included ?? null,
    air_handler_included: s?.air_handler_included ?? null,
    line_set_included: s?.line_set_included ?? null,
    pad_included: s?.pad_included ?? null,
    drain_line_included: s?.drain_line_included ?? null,

    // Contractor
    years_in_business: c?.years_in_business ?? null,
    google_rating: c?.google_rating ?? null,
    google_review_count: c?.google_review_count ?? null,
    license: c?.license ?? null,
    license_state: c?.license_state ?? null,
    certifications: c?.certifications ?? null,
    insurance_verified: c?.insurance_verified ?? null,
    yelp_rating: c?.yelp_rating ?? null,
    yelp_review_count: c?.yelp_review_count ?? null,
    bbb_rating: c?.bbb_rating ?? null,
    bbb_accredited: c?.bbb_accredited ?? null,
    bonded: c?.bonded ?? null,
    employee_count: c?.employee_count ?? null,
    service_area: c?.service_area ?? null,

    // Scores
    overall_score: sc?.overall_score ?? null,
    red_flags: sc?.red_flags ?? null,
    positive_indicators: sc?.positive_indicators ?? null,
  };
}

// ---------------------------------------------------------------------------
// Component props
// ---------------------------------------------------------------------------

interface BidComparisonTableProps {
  projectId: string;
  rows: BidComparisonTableRow[];
  requirements?: ProjectRequirements | null;
}

type CompareView = 'specs' | 'contractor' | 'pricing' | 'scope' | 'electrical';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BidComparisonTable({ projectId: _projectId, rows, requirements }: BidComparisonTableProps) {
  const [view, setView] = useState<CompareView>('specs');
  const [sortBy, setSortBy] = useState<string>('overall_score');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Flatten once per render-cycle
  const bids = useMemo(() => rows.map(flattenRow), [rows]);

  // Pre-compute equipment lookup keyed by bid id
  const equipmentMap = useMemo(() => {
    const m: Record<string, BidEquipment[]> = {};
    for (const row of rows) {
      m[row.bid.id] = row.equipment;
    }
    return m;
  }, [rows]);

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

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
        aVal = a.total_bid_amount ?? null;
        bVal = b.total_bid_amount ?? null;
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

  // ---------------------------------------------------------------------------
  // Equipment helpers (use equipmentMap instead of async DB calls)
  // ---------------------------------------------------------------------------

  function getSeerRating(bidId: string): number | null {
    const equip = equipmentMap[bidId]?.find(e => e.equipment_type === 'outdoor_unit' || e.seer_rating || e.seer2_rating);
    return equip?.seer2_rating || equip?.seer_rating || null;
  }

  function getHspfRating(bidId: string): number | null {
    const equip = equipmentMap[bidId]?.find(e => e.equipment_type === 'outdoor_unit' || e.hspf_rating || e.hspf2_rating);
    return equip?.hspf2_rating || equip?.hspf_rating || null;
  }

  function getCapacity(bidId: string): number | null {
    const equip = equipmentMap[bidId]?.find(e => e.capacity_tons || e.capacity_btu);
    return equip?.capacity_tons || (equip?.capacity_btu ? equip.capacity_btu / 12000 : null);
  }

  function isVariableSpeed(bidId: string): boolean {
    return equipmentMap[bidId]?.some(e => e.variable_speed) || false;
  }

  function isEnergyStar(bidId: string): boolean {
    return equipmentMap[bidId]?.some(e => e.energy_star_certified) || false;
  }

  function getRefrigerantType(bidId: string): string | null {
    const equip = equipmentMap[bidId]?.find(e => e.refrigerant_type);
    return equip?.refrigerant_type || null;
  }

  function getSoundLevel(bidId: string): number | null {
    const equip = equipmentMap[bidId]?.find(e => e.sound_level_db);
    return equip?.sound_level_db || null;
  }

  function getEerRating(bidId: string): number | null {
    const equip = equipmentMap[bidId]?.find(e => e.eer_rating);
    return equip?.eer_rating || null;
  }

  function getCop(bidId: string): number | null {
    const equip = equipmentMap[bidId]?.find(e => e.cop);
    return equip?.cop || null;
  }

  function getAmperageDraw(bidId: string): number | null {
    const equip = equipmentMap[bidId]?.find(e => e.amperage_draw);
    return equip?.amperage_draw || null;
  }

  function getMinCircuitAmperage(bidId: string): number | null {
    const equip = equipmentMap[bidId]?.find(e => e.minimum_circuit_amperage);
    return equip?.minimum_circuit_amperage || null;
  }

  const bestSeer = getBestValue(bids.map(b => getSeerRating(b.id)));
  const bestHspf = getBestValue(bids.map(b => getHspfRating(b.id)));

  // Returns true if at least one bid has a meaningful value for the given getter
  function anyBidHas(getter: (bid: FlatBidRow) => unknown): boolean {
    return sortedBids.some(bid => {
      const v = getter(bid);
      return v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0);
    });
  }

  // ---------------------------------------------------------------------------
  // Early returns
  // ---------------------------------------------------------------------------

  if (bids.length < 2) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Need More Bids</h3>
        <p className="text-gray-600">Upload at least 1 bid to see a comparison.</p>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Priority helpers
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

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
                        {isBestValue(bid.overall_score, bestScore) && ' \u2605'}
                      </span>
                    ) : '\u2014'}
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
                  {anyBidHas(b => getSeerRating(b.id)) && (
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
                            ) : '\u2014'}
                          </td>
                        );
                      })}
                    </tr>
                  )}

                  {/* HSPF Rating */}
                  {anyBidHas(b => getHspfRating(b.id)) && (
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
                            ) : '\u2014'}
                          </td>
                        );
                      })}
                    </tr>
                  )}

                  {/* Capacity */}
                  {anyBidHas(b => getCapacity(b.id)) && (
                    <tr>
                      <td className="sticky left-0 bg-white font-medium">Capacity (tons)</td>
                      {sortedBids.map((bid) => (
                        <td key={bid.id}>
                          {getCapacity(bid.id)?.toFixed(1) || '\u2014'}
                        </td>
                      ))}
                    </tr>
                  )}

                  {/* Variable Speed — always show: it's a meaningful Yes/No comparison */}
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

                  {/* Energy Star — always show */}
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

                  {/* Advanced Specs Header — only show if any advanced field has data */}
                  {(anyBidHas(b => getRefrigerantType(b.id)) ||
                    anyBidHas(b => getSoundLevel(b.id)) ||
                    anyBidHas(b => getEerRating(b.id)) ||
                    anyBidHas(b => getCop(b.id)) ||
                    anyBidHas(b => getAmperageDraw(b.id)) ||
                    anyBidHas(b => getMinCircuitAmperage(b.id))) && (
                    <tr className="bg-gray-50">
                      <td className="sticky left-0 bg-gray-50 font-medium text-gray-500 text-sm pt-4">
                        Advanced Specs
                      </td>
                      {sortedBids.map((bid) => (
                        <td key={bid.id} className="text-gray-400 text-sm pt-4">{'\u2014'}</td>
                      ))}
                    </tr>
                  )}

                  {/* Refrigerant Type */}
                  {anyBidHas(b => getRefrigerantType(b.id)) && (
                    <tr>
                      <td className="sticky left-0 bg-white font-medium">Refrigerant</td>
                      {sortedBids.map((bid) => (
                        <td key={bid.id}>
                          {getRefrigerantType(bid.id) || '\u2014'}
                        </td>
                      ))}
                    </tr>
                  )}

                  {/* Noise Level */}
                  {anyBidHas(b => getSoundLevel(b.id)) && (
                    <tr>
                      <td className="sticky left-0 bg-white font-medium">Noise Level</td>
                      {sortedBids.map((bid) => {
                        const sound = getSoundLevel(bid.id);
                        return (
                          <td key={bid.id}>
                            {sound ? `${sound} dB` : '\u2014'}
                          </td>
                        );
                      })}
                    </tr>
                  )}

                  {/* EER Rating */}
                  {anyBidHas(b => getEerRating(b.id)) && (
                    <tr>
                      <td className="sticky left-0 bg-white font-medium">
                        EER Rating
                        <span className="text-xs text-gray-400 font-normal block">Energy efficiency</span>
                      </td>
                      {sortedBids.map((bid) => {
                        const eer = getEerRating(bid.id);
                        return (
                          <td key={bid.id}>
                            {eer ? eer.toFixed(1) : '\u2014'}
                          </td>
                        );
                      })}
                    </tr>
                  )}

                  {/* COP */}
                  {anyBidHas(b => getCop(b.id)) && (
                    <tr>
                      <td className="sticky left-0 bg-white font-medium">
                        COP
                        <span className="text-xs text-gray-400 font-normal block">Heating coefficient</span>
                      </td>
                      {sortedBids.map((bid) => {
                        const cop = getCop(bid.id);
                        return (
                          <td key={bid.id}>
                            {cop ? cop.toFixed(1) : '\u2014'}
                          </td>
                        );
                      })}
                    </tr>
                  )}

                  {/* Amperage Draw */}
                  {anyBidHas(b => getAmperageDraw(b.id)) && (
                    <tr>
                      <td className="sticky left-0 bg-white font-medium">Amperage Draw</td>
                      {sortedBids.map((bid) => {
                        const amps = getAmperageDraw(bid.id);
                        return (
                          <td key={bid.id}>
                            {amps ? `${amps}A` : '\u2014'}
                          </td>
                        );
                      })}
                    </tr>
                  )}

                  {/* Min Circuit Amps */}
                  {anyBidHas(b => getMinCircuitAmperage(b.id)) && (
                    <tr>
                      <td className="sticky left-0 bg-white font-medium">Min Circuit Amps</td>
                      {sortedBids.map((bid) => {
                        const minAmps = getMinCircuitAmperage(bid.id);
                        return (
                          <td key={bid.id}>
                            {minAmps ? `${minAmps}A` : '\u2014'}
                          </td>
                        );
                      })}
                    </tr>
                  )}
                </>
              )}

              {view === 'contractor' && (
                <>
                  {/* Years in Business */}
                  {anyBidHas(b => b.years_in_business) && (
                    <tr>
                      <td className="sticky left-0 bg-white font-medium">Years in Business</td>
                      {sortedBids.map((bid) => (
                        <td key={bid.id}>
                          {bid.years_in_business ? (
                            <span className={bid.years_in_business >= 10 ? 'text-green-600 font-medium' : ''}>
                              {bid.years_in_business} years
                            </span>
                          ) : '\u2014'}
                        </td>
                      ))}
                    </tr>
                  )}

                  {/* Google Rating */}
                  {anyBidHas(b => b.google_rating) && (
                    <tr>
                      <td className="sticky left-0 bg-white font-medium">Google Rating</td>
                      {sortedBids.map((bid) => (
                        <td key={bid.id}>
                          {bid.google_rating ? (
                            <span className={bid.google_rating >= 4.5 ? 'text-green-600 font-medium' : ''}>
                              {bid.google_rating.toFixed(1)} \u2B50
                              {bid.google_review_count && (
                                <span className="text-gray-400 text-sm ml-1">
                                  ({bid.google_review_count})
                                </span>
                              )}
                            </span>
                          ) : '\u2014'}
                        </td>
                      ))}
                    </tr>
                  )}

                  {/* License — always show: missing license is a meaningful signal */}
                  <tr>
                    <td className="sticky left-0 bg-white font-medium">License #</td>
                    {sortedBids.map((bid) => (
                      <td key={bid.id}>
                        {bid.license ? (
                          <>
                            {bid.license}
                            {bid.license_state && ` (${bid.license_state})`}
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
                  {anyBidHas(b => b.certifications) && (
                    <tr>
                      <td className="sticky left-0 bg-white font-medium">Certifications</td>
                      {sortedBids.map((bid) => (
                        <td key={bid.id}>
                          {bid.certifications && bid.certifications.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {bid.certifications.map((cert, i) => (
                                <span key={i} className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                                  {cert}
                                </span>
                              ))}
                            </div>
                          ) : '\u2014'}
                        </td>
                      ))}
                    </tr>
                  )}

                  {/* Insurance */}
                  {anyBidHas(b => b.insurance_verified) && (
                    <tr>
                      <td className="sticky left-0 bg-white font-medium">Insurance Verified</td>
                      {sortedBids.map((bid) => (
                        <td key={bid.id}>
                          {bid.insurance_verified ? (
                            <Check className="w-5 h-5 text-green-600" />
                          ) : (
                            <span className="text-gray-400">Unknown</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  )}

                  {/* Yelp Rating */}
                  {anyBidHas(b => b.yelp_rating) && (
                    <tr>
                      <td className="sticky left-0 bg-white font-medium">Yelp Rating</td>
                      {sortedBids.map((bid) => (
                        <td key={bid.id}>
                          {bid.yelp_rating ? (
                            <span className={bid.yelp_rating >= 4.5 ? 'text-green-600 font-medium' : ''}>
                              {bid.yelp_rating.toFixed(1)} \u2B50
                              {bid.yelp_review_count && (
                                <span className="text-gray-400 text-sm ml-1">
                                  ({bid.yelp_review_count})
                                </span>
                              )}
                            </span>
                          ) : '\u2014'}
                        </td>
                      ))}
                    </tr>
                  )}

                  {/* BBB Rating */}
                  {anyBidHas(b => b.bbb_rating) && (
                    <tr>
                      <td className="sticky left-0 bg-white font-medium">BBB Rating</td>
                      {sortedBids.map((bid) => (
                        <td key={bid.id}>
                          {bid.bbb_rating ? (
                            <span className="flex items-center gap-1">
                              <span className="font-medium">{bid.bbb_rating}</span>
                              {bid.bbb_accredited && (
                                <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Accredited</span>
                              )}
                            </span>
                          ) : '\u2014'}
                        </td>
                      ))}
                    </tr>
                  )}

                  {/* Bonded */}
                  {anyBidHas(b => b.bonded) && (
                    <tr>
                      <td className="sticky left-0 bg-white font-medium">Bonded</td>
                      {sortedBids.map((bid) => (
                        <td key={bid.id}>
                          {bid.bonded ? (
                            <Check className="w-5 h-5 text-green-600" />
                          ) : (
                            <span className="text-gray-400">Unknown</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  )}

                  {/* Red Flags — always show */}
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
                  {anyBidHas(b => b.positive_indicators) && (
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
                            <span className="text-gray-400">{'\u2014'}</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  )}

                  {/* Company Size */}
                  {anyBidHas(b => b.employee_count) && (
                    <tr>
                      <td className="sticky left-0 bg-white font-medium">
                        <div className="flex items-center gap-1">
                          <Building2 className="w-4 h-4 text-gray-500" />
                          Company Size
                        </div>
                      </td>
                      {sortedBids.map((bid) => (
                        <td key={bid.id}>
                          {bid.employee_count || '\u2014'}
                        </td>
                      ))}
                    </tr>
                  )}

                  {/* Service Area */}
                  {anyBidHas(b => b.service_area) && (
                    <tr>
                      <td className="sticky left-0 bg-white font-medium">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4 text-gray-500" />
                          Service Area
                        </div>
                      </td>
                      {sortedBids.map((bid) => (
                        <td key={bid.id}>
                          {bid.service_area ? (
                            <span className="text-sm truncate max-w-[150px] block" title={bid.service_area}>
                              {bid.service_area.length > 30 ? `${bid.service_area.substring(0, 30)}...` : bid.service_area}
                            </span>
                          ) : '\u2014'}
                        </td>
                      ))}
                    </tr>
                  )}
                </>
              )}

              {view === 'pricing' && (
                <>
                  {/* Equipment Cost */}
                  {anyBidHas(b => b.equipment_cost) && (
                    <tr>
                      <td className="sticky left-0 bg-white font-medium">Equipment</td>
                      {sortedBids.map((bid) => (
                        <td key={bid.id}>{formatCurrency(bid.equipment_cost)}</td>
                      ))}
                    </tr>
                  )}

                  {/* Labor Cost */}
                  {anyBidHas(b => b.labor_cost) && (
                    <tr>
                      <td className="sticky left-0 bg-white font-medium">Labor</td>
                      {sortedBids.map((bid) => (
                        <td key={bid.id}>{formatCurrency(bid.labor_cost)}</td>
                      ))}
                    </tr>
                  )}

                  {/* Materials */}
                  {anyBidHas(b => b.materials_cost) && (
                    <tr>
                      <td className="sticky left-0 bg-white font-medium">Materials</td>
                      {sortedBids.map((bid) => (
                        <td key={bid.id}>{formatCurrency(bid.materials_cost)}</td>
                      ))}
                    </tr>
                  )}

                  {/* Permits */}
                  {anyBidHas(b => b.permit_cost) && (
                    <tr>
                      <td className="sticky left-0 bg-white font-medium">Permits</td>
                      {sortedBids.map((bid) => (
                        <td key={bid.id}>{formatCurrency(bid.permit_cost)}</td>
                      ))}
                    </tr>
                  )}

                  {/* Disposal */}
                  {anyBidHas(b => b.disposal_cost) && (
                    <tr>
                      <td className="sticky left-0 bg-white font-medium">Disposal</td>
                      {sortedBids.map((bid) => (
                        <td key={bid.id}>{formatCurrency(bid.disposal_cost)}</td>
                      ))}
                    </tr>
                  )}

                  {/* Electrical Work */}
                  {anyBidHas(b => b.electrical_cost) && (
                    <tr>
                      <td className="sticky left-0 bg-white font-medium">Electrical Work</td>
                      {sortedBids.map((bid) => (
                        <td key={bid.id}>{formatCurrency(bid.electrical_cost)}</td>
                      ))}
                    </tr>
                  )}

                  {/* Rebates */}
                  {anyBidHas(b => b.estimated_rebates) && (
                    <tr>
                      <td className="sticky left-0 bg-white font-medium text-green-600">Est. Rebates</td>
                      {sortedBids.map((bid) => (
                        <td key={bid.id} className="text-green-600">
                          {bid.estimated_rebates ? `-${formatCurrency(bid.estimated_rebates)}` : '\u2014'}
                        </td>
                      ))}
                    </tr>
                  )}

                  {/* After Rebates — only if different from total */}
                  {anyBidHas(b => b.total_after_rebates) && (
                    <tr className="bg-green-50">
                      <td className="sticky left-0 bg-green-50 font-medium">After Rebates</td>
                      {sortedBids.map((bid) => (
                        <td key={bid.id} className="font-semibold">
                          {formatCurrency(bid.total_after_rebates || bid.total_bid_amount)}
                        </td>
                      ))}
                    </tr>
                  )}
                </>
              )}

              {view === 'scope' && (
                <>
                  {([
                    { key: 'permit_included', label: 'Permits & Filing' },
                    { key: 'disposal_included', label: 'Old Equipment Disposal' },
                    { key: 'electrical_included', label: 'Electrical Work' },
                    { key: 'disconnect_included', label: 'Electrical Disconnect' },
                    { key: 'ductwork_included', label: 'Ductwork Modifications' },
                    { key: 'thermostat_included', label: 'Thermostat' },
                    { key: 'manual_j_included', label: 'Manual J Calculation' },
                    { key: 'commissioning_included', label: 'System Commissioning' },
                    { key: 'air_handler_included', label: 'Air Handler' },
                    { key: 'line_set_included', label: 'Refrigerant Line Set' },
                    { key: 'pad_included', label: 'Equipment Pad' },
                    { key: 'drain_line_included', label: 'Condensate Drain Line' },
                  ] as const).filter((item) =>
                    // Skip rows where every bid has null (not even false — truly unknown)
                    sortedBids.some(bid => bid[item.key] !== null && bid[item.key] !== undefined)
                  ).map((item) => (
                    <tr key={item.key}>
                      <td className="sticky left-0 bg-white font-medium">{item.label}</td>
                      {sortedBids.map((bid) => {
                        const value = bid[item.key];
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
                  {anyBidHas(b => b.panel_assessment_included) && (
                    <tr>
                      <td className="sticky left-0 bg-white font-medium">
                        <div className="flex items-center gap-1">
                          <Plug className="w-4 h-4 text-amber-500" />
                          Panel Assessment
                        </div>
                      </td>
                      {sortedBids.map((bid) => (
                        <td key={bid.id}>
                          {bid.panel_assessment_included === true ? (
                            <Check className="w-5 h-5 text-green-600" />
                          ) : bid.panel_assessment_included === false ? (
                            <X className="w-5 h-5 text-red-400" />
                          ) : (
                            <HelpCircle className="w-5 h-5 text-gray-300" />
                          )}
                        </td>
                      ))}
                    </tr>
                  )}

                  {/* Panel Upgrade Needed */}
                  {anyBidHas(b => b.panel_upgrade_included) && (
                    <tr>
                      <td className="sticky left-0 bg-white font-medium">Panel Upgrade Needed</td>
                      {sortedBids.map((bid) => (
                        <td key={bid.id}>
                          {bid.panel_upgrade_included === true ? (
                            <span className="text-amber-600 font-medium">Yes</span>
                          ) : bid.panel_upgrade_included === false ? (
                            <span className="text-green-600">No</span>
                          ) : (
                            <HelpCircle className="w-5 h-5 text-gray-300" />
                          )}
                        </td>
                      ))}
                    </tr>
                  )}

                  {/* Panel Upgrade Cost */}
                  {anyBidHas(b => b.panel_upgrade_cost) && (
                    <tr>
                      <td className="sticky left-0 bg-white font-medium">Upgrade Cost</td>
                      {sortedBids.map((bid) => (
                        <td key={bid.id}>
                          {bid.panel_upgrade_cost ? (
                            formatCurrency(bid.panel_upgrade_cost)
                          ) : '\u2014'}
                        </td>
                      ))}
                    </tr>
                  )}

                  {/* Current Panel Amps */}
                  {anyBidHas(b => b.existing_panel_amps) && (
                    <tr>
                      <td className="sticky left-0 bg-white font-medium">Current Panel</td>
                      {sortedBids.map((bid) => (
                        <td key={bid.id}>
                          {bid.existing_panel_amps ? (
                            <span>{bid.existing_panel_amps}A</span>
                          ) : '\u2014'}
                        </td>
                      ))}
                    </tr>
                  )}

                  {/* Required Panel Amps */}
                  {anyBidHas(b => b.proposed_panel_amps) && (
                    <tr>
                      <td className="sticky left-0 bg-white font-medium">Required Panel</td>
                      {sortedBids.map((bid) => (
                        <td key={bid.id}>
                          {bid.proposed_panel_amps ? (
                            <span>{bid.proposed_panel_amps}A</span>
                          ) : '\u2014'}
                        </td>
                      ))}
                    </tr>
                  )}

                  {/* Breaker Size Required */}
                  {anyBidHas(b => b.breaker_size_required) && (
                    <tr>
                      <td className="sticky left-0 bg-white font-medium">Breaker Size</td>
                      {sortedBids.map((bid) => (
                        <td key={bid.id}>
                          {bid.breaker_size_required ? (
                            <span>{bid.breaker_size_required}A</span>
                          ) : '\u2014'}
                        </td>
                      ))}
                    </tr>
                  )}

                  {/* Dedicated Circuit */}
                  {anyBidHas(b => b.dedicated_circuit_included) && (
                    <tr>
                      <td className="sticky left-0 bg-white font-medium">Dedicated Circuit</td>
                      {sortedBids.map((bid) => (
                        <td key={bid.id}>
                          {bid.dedicated_circuit_included === true ? (
                            <Check className="w-5 h-5 text-green-600" />
                          ) : bid.dedicated_circuit_included === false ? (
                            <X className="w-5 h-5 text-red-400" />
                          ) : (
                            <HelpCircle className="w-5 h-5 text-gray-300" />
                          )}
                        </td>
                      ))}
                    </tr>
                  )}

                  {/* Electrical Permit */}
                  {anyBidHas(b => b.electrical_permit_included) && (
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
                  )}

                  {/* Load Calculation */}
                  {anyBidHas(b => b.load_calculation_included) && (
                    <tr>
                      <td className="sticky left-0 bg-white font-medium">Load Calculation</td>
                      {sortedBids.map((bid) => (
                        <td key={bid.id}>
                          {bid.load_calculation_included === true ? (
                            <Check className="w-5 h-5 text-green-600" />
                          ) : bid.load_calculation_included === false ? (
                            <X className="w-5 h-5 text-red-400" />
                          ) : (
                            <HelpCircle className="w-5 h-5 text-gray-300" />
                          )}
                        </td>
                      ))}
                    </tr>
                  )}

                  {/* Electrical Notes */}
                  {anyBidHas(b => b.electrical_notes) && (
                    <tr>
                      <td className="sticky left-0 bg-white font-medium">Notes</td>
                      {sortedBids.map((bid) => (
                        <td key={bid.id}>
                          {bid.electrical_notes ? (
                            <span className="text-sm text-gray-600 truncate max-w-[200px] block" title={bid.electrical_notes}>
                              {bid.electrical_notes.length > 50 ? `${bid.electrical_notes.substring(0, 50)}...` : bid.electrical_notes}
                            </span>
                          ) : '\u2014'}
                        </td>
                      ))}
                    </tr>
                  )}
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
                      ) : '\u2014'}
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
                    ) : '\u2014'}
                  </td>
                ))}
              </tr>

              {/* Financing — only show if at least one bid has a value */}
              {anyBidHas(b => b.financing_offered) && (
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
              )}
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
      </div>
    </div>
  );
}
