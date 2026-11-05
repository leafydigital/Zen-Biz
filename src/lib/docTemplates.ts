/**
 * Ready-made document layouts. Simple and Colourful stay exactly as they
 * were; these are extra, completely different layouts (Professional and
 * Business plans). Each template is a different arrangement of the header,
 * customer block, item table, totals and footer, not just another colour.
 */

export type TplHeader = "left" | "center" | "band" | "split" | "sidebar" | "minimal";
export type TplParties = "cards" | "bar" | "table" | "stacked" | "inline";
export type TplTable = "grid" | "zebra" | "lines" | "minimal" | "solid";
export type TplTotals = "box" | "bar" | "plain";
export type TplFooter = "boxed" | "three" | "stacked";

export interface DocTemplate {
  id: string;
  name: string;
  hint: string;
  /** Starting colour (the owner can change it). */
  accent: string;
  font: "helvetica" | "times" | "courier";
  header: TplHeader;
  parties: TplParties;
  table: TplTable;
  totals: TplTotals;
  footer: TplFooter;
}

export const DOC_TEMPLATES: DocTemplate[] = [
  { id: "t1", name: "Template 1", hint: "Line header, ruled table", accent: "#1d4ed8", font: "helvetica", header: "left", parties: "table", table: "lines", totals: "box", footer: "boxed" },
  { id: "t2", name: "Template 2", hint: "Full colour band, cards", accent: "#0f766e", font: "helvetica", header: "band", parties: "cards", table: "solid", totals: "bar", footer: "three" },
  { id: "t3", name: "Template 3", hint: "Centered, clean and light", accent: "#7e22ce", font: "times", header: "center", parties: "stacked", table: "minimal", totals: "plain", footer: "stacked" },
  { id: "t4", name: "Template 4", hint: "Big title on the right", accent: "#c2410c", font: "helvetica", header: "split", parties: "bar", table: "zebra", totals: "box", footer: "boxed" },
  { id: "t5", name: "Template 5", hint: "Colour sidebar", accent: "#166534", font: "helvetica", header: "sidebar", parties: "stacked", table: "lines", totals: "plain", footer: "stacked" },
  { id: "t6", name: "Template 6", hint: "Classic grid form", accent: "#b91c1c", font: "helvetica", header: "left", parties: "table", table: "grid", totals: "bar", footer: "boxed" },
  { id: "t7", name: "Template 7", hint: "Modern soft cards", accent: "#0369a1", font: "helvetica", header: "minimal", parties: "cards", table: "zebra", totals: "box", footer: "three" },
  { id: "t8", name: "Template 8", hint: "Elegant serif", accent: "#a16207", font: "times", header: "center", parties: "inline", table: "minimal", totals: "plain", footer: "three" },
  { id: "t9", name: "Template 9", hint: "Bold dark band", accent: "#1e293b", font: "helvetica", header: "band", parties: "bar", table: "solid", totals: "bar", footer: "boxed" },
  { id: "t10", name: "Template 10", hint: "Compact, saves space", accent: "#be185d", font: "helvetica", header: "split", parties: "inline", table: "grid", totals: "plain", footer: "stacked" },
];

export function getDocTemplate(id: string | undefined): DocTemplate | null {
  return DOC_TEMPLATES.find((t) => t.id === id) ?? null;
}

/** Receipt layouts for thermal printers (black and white). */
export interface ThermalTemplate {
  id: string;
  name: string;
  hint: string;
  rule: "dash" | "solid" | "double" | "stars" | "equals";
  align: "center" | "left";
  /** Business name on a black bar. */
  invertHeader: boolean;
  /** How each item is printed. */
  items: "three" | "two" | "one" | "grid";
  /** The grand total. */
  total: "plain" | "box" | "inverted" | "big";
  /** Whole receipt inside a frame. */
  border: boolean;
  /** Fewer lines: no currency row, no amount in words. */
  compact: boolean;
  /** Bill number and date on one line. */
  metaInline: boolean;
}

export const THERMAL_TEMPLATES: ThermalTemplate[] = [
  { id: "t1", name: "Template 1", hint: "Centered, item and price lines", rule: "dash", align: "center", invertHeader: false, items: "one", total: "big", border: false, compact: false, metaInline: true },
  { id: "t2", name: "Template 2", hint: "Black bars, two-line items", rule: "solid", align: "center", invertHeader: true, items: "two", total: "inverted", border: false, compact: false, metaInline: false },
  { id: "t3", name: "Template 3", hint: "Left aligned, very short", rule: "dash", align: "left", invertHeader: false, items: "one", total: "plain", border: false, compact: true, metaInline: true },
  { id: "t4", name: "Template 4", hint: "Framed, item table", rule: "double", align: "center", invertHeader: false, items: "grid", total: "box", border: true, compact: false, metaInline: false },
  { id: "t5", name: "Template 5", hint: "Star lines, big total", rule: "stars", align: "center", invertHeader: false, items: "two", total: "big", border: false, compact: false, metaInline: true },
  { id: "t6", name: "Template 6", hint: "Equals lines, boxed total", rule: "equals", align: "center", invertHeader: false, items: "three", total: "box", border: false, compact: false, metaInline: false },
  { id: "t7", name: "Template 7", hint: "Left, black bars, one-line items", rule: "solid", align: "left", invertHeader: true, items: "one", total: "inverted", border: false, compact: false, metaInline: true },
  { id: "t8", name: "Template 8", hint: "Framed, two-line items, big total", rule: "double", align: "center", invertHeader: false, items: "two", total: "big", border: true, compact: false, metaInline: true },
  { id: "t9", name: "Template 9", hint: "Compact item table", rule: "dash", align: "left", invertHeader: false, items: "grid", total: "box", border: false, compact: true, metaInline: true },
  { id: "t10", name: "Template 10", hint: "Framed, star lines, black total", rule: "stars", align: "center", invertHeader: true, items: "three", total: "inverted", border: true, compact: false, metaInline: false },
];

export function getThermalTemplate(id: string | undefined): ThermalTemplate | null {
  return THERMAL_TEMPLATES.find((t) => t.id === id) ?? null;
}
