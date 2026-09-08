export interface QuantityUnit {
  code: string;
  label: string;
  description?: string;
  isSystem?: boolean;
}

export const DEFAULT_QUANTITY_UNITS: QuantityUnit[] = [
  { code: 'NOS', label: 'Nos', description: 'Number' },
  { code: 'BAGS', label: 'Bags', description: 'Bags' },
  { code: 'KG', label: 'Kg', description: 'Kilogram' },
  { code: 'QTL', label: 'Qtl', description: 'Quintal' },
  { code: 'LTR', label: 'Ltr', description: 'Liter' },
];

export function normalizeUnitCode(code?: string): string {
  if (!code) return 'QTL';
  const trimmed = code.trim();
  const upper = trimmed.toUpperCase();
  const aliases: Record<string, string> = {
    QUINTAL: 'QTL',
    BAG: 'BAGS',
    KILOGRAM: 'KG',
    KGS: 'KG',
    LITER: 'LTR',
    LITRE: 'LTR',
    NUMBER: 'NOS',
    NUMBERS: 'NOS',
  };
  return aliases[upper] || upper;
}

export function getUnitLabel(code?: string, units: QuantityUnit[] = DEFAULT_QUANTITY_UNITS): string {
  const normalized = normalizeUnitCode(code);
  return units.find((u) => u.code === normalized)?.label || code || 'Qtl';
}

export function getUnitDescription(code?: string, units: QuantityUnit[] = DEFAULT_QUANTITY_UNITS): string {
  const normalized = normalizeUnitCode(code);
  return units.find((u) => u.code === normalized)?.description || getUnitLabel(code, units);
}

export function getQuantityDecimals(code?: string): number {
  const normalized = normalizeUnitCode(code);
  if (normalized === 'NOS' || normalized === 'BAGS') return 0;
  return 3;
}

export function formatQuantityWithUnit(
  quantity: number,
  unitCode?: string,
  units: QuantityUnit[] = DEFAULT_QUANTITY_UNITS,
): string {
  const decimals = getQuantityDecimals(unitCode);
  const label = getUnitLabel(unitCode, units);
  return `${quantity.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })} ${label}`;
}

export function formatUnitNote(unitCode?: string, units: QuantityUnit[] = DEFAULT_QUANTITY_UNITS): string {
  const label = getUnitLabel(unitCode, units);
  return `The data is in ${label}.`;
}

/** Map product quantityFormat code → GP / UI display unit (Feedback 23) */
export function productFormatToUnit(
  code?: string,
  units: QuantityUnit[] = DEFAULT_QUANTITY_UNITS,
): string {
  const normalized = normalizeUnitCode(code);
  // Prefer canonical display labels used across GP / inventory
  if (normalized === 'NOS') return 'Nos';
  if (normalized === 'BAGS') return 'Bags';
  if (normalized === 'KG') return 'Kg';
  if (normalized === 'QTL') return 'Quintal';
  if (normalized === 'LTR') return 'Ltr';
  return getUnitLabel(normalized, units);
}

/** Options for GP item unit dropdown: product units + Bags/Quintal (Feedback 11 + 23) */
export function getGatePassUnitOptions(units: QuantityUnit[] = DEFAULT_QUANTITY_UNITS): string[] {
  const fromDb = units.map((u) => productFormatToUnit(u.code, units));
  const extras = ['Bags', 'Quintal', 'Nos', 'Kg', 'Ltr'];
  return Array.from(new Set([...fromDb, ...extras]));
}
