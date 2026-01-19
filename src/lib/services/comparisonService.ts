/**
 * Bid Comparison and Analysis Service
 * 
 * Generates weighted scores, comparisons, insights, and recommendations.
 */

import * as db from '../database/bidsmartService';
import type {
  ContractorBid,
  BidEquipment,
  BidLineItem,
  BidAnalysis,
  WeightedScoreConfig,
  PriceComparison,
  EfficiencyComparison,
  WarrantyComparison,
  RedFlag,
  MissingInfo,
  NegotiationPoint,
  BidComparisonTableRow,
} from '../types';

// Default scoring weights
export const DEFAULT_WEIGHTS: WeightedScoreConfig = {
  price: { weight: 0.30, label: 'Price' },
  efficiency: { weight: 0.25, label: 'Efficiency' },
  warranty: { weight: 0.20, label: 'Warranty' },
  completeness: { weight: 0.15, label: 'Completeness' },
  timeline: { weight: 0.10, label: 'Timeline' },
};

interface BidWithDetails {
  bid: ContractorBid;
  equipment: BidEquipment[];
  lineItems: BidLineItem[];
}

/**
 * Calculate weighted scores for all bids in a project
 */
export async function calculateProjectScores(
  projectId: string,
  weights: WeightedScoreConfig = DEFAULT_WEIGHTS
): Promise<BidComparisonTableRow[]> {
  const bids = await db.getBidsByProject(projectId);
  
  // Load details for each bid
  const bidsWithDetails: BidWithDetails[] = await Promise.all(
    bids.map(async (bid) => ({
      bid,
      equipment: await db.getEquipmentByBid(bid.id),
      lineItems: await db.getLineItemsByBid(bid.id),
    }))
  );

  // Calculate individual scores
  const priceScores = calculatePriceScores(bidsWithDetails);
  const efficiencyScores = calculateEfficiencyScores(bidsWithDetails);
  const warrantyScores = calculateWarrantyScores(bidsWithDetails);
  const completenessScores = calculateCompletenessScores(bidsWithDetails);
  const timelineScores = calculateTimelineScores(bidsWithDetails);

  // Calculate weighted overall scores
  return bidsWithDetails.map((bwd, index) => {
    const priceScore = priceScores[index];
    const efficiencyScore = efficiencyScores[index];
    const warrantyScore = warrantyScores[index];
    const completenessScore = completenessScores[index];
    const timelineScore = timelineScores[index];

    const overall = 
      priceScore * weights.price.weight +
      efficiencyScore * weights.efficiency.weight +
      warrantyScore * weights.warranty.weight +
      completenessScore * weights.completeness.weight +
      timelineScore * weights.timeline.weight;

    return {
      bid: bwd.bid,
      equipment: bwd.equipment,
      lineItems: bwd.lineItems,
      scores: {
        overall: Math.round(overall * 100) / 100,
        price: priceScore,
        quality: efficiencyScore, // Using efficiency as quality proxy
        value: (priceScore + efficiencyScore) / 2,
        completeness: completenessScore,
      },
    };
  });
}

/**
 * Calculate price scores (lower is better)
 */
function calculatePriceScores(bids: BidWithDetails[]): number[] {
  const prices = bids.map((b) => b.bid.total_bid_amount);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const range = maxPrice - minPrice;

  if (range === 0) {
    return bids.map(() => 100); // All same price
  }

  return prices.map((price) => {
    // Invert: lowest price gets highest score
    const normalized = 1 - (price - minPrice) / range;
    return Math.round(normalized * 100);
  });
}

/**
 * Calculate efficiency scores based on SEER/HSPF
 */
