export const LABEL_COL_WIDTH = '200px';
export const BID_COL_MIN_WIDTH = '180px';

/**
 * Find the best (highest or lowest) value from a set of nullable numbers.
 * Used for highlighting "BEST" badges in comparison tables.
 */
export function getHighestValue(
  values: (number | null | undefined)[],
  higherIsBetter = true
): number | null {
  const validValues = values.filter((v): v is number => v != null);
  if (validValues.length === 0) return null;
  return higherIsBetter ? Math.max(...validValues) : Math.min(...validValues);
}

/**
 * Check if a value matches the best value for highlighting.
 */
export function isHighlighted(
  value: number | null | undefined,
  bestValue: number | null
): boolean {
  if (value == null || bestValue == null) return false;
  return value === bestValue;
}

export const SCOPE_ITEMS = [
  { key: 'permit', detailKey: 'permitDetail', label: 'Permits & Filing' },
  { key: 'disposal', detailKey: 'disposalDetail', label: 'Old Equipment Disposal' },
  { key: 'electrical', detailKey: 'electricalDetail', label: 'Electrical Work' },
  { key: 'disconnect', detailKey: 'disconnectDetail', label: 'Electrical Disconnect' },
  { key: 'ductwork', detailKey: 'ductworkDetail', label: 'Ductwork Modifications' },
  { key: 'thermostat', detailKey: 'thermostatDetail', label: 'Thermostat' },
  { key: 'manualJ', detailKey: 'manualJDetail', label: 'Manual J Calculation' },
  { key: 'commissioning', detailKey: 'commissioningDetail', label: 'System Commissioning' },
  { key: 'airHandler', detailKey: 'airHandlerDetail', label: 'Air Handler' },
  { key: 'lineSet', detailKey: 'lineSetDetail', label: 'Refrigerant Line Set' },
  { key: 'pad', detailKey: 'padDetail', label: 'Equipment Pad' },
  { key: 'drainLine', detailKey: 'drainLineDetail', label: 'Condensate Drain Line' },
] as const;
