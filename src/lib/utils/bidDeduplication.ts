import type { Bid, BidEquipment, BidScope, BidContractor, BidScore } from '../types';

export interface BidEntry {
  bid: Bid;
  equipment: BidEquipment[];
  scope?: BidScope | null;
  contractor?: BidContractor | null;
  scores?: BidScore | null;
}

export interface DeduplicatedBidEntry extends BidEntry {
  mergedBidCount?: number;
}

export const PLACEHOLDER_NAMES = new Set(['tbd', 'unknown', 'unknown contractor', '']);

/**
 * Return a display-friendly contractor name.
 * Prefers the researched name from bid_contractors, falls back to
 * bids.contractor_name, then a numbered label.
 */
export function getContractorDisplayName(
  name: string | null | undefined,
  index?: number,
  contractor?: { name?: string | null } | null
): string {
  // Prefer the researched name from bid_contractors
  const contractorName = contractor?.name?.trim();
  if (contractorName && !PLACEHOLDER_NAMES.has(contractorName.toLowerCase())) {
    return contractorName;
  }
  // Fall back to bids.contractor_name
  const trimmed = (name || '').trim();
  const lower = trimmed.toLowerCase();
  if (!trimmed || PLACEHOLDER_NAMES.has(lower)) {
    return index != null ? `Contractor ${index + 1}` : 'Contractor';
  }
  return trimmed;
}

/**
 * Deduplicate bids by contractor name — if the same company submitted multiple PDFs,
 * merge them into one column using the bid that has the most data.
 */
export function deduplicateBids(bids: BidEntry[]): DeduplicatedBidEntry[] {
  const seen = new Map<string, DeduplicatedBidEntry>();

  for (const b of bids) {
    const contractorKey = b.contractor?.name?.trim().toLowerCase();
    const rawKey = contractorKey || (b.bid.contractor_name || '').trim().toLowerCase();
    const key = !rawKey || PLACEHOLDER_NAMES.has(rawKey) ? `__unnamed_${b.bid.id}` : rawKey;
    const existing = seen.get(key);

    if (!existing) {
      seen.set(key, { ...b, mergedBidCount: 1 });
    } else {
      const existingHasScope = !!existing.scope;
      const incomingHasScope = !!b.scope;
      let winner: DeduplicatedBidEntry = existing;

      if (!existingHasScope && incomingHasScope) {
        winner = { ...b, mergedBidCount: (existing.mergedBidCount || 1) + 1 };
      } else if (existingHasScope && incomingHasScope) {
        const existingAmount = existing.scope?.total_bid_amount ?? 0;
        const incomingAmount = b.scope?.total_bid_amount ?? 0;
        winner = {
          ...(incomingAmount > existingAmount ? b : existing),
          mergedBidCount: (existing.mergedBidCount || 1) + 1,
        };
      } else {
        winner = { ...existing, mergedBidCount: (existing.mergedBidCount || 1) + 1 };
      }
      seen.set(key, winner);
    }
  }

  return Array.from(seen.values());
}