function calculateEfficiencyScores(bids: BidWithDetails[]): number[] {
  // Get best SEER from each bid's equipment
  const seerRatings = bids.map((b) => {
    const outdoorUnit = b.equipment.find((e) => 
      e.equipment_type === 'outdoor_unit' || e.equipment_type.includes('outdoor')
    );
    return outdoorUnit?.seer_rating || outdoorUnit?.seer2_rating || 0;
  });

  const maxSeer = Math.max(...seerRatings, 14); // Minimum baseline of 14
  const minSeer = Math.min(...seerRatings.filter((s) => s > 0), 14);
  const range = maxSeer - minSeer;

  if (range === 0) {
    return bids.map(() => 80); // All same or missing
  }

  return seerRatings.map((seer) => {
    if (seer === 0) return 50; // Missing data
    const normalized = (seer - minSeer) / range;
    return Math.round(50 + normalized * 50); // 50-100 range
  });
}

/**
 * Calculate warranty scores
 */
function calculateWarrantyScores(bids: BidWithDetails[]): number[] {
  return bids.map((b) => {
    let score = 50; // Base score

    const laborYears = b.bid.labor_warranty_years || 0;
    const equipYears = b.bid.equipment_warranty_years || 0;

    // Labor warranty: 1 year = 60, 2+ years = 80
    if (laborYears >= 2) score += 15;
    else if (laborYears >= 1) score += 10;

    // Equipment warranty: 5 years = 70, 10+ years = 90
    if (equipYears >= 10) score += 25;
    else if (equipYears >= 5) score += 15;
    else if (equipYears > 0) score += 5;

    // Bonus for insurance verification
    if (b.bid.contractor_insurance_verified) score += 10;

    return Math.min(score, 100);
  });
}

/**
 * Calculate completeness scores
 */
function calculateCompletenessScores(bids: BidWithDetails[]): number[] {
  return bids.map((b) => {
    const fields = [
      { value: b.bid.contractor_name, points: 5 },
      { value: b.bid.contractor_phone, points: 5 },
      { value: b.bid.contractor_email, points: 5 },
      { value: b.bid.contractor_license, points: 10 },
      { value: b.bid.total_bid_amount > 0, points: 15 },
      { value: b.bid.labor_warranty_years, points: 10 },
      { value: b.bid.equipment_warranty_years, points: 10 },
      { value: b.bid.estimated_days, points: 5 },
      { value: b.bid.scope_summary, points: 10 },
      { value: b.lineItems.length > 0, points: 15 },
      { value: b.equipment.length > 0, points: 10 },
    ];

    const score = fields.reduce((sum, field) => {
      return sum + (field.value ? field.points : 0);
    }, 0);

    return Math.min(score, 100);
  });
}

/**
 * Calculate timeline scores (faster is better, but not too fast)
 */
function calculateTimelineScores(bids: BidWithDetails[]): number[] {
  const timelines = bids.map((b) => b.bid.estimated_days || 0);
  const validTimelines = timelines.filter((t) => t > 0);
  
  if (validTimelines.length === 0) {
    return bids.map(() => 70); // No timeline data
  }

  const avgTimeline = validTimelines.reduce((a, b) => a + b, 0) / validTimelines.length;

  return timelines.map((days) => {
    if (days === 0) return 70; // Missing data

    // Sweet spot is around average
    const deviation = Math.abs(days - avgTimeline) / avgTimeline;
    
    if (deviation < 0.2) return 100; // Within 20% of average
    if (deviation < 0.4) return 85;
    if (deviation < 0.6) return 70;
    return 55;
  });
}

/**
 * Generate price comparison analysis
 */
