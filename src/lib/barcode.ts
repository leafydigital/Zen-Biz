import JsBarcode from "jsbarcode";

/**
 * Barcode helpers: unique EAN-13 number generation and label (sticker) layout
 * settings. Label size/design is saved per business in businesses.barcode_settings.
 */

export interface BarcodeSettings {
  /** "roll" = sticker roll (one row of labels per page), "sheet" = A4 sticker sheet. */
  paperType: "roll" | "sheet";
  presetId: string;
  /** Labels across the paper: 1, 2, 3 ... */
  columns: number;
  labelWidth: number; // mm
  labelHeight: number; // mm
  gapX: number; // mm between labels across
  gapY: number; // mm between labels down
  marginX: number; // mm left/right of the paper
  marginY: number; // mm top/bottom of the paper
  format: "EAN13" | "CODE128";
  barHeight: number; // % of the label height used by the bars
  barWidth: number; // 1 (thin) .. 4 (thick) bar module width
  fontSize: number; // pt
  showBusiness: boolean;
  showName: boolean;
  showPrice: boolean;
  showCode: boolean;
  align: "left" | "center";
}

export interface LabelPreset {
  id: string;
  label: string;
  paperType: "roll" | "sheet";
  columns: number;
  labelWidth: number;
  labelHeight: number;
  gapX: number;
  gapY: number;
  marginX: number;
  marginY: number;
}

export const LABEL_PRESETS: LabelPreset[] = [
  { id: "roll-50x25-1", label: "Roll · 1 column · 50 × 25 mm", paperType: "roll", columns: 1, labelWidth: 50, labelHeight: 25, gapX: 0, gapY: 2, marginX: 0, marginY: 0 },
  { id: "roll-38x25-2", label: "Roll · 2 columns · 38 × 25 mm each", paperType: "roll", columns: 2, labelWidth: 38, labelHeight: 25, gapX: 2, gapY: 2, marginX: 1, marginY: 0 },
  { id: "roll-50x25-2", label: "Roll · 2 columns · 50 × 25 mm each", paperType: "roll", columns: 2, labelWidth: 50, labelHeight: 25, gapX: 2, gapY: 2, marginX: 1, marginY: 0 },
  { id: "roll-33x15-3", label: "Roll · 3 columns · 33 × 15 mm each", paperType: "roll", columns: 3, labelWidth: 33, labelHeight: 15, gapX: 2, gapY: 2, marginX: 1, marginY: 0 },
  { id: "roll-75x50-1", label: "Roll · 1 column · 75 × 50 mm", paperType: "roll", columns: 1, labelWidth: 75, labelHeight: 50, gapX: 0, gapY: 3, marginX: 0, marginY: 0 },
  { id: "a4-65", label: "A4 sheet · 5 × 13 · 38 × 21 mm (65 labels)", paperType: "sheet", columns: 5, labelWidth: 38, labelHeight: 21, gapX: 2.5, gapY: 0, marginX: 8, marginY: 11 },
  { id: "a4-24", label: "A4 sheet · 3 × 8 · 63 × 34 mm (24 labels)", paperType: "sheet", columns: 3, labelWidth: 63, labelHeight: 34, gapX: 2.5, gapY: 0, marginX: 8, marginY: 13 },
  { id: "custom", label: "Custom size", paperType: "roll", columns: 1, labelWidth: 50, labelHeight: 25, gapX: 0, gapY: 2, marginX: 0, marginY: 0 },
];

export const DEFAULT_BARCODE_SETTINGS: BarcodeSettings = {
  paperType: "roll",
  presetId: "roll-50x25-1",
  columns: 1,
  labelWidth: 50,
  labelHeight: 25,
  gapX: 0,
  gapY: 2,
  marginX: 0,
  marginY: 0,
  format: "EAN13",
  barHeight: 45,
  barWidth: 2,
  fontSize: 7,
  showBusiness: true,
  showName: true,
  showPrice: true,
  showCode: true,
  align: "center",
};

