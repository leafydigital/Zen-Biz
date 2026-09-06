/**
 * Chart colors pulled directly from tailwind.config.ts's brand palette.
 * Recharts needs literal hex strings (SVG fill/stroke props don't accept
 * Tailwind classes), so these are kept in sync by hand with that file.
 */
export const CHART_COLORS = {
  ink: "#2563EB",
  inkLight: "#3B82F6",
  inkDark: "#1D4ED8",
  brass: "#7C3AED",
  brassLight: "#A78BFA",
  success: "#10B981",
  alert: "#EF4444",
  paperFold: "#E2E8F0",
  textSoft: "#64748B",
} as const;

/** Rotation used for multi-slice pie/donut charts and multi-series bars
 * beyond the first two — blue/purple first (brand-forward), then a small
 * set of clearly distinct supporting colors. */
export const CHART_PALETTE = [
  CHART_COLORS.ink,
  CHART_COLORS.brass,
  CHART_COLORS.success,
  CHART_COLORS.brassLight,
  CHART_COLORS.inkLight,
  CHART_COLORS.alert,
];

export function formatInr(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatInrCompact(value: number): string {
  if (Math.abs(value) >= 100000) {
    return `₹${(value / 100000).toFixed(1)}L`;
  }
  if (Math.abs(value) >= 1000) {
    return `₹${(value / 1000).toFixed(1)}K`;
  }
  return `₹${value.toFixed(0)}`;
}