export function generatePriceComparison(bids: BidWithDetails[]): PriceComparison {
  const sortedByPrice = [...bids].sort((a, b) => 
    a.bid.total_bid_amount - b.bid.total_bid_amount
  );

  const prices = bids.map((b) => b.bid.total_bid_amount);
  const totalPrice = prices.reduce((a, b) => a + b, 0);
  const avgPrice = totalPrice / prices.length;
  
  // Median
  const sortedPrices = [...prices].sort((a, b) => a - b);
  const mid = Math.floor(sortedPrices.length / 2);
  const medianPrice = sortedPrices.length % 2 
    ? sortedPrices[mid] 
    : (sortedPrices[mid - 1] + sortedPrices[mid]) / 2;

  const lowestBid = sortedByPrice[0];
  const highestBid = sortedByPrice[sortedByPrice.length - 1];
  const priceRange = highestBid.bid.total_bid_amount - lowestBid.bid.total_bid_amount;
  const spreadPercentage = (priceRange / lowestBid.bid.total_bid_amount) * 100;

  // Get system size for per-ton calculations
  const getSystemSize = (b: BidWithDetails): number => {
    const outdoor = b.equipment.find((e) => e.equipment_type === 'outdoor_unit');
    return outdoor?.capacity_tons || 3; // Default to 3 tons
  };

  return {
    lowest_bid_id: lowestBid.bid.id,
    highest_bid_id: highestBid.bid.id,
    average_price: Math.round(avgPrice),
    median_price: Math.round(medianPrice),
    price_range: priceRange,
    price_spread_percentage: Math.round(spreadPercentage * 10) / 10,
    by_bid: bids.map((b) => ({
      bid_id: b.bid.id,
      contractor_name: b.bid.contractor_name,
      total_amount: b.bid.total_bid_amount,
      per_ton_cost: Math.round(b.bid.total_bid_amount / getSystemSize(b)),
      deviation_from_average: Math.round(((b.bid.total_bid_amount - avgPrice) / avgPrice) * 100),
    })),
  };
}

/**
 * Generate efficiency comparison
 */
export function generateEfficiencyComparison(bids: BidWithDetails[]): EfficiencyComparison {
  const getEfficiencyData = (b: BidWithDetails) => {
    const outdoor = b.equipment.find((e) => 
      e.equipment_type === 'outdoor_unit' || e.equipment_type.includes('outdoor')
    );
    return {
      seer: outdoor?.seer_rating || null,
      seer2: outdoor?.seer2_rating || null,
      hspf: outdoor?.hspf_rating || null,
      hspf2: outdoor?.hspf2_rating || null,
      energy_star: outdoor?.energy_star_certified || false,
      most_efficient: outdoor?.energy_star_most_efficient || false,
    };
  };

  const efficiencyData = bids.map((b) => ({
    bid: b.bid,
    ...getEfficiencyData(b),
  }));

  // Find highest SEER
  const highestSeer = efficiencyData.reduce((best, curr) => {
    const currSeer = curr.seer || curr.seer2 || 0;
    const bestSeer = best.seer || best.seer2 || 0;
    return currSeer > bestSeer ? curr : best;
  });

  // Find highest HSPF
  const highestHspf = efficiencyData.reduce((best, curr) => {
    const currHspf = curr.hspf || curr.hspf2 || 0;
    const bestHspf = best.hspf || best.hspf2 || 0;
    return currHspf > bestHspf ? curr : best;
  });

  return {
    highest_seer_bid_id: highestSeer.bid.id,
    highest_hspf_bid_id: highestHspf.bid.id,
    by_bid: efficiencyData.map((ed) => ({
      bid_id: ed.bid.id,
      contractor_name: ed.bid.contractor_name,
      seer: ed.seer,
      seer2: ed.seer2,
      hspf: ed.hspf,
      hspf2: ed.hspf2,
      energy_star: ed.energy_star,
      most_efficient: ed.most_efficient,
    })),
  };
}

/**
 * Generate warranty comparison
 */
