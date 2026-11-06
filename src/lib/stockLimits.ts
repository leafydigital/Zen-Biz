/** Low-stock limits: one default plus an optional limit per unit (piece, kg, g, litre...). A unit can be switched off. */
export const DEFAULT_LOW_STOCK = 5;

/** Per unit: a number = limit, null = alerts switched off for that unit. */
export type UnitLimits = Record<string, number | null>;
export type StockLimits = { defaultLimit: number; byUnit: UnitLimits };

export const unitKey = (unit: string | null | undefined) => (unit ?? "").trim().toLowerCase();

export function getStockLimits(
  defaultLimit: number | null | undefined,
  byUnit: Record<string, number | null> | null | undefined
): StockLimits {
  const clean: UnitLimits = {};
  for (const [k, v] of Object.entries(byUnit ?? {})) {
    if (!k.trim()) continue;
    if (v === null) clean[unitKey(k)] = null;
    else if (Number.isFinite(Number(v)) && Number(v) >= 0) clean[unitKey(k)] = Number(v);
  }
  return { defaultLimit: defaultLimit ?? DEFAULT_LOW_STOCK, byUnit: clean };
}

/** The limit for an item sold in this unit, or null when alerts are off for that unit. */
export function limitFor(limits: StockLimits, unit: string | null | undefined): number | null {
  const k = unitKey(unit);
  return k in limits.byUnit ? limits.byUnit[k] : limits.defaultLimit;
}

export function isLow(limits: StockLimits, qty: number | null, unit: string | null | undefined): boolean {
  const lim = limitFor(limits, unit);
  return qty !== null && lim !== null && qty > 0 && qty <= lim;
}

/** Low or out of stock, and alerts are on for the unit. */
export function needsAttention(limits: StockLimits, qty: number | null, unit: string | null | undefined): boolean {
  const lim = limitFor(limits, unit);
  return qty !== null && lim !== null && qty <= lim;
}