const num = (v: unknown, fallback: number, min: number, max: number) => {
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

/** Fills gaps and clamps values so a half-saved or hand-edited setting never breaks printing. */
export function getBarcodeSettings(stored?: Partial<BarcodeSettings> | null): BarcodeSettings {
  const d = DEFAULT_BARCODE_SETTINGS;
  const s = { ...d, ...(stored ?? {}) };
  return {
    paperType: s.paperType === "sheet" ? "sheet" : "roll",
    presetId: typeof s.presetId === "string" ? s.presetId : d.presetId,
    columns: Math.round(num(s.columns, d.columns, 1, 6)),
    labelWidth: num(s.labelWidth, d.labelWidth, 15, 210),
    labelHeight: num(s.labelHeight, d.labelHeight, 10, 200),
    gapX: num(s.gapX, d.gapX, 0, 30),
    gapY: num(s.gapY, d.gapY, 0, 30),
    marginX: num(s.marginX, d.marginX, 0, 40),
    marginY: num(s.marginY, d.marginY, 0, 40),
    format: s.format === "CODE128" ? "CODE128" : "EAN13",
    barHeight: num(s.barHeight, d.barHeight, 20, 80),
    barWidth: num(s.barWidth, d.barWidth, 1, 4),
    fontSize: num(s.fontSize, d.fontSize, 4, 16),
    showBusiness: s.showBusiness !== false,
    showName: s.showName !== false,
    showPrice: s.showPrice !== false,
    showCode: s.showCode !== false,
    align: s.align === "left" ? "left" : "center",
  };
}

/** Paper width in mm: sheets are A4, rolls are exactly as wide as the labels across. */
export function paperSize(s: BarcodeSettings): { width: number; height: number } {
  if (s.paperType === "sheet") return { width: 210, height: 297 };
  return {
    width: s.marginX * 2 + s.columns * s.labelWidth + (s.columns - 1) * s.gapX,
    height: s.labelHeight + s.gapY,
  };
}

// ── EAN-13 ────────────────────────────────────────────────────────────────

export function ean13CheckDigit(first12: string): number {
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(first12[i]) * (i % 2 === 0 ? 1 : 3);
  return (10 - (sum % 10)) % 10;
}

export function isValidEan13(code: string): boolean {
  return /^\d{13}$/.test(code) && ean13CheckDigit(code.slice(0, 12)) === Number(code[12]);
}

/** Standard 13-digit number. "200" is the range reserved for in-store codes, so it never clashes with manufacturer barcodes. */
export function randomEan13(): string {
  const buf = new Uint32Array(3);
  crypto.getRandomValues(buf);
  const body = "200" + String((buf[0] * 31 + buf[1] * 17 + buf[2]) % 1_000_000_000).padStart(9, "0");
  return body + ean13CheckDigit(body);
}

interface CodeLookup {
  from: (t: any) => any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

/** True if another item of this business already uses this code. */
export async function isCodeTaken(supabase: CodeLookup, businessId: string, code: string, exceptProductId?: string) {
  let q = supabase.from("products").select("id").eq("business_id", businessId).eq("item_code", code).limit(1);
  if (exceptProductId) q = q.neq("id", exceptProductId);
  const { data } = await q;
  return (data?.length ?? 0) > 0;
}

/** A new EAN-13 that no item in this business uses. `avoid` holds codes handed out but not saved yet. */
export async function generateUniqueBarcode(supabase: CodeLookup, businessId: string, avoid: string[] = []) {
  for (let i = 0; i < 20; i++) {
    const code = randomEan13();
    if (avoid.includes(code)) continue;
    if (!(await isCodeTaken(supabase, businessId, code))) return code;
  }
  throw new Error("Could not generate a unique barcode. Please try again.");
}

// ── Drawing ───────────────────────────────────────────────────────────────

/** Which symbology to draw this code with: EAN-13 only when the number really is a valid EAN-13. */
export function formatFor(code: string, wanted: BarcodeSettings["format"]): "EAN13" | "CODE128" {
  return wanted === "EAN13" && isValidEan13(code) ? "EAN13" : "CODE128";
}

/** Barcode as an SVG string (for previews). No human-readable text; the label prints it itself. */
export function barcodeSvg(code: string, s: BarcodeSettings): string {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  JsBarcode(svg, code, {
    format: formatFor(code, s.format),
    width: s.barWidth,
    height: 60,
    displayValue: false,
    margin: 0,
    background: "transparent",
  });
  svg.setAttribute("preserveAspectRatio", "none");
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
  return svg.outerHTML;
}

function barcodePng(code: string, s: BarcodeSettings): { url: string; ratio: number } {
  const canvas = document.createElement("canvas");
  JsBarcode(canvas, code, {
    format: formatFor(code, s.format),
    width: Math.max(2, s.barWidth * 2),
    height: 120,
    displayValue: false,
    margin: 0,
    background: "#ffffff",
  });
  return { url: canvas.toDataURL("image/png"), ratio: canvas.width / canvas.height };
}

export interface LabelItem {
  name: string;
  price: number | null;
  code: string;
}

export function labelLayout(s: BarcodeSettings) {
  const pad = Math.min(1.5, s.labelWidth * 0.04);
  const lineH = (s.fontSize * 0.3528) * 1.25; // pt -> mm line height
  // The bars never grow past the room left after the text lines, so nothing overlaps.
  const lines = [s.showBusiness, s.showName, s.showCode, s.showPrice].filter(Boolean).length;
  const free = s.labelHeight - pad * 2 - lines * lineH - 0.6;
  const barH = Math.max(3, Math.min(free, (s.labelHeight - pad * 2) * (s.barHeight / 100)));
  /** Bars are drawn a little narrower than the label so they never touch its edge. */
  const barW = (s.labelWidth - pad * 2) * 0.92;
  return { pad, lineH, barH, barW };
}

/** Builds the label PDF. `copies` labels are made for each item. */
export async function generateLabelsPdf(
  items: { item: LabelItem; copies: number }[],
  s: BarcodeSettings,
  businessName: string
): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const paper = paperSize(s);
  const doc = new jsPDF({
    unit: "mm",
    format: [paper.width, paper.height],
    orientation: paper.width > paper.height ? "landscape" : "portrait",
  });

  const labels: LabelItem[] = [];
  for (const { item, copies } of items) for (let i = 0; i < Math.max(1, copies); i++) labels.push(item);

  const { pad, lineH, barH, barW } = labelLayout(s);
  const rowsPerPage =
    s.paperType === "sheet"
      ? Math.max(1, Math.floor((paper.height - s.marginY * 2 + s.gapY) / (s.labelHeight + s.gapY)))
      : 1;
  const perPage = rowsPerPage * s.columns;
  const fmt = (n: number) => `Rs. ${Number.isInteger(n) ? n : n.toFixed(2)}`;

  labels.forEach((label, i) => {
    const idxOnPage = i % perPage;
    if (i > 0 && idxOnPage === 0) doc.addPage([paper.width, paper.height]);
    const col = idxOnPage % s.columns;
    const row = Math.floor(idxOnPage / s.columns);
    const x = s.marginX + col * (s.labelWidth + s.gapX);
    const y = (s.paperType === "sheet" ? s.marginY : 0) + row * (s.labelHeight + s.gapY);

    const innerW = s.labelWidth - pad * 2;
    const cx = s.align === "center" ? x + s.labelWidth / 2 : x + pad;
    const opts = { align: s.align } as const;
    let cy = y + pad;
    doc.setFontSize(s.fontSize);
    doc.setTextColor(0, 0, 0);

    const textLine = (text: string, bold = false) => {
      doc.setFont("helvetica", bold ? "bold" : "normal");
      let t = text;
      while (t.length > 1 && doc.getTextWidth(t) > innerW) t = t.slice(0, -1);
      cy += lineH * 0.8;
      doc.text(t, cx, cy, opts);
      cy += lineH * 0.2;
    };

    if (s.showBusiness && businessName) textLine(businessName, true);
    if (s.showName) textLine(label.name);

    const bars = barcodePng(label.code, s);
    const textBelow = (s.showCode ? lineH : 0) + (s.showPrice ? lineH : 0);
    const availH = Math.max(4, y + s.labelHeight - pad - cy - textBelow);
    const h = Math.min(barH, availH);
    const w = barW;
    const bx = s.align === "center" ? x + (s.labelWidth - w) / 2 : x + pad;
    doc.addImage(bars.url, "PNG", bx, cy + 0.3, w, h);
    cy += h + 0.6;

    if (s.showCode) textLine(label.code);
    if (s.showPrice && label.price != null) textLine(fmt(label.price), true);
  });

  return doc.output("blob");
}

const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** Same layout as the PDF, as a web page with exact mm sizes, so the browser prints it at true label size. */
function labelsHtml(items: { item: LabelItem; copies: number }[], s: BarcodeSettings, businessName: string): string {
  const paper = paperSize(s);
  const labels: LabelItem[] = [];
  for (const { item, copies } of items) for (let i = 0; i < Math.max(1, copies); i++) labels.push(item);
  const { pad, lineH, barH, barW } = labelLayout(s);
  const rowsPerPage =
    s.paperType === "sheet"
      ? Math.max(1, Math.floor((paper.height - s.marginY * 2 + s.gapY) / (s.labelHeight + s.gapY)))
      : 1;
  const perPage = rowsPerPage * s.columns;
  const pages: string[] = [];
  labels.forEach((label, i) => {
    const idx = i % perPage;
    if (idx === 0) pages.push("");
    const col = idx % s.columns;
    const row = Math.floor(idx / s.columns);
    const x = s.marginX + col * (s.labelWidth + s.gapX);
    const y = (s.paperType === "sheet" ? s.marginY : 0) + row * (s.labelHeight + s.gapY);
    const bars = barcodePng(label.code, s);
    const w = barW;
    pages[pages.length - 1] +=
      `<div class="l" style="left:${x}mm;top:${y}mm;width:${s.labelWidth}mm;height:${s.labelHeight}mm;padding:${pad}mm;text-align:${s.align};font-size:${s.fontSize}pt;line-height:${lineH}mm">` +
      (s.showBusiness && businessName ? `<div class="t b">${esc(businessName)}</div>` : "") +
      (s.showName ? `<div class="t">${esc(label.name)}</div>` : "") +
      `<img src="${bars.url}" style="display:block;height:${barH}mm;width:${w}mm;margin:0.3mm ${s.align === "center" ? "auto" : "0"}">` +
      (s.showCode ? `<div class="t">${esc(label.code)}</div>` : "") +
      (s.showPrice && label.price != null ? `<div class="t b">Rs. ${Number.isInteger(label.price) ? label.price : label.price.toFixed(2)}</div>` : "") +
      "</div>";
  });
  return `<!doctype html><html><head><meta charset="utf-8"><title>Labels</title><style>
@page{size:${paper.width}mm ${paper.height}mm;margin:0}
*{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff}
.p{position:relative;width:${paper.width}mm;height:${paper.height}mm;overflow:hidden;page-break-after:always;break-after:page}
.p:last-child{page-break-after:auto;break-after:auto}
.l{position:absolute;overflow:hidden;font-family:Arial,Helvetica,sans-serif;color:#000}
.t{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.b{font-weight:bold}
img{image-rendering:pixelated}
</style></head><body>${pages.map((p) => `<div class="p">${p}</div>`).join("")}</body></html>`;
}

/**
 * Computer: opens the print dialog with the labels at their exact size.
 * Phone app: there is no print dialog there, so the labels are made as a PDF and shared/saved.
 */
export async function printLabelItems(items: { item: LabelItem; copies: number }[], s: BarcodeSettings, businessName: string, filename: string) {
  const isNative = Boolean((window as any).Capacitor?.isNativePlatform?.()); // eslint-disable-line @typescript-eslint/no-explicit-any
  if (isNative || /Android|iPhone|iPad/i.test(navigator.userAgent)) {
    await sharePdf(await generateLabelsPdf(items, s, businessName), filename);
    return;
  }
  const frame = document.createElement("iframe");
  frame.style.cssText = "position:fixed;left:-10000px;top:0;width:800px;height:600px;border:0;";
  document.body.appendChild(frame);
  const doc = frame.contentDocument!;
  doc.open();
  doc.write(labelsHtml(items, s, businessName));
  doc.close();
  // Wait for the barcode images to be ready, then print.
  const imgs = Array.from(doc.images);
  await Promise.all(imgs.map((im) => (im.complete ? Promise.resolve() : new Promise((r) => { im.onload = im.onerror = () => r(null); }))));
  frame.contentWindow!.focus();
  frame.contentWindow!.print();
  setTimeout(() => frame.remove(), 120_000);
}

async function sharePdf(blob: Blob, filename: string) {
  const file = new File([blob], filename, { type: "application/pdf" });
  const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
  try {
    if (nav.canShare?.({ files: [file] })) {
      await nav.share({ files: [file], title: filename });
      return;
    }
  } catch (err) {
    if ((err as Error)?.name === "AbortError") return;
  }
  const a = document.createElement("a");
  const url = URL.createObjectURL(blob);
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