export function generateWarrantyComparison(bids: BidWithDetails[]): WarrantyComparison {
  const getWarrantyValue = (b: BidWithDetails): number => {
    // Simple calculation: labor years * $500 + equipment years * $200
    const laborValue = (b.bid.labor_warranty_years || 0) * 500;
    const equipValue = (b.bid.equipment_warranty_years || 0) * 200;
    return laborValue + equipValue;
  };

  const warrantyData = bids.map((b) => ({
    bid: b.bid,
    labor_years: b.bid.labor_warranty_years,
    equipment_years: b.bid.equipment_warranty_years,
    compressor_years: b.equipment.find((e) => e.equipment_type === 'outdoor_unit')?.compressor_warranty_years,
    extended_available: false, // Would need to parse from additional_warranty_details
    value: getWarrantyValue(b),
  }));

  const bestLabor = warrantyData.reduce((best, curr) => 
    (curr.labor_years || 0) > (best.labor_years || 0) ? curr : best
  );

  const bestEquipment = warrantyData.reduce((best, curr) => 
    (curr.equipment_years || 0) > (best.equipment_years || 0) ? curr : best
  );

  return {
    best_labor_warranty_bid_id: bestLabor.bid.id,
    best_equipment_warranty_bid_id: bestEquipment.bid.id,
    by_bid: warrantyData.map((wd) => ({
      bid_id: wd.bid.id,
      contractor_name: wd.bid.contractor_name,
      labor_years: wd.labor_years ?? null,
      equipment_years: wd.equipment_years ?? null,
      compressor_years: wd.compressor_years ?? null,
      extended_available: wd.extended_available,
      total_warranty_value: wd.value,
    })),
  };
}

/**
 * Identify red flags in bids
 */
export function identifyRedFlags(bids: BidWithDetails[]): RedFlag[] {
  const flags: RedFlag[] = [];
  const avgPrice = bids.reduce((sum, b) => sum + b.bid.total_bid_amount, 0) / bids.length;

  for (const b of bids) {
    // Price significantly below average
    if (b.bid.total_bid_amount < avgPrice * 0.7) {
      flags.push({
        bid_id: b.bid.id,
        contractor_name: b.bid.contractor_name,
        issue: 'Price is significantly below average (30%+ lower)',
        severity: 'high',
        recommendation: 'Verify scope of work is complete and clarify what may be missing',
      });
    }

    // No warranty information
    if (!b.bid.labor_warranty_years && !b.bid.equipment_warranty_years) {
      flags.push({
        bid_id: b.bid.id,
        contractor_name: b.bid.contractor_name,
        issue: 'No warranty information provided',
        severity: 'high',
        recommendation: 'Request detailed warranty terms before proceeding',
      });
    }

    // Missing license
    if (!b.bid.contractor_license) {
      flags.push({
        bid_id: b.bid.id,
        contractor_name: b.bid.contractor_name,
        issue: 'Contractor license number not provided',
        severity: 'medium',
        recommendation: 'Request license number and verify with state licensing board',
      });
    }

    // Missing contact info
    if (!b.bid.contractor_phone && !b.bid.contractor_email) {
      flags.push({
        bid_id: b.bid.id,
        contractor_name: b.bid.contractor_name,
        issue: 'No contact information provided',
        severity: 'medium',
        recommendation: 'Obtain direct contact information before proceeding',
      });
    }

    // Very short timeline
    if (b.bid.estimated_days && b.bid.estimated_days < 1) {
      flags.push({
        bid_id: b.bid.id,
        contractor_name: b.bid.contractor_name,
        issue: 'Unrealistically short timeline',
        severity: 'low',
        recommendation: 'Confirm timeline is realistic for the scope of work',
      });
    }

    // No itemized breakdown
    if (b.lineItems.length === 0) {
      flags.push({
        bid_id: b.bid.id,
        contractor_name: b.bid.contractor_name,
        issue: 'No itemized cost breakdown',
        severity: 'low',
        recommendation: 'Request detailed line-item pricing for transparency',
      });
    }
  }

  return flags;
}

/**
 * Identify missing information
 */
