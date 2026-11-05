import type { DocCustomOptions, DocDesignSettings, DocStyle } from "@/types/database";
import { DEFAULT_CUSTOM_OPTIONS } from "@/types/database";

export type ResolvedStyle = "simple" | "colourful" | "custom";
export type RGB = [number, number, number];

export const DEFAULT_ACCENT = "#1d4ed8";

export const ACCENT_PRESETS: { name: string; hex: string }[] = [
  { name: "Blue", hex: "#1d4ed8" },
  { name: "Teal", hex: "#0f766e" },
  { name: "Green", hex: "#15803d" },
  { name: "Purple", hex: "#7e22ce" },
  { name: "Red", hex: "#b91c1c" },
  { name: "Orange", hex: "#c2410c" },
  { name: "Navy", hex: "#1e3a5f" },
  { name: "Charcoal", hex: "#374151" },
];

/** Old saved values map onto the three current styles. */
export function normalizeStyle(style: DocStyle | string | undefined): ResolvedStyle {
  switch (style) {
    case "template":
    case "colourful":
    case "colourful_paid":
    case "default":
      return "colourful";
    case "custom":
      return "custom";
    default:
      return "simple";
  }
}

export function hexToRgb(hex: string | undefined): RGB {
  const m = /^#?([0-9a-f]{6})$/i.exec((hex ?? "").trim());
  const h = m ? m[1] : DEFAULT_ACCENT.slice(1);
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** Blend a colour toward white. amount 0 = original, 1 = white. */
export function lighten(rgb: RGB, amount: number): RGB {
  return rgb.map((c) => Math.round(c + (255 - c) * amount)) as RGB;
}

export function customOptions(design: DocDesignSettings): DocCustomOptions {
  return { ...DEFAULT_CUSTOM_OPTIONS, ...(design.custom ?? {}) };
}