export function identifyMissingInfo(bids: BidWithDetails[]): MissingInfo[] {
  const missing: MissingInfo[] = [];

  const checkField = (
    b: BidWithDetails,
    field: string,
    value: unknown,
    importance: 'critical' | 'important' | 'nice_to_have'
  ) => {
    if (!value || (typeof value === 'number' && value === 0)) {
      missing.push({
        bid_id: b.bid.id,
        contractor_name: b.bid.contractor_name,
        missing_field: field,
        importance,
      });
    }
  };

  for (const b of bids) {
    checkField(b, 'Total bid amount', b.bid.total_bid_amount, 'critical');
    checkField(b, 'Equipment warranty', b.bid.equipment_warranty_years, 'critical');
    checkField(b, 'Labor warranty', b.bid.labor_warranty_years, 'important');
    checkField(b, 'Contractor license', b.bid.contractor_license, 'important');
    checkField(b, 'Estimated timeline', b.bid.estimated_days, 'important');
    checkField(b, 'Equipment details', b.equipment.length > 0, 'important');
    checkField(b, 'Scope of work', b.bid.scope_summary, 'nice_to_have');
    checkField(b, 'Line item breakdown', b.lineItems.length > 0, 'nice_to_have');
    checkField(b, 'Payment terms', b.bid.payment_schedule, 'nice_to_have');
  }

  return missing;
}

/**
 * Generate negotiation points
 */
export function generateNegotiationPoints(
  bids: BidWithDetails[],
  priceComparison: PriceComparison
): NegotiationPoint[] {
  const points: NegotiationPoint[] = [];

  // Price negotiation if there's a spread
  if (priceComparison.price_spread_percentage > 15) {
    const lowestBid = bids.find((b) => b.bid.id === priceComparison.lowest_bid_id);
    
    points.push({
      topic: 'Price Match Request',
      current_situation: `There is a ${priceComparison.price_spread_percentage.toFixed(0)}% spread between the highest and lowest bids`,
      suggested_ask: `Ask higher-priced contractors if they can match or come closer to the lowest bid of $${lowestBid?.bid.total_bid_amount.toLocaleString()}`,
      potential_savings: priceComparison.price_range,
      leverage_points: [
        `You have ${bids.length} competitive bids`,
        'Lower-priced options are available',
        'You are ready to make a decision',
      ],
      talking_points: [
        `I have received ${bids.length} bids for this project`,
        `The lowest bid is $${lowestBid?.bid.total_bid_amount.toLocaleString()}`,
        'I prefer to work with you based on [reputation/warranty/etc.], but need the price to be more competitive',
      ],
    });
  }

  // Warranty negotiation
  const bestWarranty = bids.reduce((best, curr) => 
    ((curr.bid.labor_warranty_years || 0) + (curr.bid.equipment_warranty_years || 0)) >
    ((best.bid.labor_warranty_years || 0) + (best.bid.equipment_warranty_years || 0))
      ? curr : best
  );

  points.push({
    topic: 'Extended Warranty',
    current_situation: `Best warranty offered is ${bestWarranty.bid.labor_warranty_years || 0} years labor + ${bestWarranty.bid.equipment_warranty_years || 0} years equipment`,
    suggested_ask: 'Request extended labor warranty or ask if additional coverage is available',
    potential_savings: null,
    leverage_points: [
      'A longer warranty demonstrates confidence in work quality',
      'Reduces your long-term risk',
    ],
    talking_points: [
      'I noticed another contractor is offering a longer warranty',
      'Would you be willing to match that warranty term?',
      'What would an extended warranty cost?',
    ],
  });

  // Rebate assistance
  points.push({
    topic: 'Rebate Processing',
    current_situation: 'Federal and local rebates may be available',
    suggested_ask: 'Ask contractor to handle rebate paperwork or reduce price by rebate amount',
    potential_savings: 3500, // Typical rebate amount
    leverage_points: [
      'Contractors familiar with rebates can expedite processing',
      'Some contractors will front rebate amounts',
    ],
    talking_points: [
      'Will you help with the federal tax credit paperwork?',
      'Are you familiar with local utility rebates?',
      'Would you be willing to reduce the upfront cost by the expected rebate amount?',
    ],
  });

  return points;
}

/**
 * Generate a full analysis for a project
 */
export async function generateProjectAnalysis(
  projectId: string,
  weights: WeightedScoreConfig = DEFAULT_WEIGHTS
): Promise<BidAnalysis> {
  const bids = await db.getBidsByProject(projectId);
  
  // Load details for each bid
  const bidsWithDetails: BidWithDetails[] = await Promise.all(
    bids.map(async (bid) => ({
      bid,
      equipment: await db.getEquipmentByBid(bid.id),
      lineItems: await db.getLineItemsByBid(bid.id),
    }))
  );

  if (bidsWithDetails.length === 0) {
    // Create empty analysis
    return db.createAnalysis(projectId, {
      analysis_summary: 'No bids available for analysis. Upload contractor bids to get started.',
      scoring_weights: {
        price: weights.price.weight,
        efficiency: weights.efficiency.weight,
        warranty: weights.warranty.weight,
        reputation: weights.completeness.weight,
        timeline: weights.timeline.weight,
      },
    });
  }

  // Calculate scores
  const scoredBids = await calculateProjectScores(projectId, weights);
  
  // Generate comparisons
  const priceComparison = generatePriceComparison(bidsWithDetails);
  const efficiencyComparison = generateEfficiencyComparison(bidsWithDetails);
  const warrantyComparison = generateWarrantyComparison(bidsWithDetails);

  // Identify issues
  const redFlags = identifyRedFlags(bidsWithDetails);
  const missingInfo = identifyMissingInfo(bidsWithDetails);

  // Generate negotiation points
  const negotiationPoints = generateNegotiationPoints(bidsWithDetails, priceComparison);

  // Determine recommended bid
  const recommendedBid = scoredBids.reduce((best, curr) => 
    curr.scores.overall > best.scores.overall ? curr : best
  );

  // Generate summary
  const summary = generateAnalysisSummary(
    bidsWithDetails,
    priceComparison,
    recommendedBid,
    redFlags
  );

  // Create analysis record
  const analysis = await db.createAnalysis(projectId, {
    analysis_summary: summary,
    scoring_weights: {
      price: weights.price.weight,
      efficiency: weights.efficiency.weight,
      warranty: weights.warranty.weight,
      reputation: weights.completeness.weight,
      timeline: weights.timeline.weight,
    },
    recommended_bid_id: recommendedBid.bid.id,
    recommendation_reasoning: generateRecommendationReasoning(recommendedBid, bidsWithDetails),
    price_comparison: priceComparison,
    efficiency_comparison: efficiencyComparison,
    warranty_comparison: warrantyComparison,
    red_flags: redFlags,
    missing_info: missingInfo,
    negotiation_points: negotiationPoints,
    negotiation_email_template: generateNegotiationEmail(recommendedBid, bidsWithDetails),
    questions_to_ask: generateQuestionsToAsk(bidsWithDetails, missingInfo),
  });

  return analysis;
}

/**
 * Generate analysis summary text
 */
function generateAnalysisSummary(
  bids: BidWithDetails[],
  priceComparison: PriceComparison,
  recommended: BidComparisonTableRow,
  redFlags: RedFlag[]
): string {
  const lines: string[] = [];

  lines.push(`Analysis of ${bids.length} contractor bids for your heat pump project.`);
  lines.push('');
  lines.push(`**Price Range:** $${priceComparison.by_bid[priceComparison.by_bid.length - 1]?.total_amount.toLocaleString() || 'N/A'} to $${priceComparison.by_bid[0]?.total_amount.toLocaleString() || 'N/A'} (${priceComparison.price_spread_percentage.toFixed(0)}% spread)`);
  lines.push(`**Average Price:** $${priceComparison.average_price.toLocaleString()}`);
  lines.push('');
  lines.push(`**Recommended:** ${recommended.bid.contractor_name} with an overall score of ${recommended.scores.overall.toFixed(0)}/100`);
  
  if (redFlags.length > 0) {
    lines.push('');
    lines.push(`**Attention:** ${redFlags.length} potential issue(s) identified across bids.`);
  }

  return lines.join('\n');
}

/**
 * Generate reasoning for the recommendation
 */
function generateRecommendationReasoning(
  recommended: BidComparisonTableRow,
  allBids: BidWithDetails[]
): string {
  const lines: string[] = [];

  lines.push(`${recommended.bid.contractor_name} is recommended based on the weighted scoring analysis.`);
  lines.push('');
  lines.push('**Key factors:**');
  
  // Price position
  const priceRank = allBids
    .sort((a, b) => a.bid.total_bid_amount - b.bid.total_bid_amount)
    .findIndex((b) => b.bid.id === recommended.bid.id) + 1;
  lines.push(`- Ranked #${priceRank} of ${allBids.length} on price`);

  // Warranty
  if (recommended.bid.equipment_warranty_years) {
    lines.push(`- ${recommended.bid.equipment_warranty_years}-year equipment warranty`);
  }

  // Efficiency
  const outdoor = recommended.equipment.find((e) => e.equipment_type === 'outdoor_unit');
  if (outdoor?.seer_rating) {
    lines.push(`- ${outdoor.seer_rating} SEER efficiency rating`);
  }

  // Completeness
  if (recommended.scores.completeness >= 80) {
    lines.push('- Complete bid documentation provided');
  }

  return lines.join('\n');
}

/**
 * Generate negotiation email template
 */
function generateNegotiationEmail(
  recommended: BidComparisonTableRow,
  allBids: BidWithDetails[]
): string {
  const lowestBid = allBids.reduce((low, curr) => 
    curr.bid.total_bid_amount < low.bid.total_bid_amount ? curr : low
  );

  return `Subject: Follow-up on Heat Pump Installation Bid

Dear ${recommended.bid.contractor_name} Team,

Thank you for providing a bid for my heat pump installation project. I've reviewed multiple proposals and am very interested in working with your company.

Your bid of $${recommended.bid.total_bid_amount.toLocaleString()} is competitive, though I've received a lower offer of $${lowestBid.bid.total_bid_amount.toLocaleString()} from another contractor.

I value [your warranty terms / your reputation / the equipment you've proposed], and would prefer to move forward with your company. Would you be able to:

1. Review the pricing to be more competitive with other bids?
2. Include [additional item or service]?
3. Clarify [any questions about the scope]?

I'm planning to make a decision by [DATE] and would appreciate hearing back at your earliest convenience.

Thank you for your time and consideration.

Best regards,
[Your Name]
[Your Phone]`;
}

/**
 * Generate questions to ask contractors
 */
function generateQuestionsToAsk(
  _bids: BidWithDetails[],
  missingInfo: MissingInfo[]
): string[] {
  const questions = new Set<string>();

  // Standard questions
  questions.add('Can you provide references from recent heat pump installations?');
  questions.add('What is your timeline availability for starting the project?');
  questions.add('Do you pull all necessary permits and handle inspections?');
  questions.add('What financing options do you offer?');

  // Questions based on missing info
  const criticalMissing = missingInfo.filter((m) => m.importance === 'critical');
  for (const m of criticalMissing) {
    if (m.missing_field.includes('warranty')) {
      questions.add('What are the specific warranty terms for labor and equipment?');
    }
    if (m.missing_field.includes('license')) {
      questions.add("What is your contractor's license number?");
    }
  }

  // Equipment-specific questions
  questions.add('Is the quoted equipment in stock or what is the lead time?');
  questions.add('What is the sound level of the outdoor unit?');
  questions.add('Does the system qualify for federal tax credits and local rebates?');

  return Array.from(questions);
}
