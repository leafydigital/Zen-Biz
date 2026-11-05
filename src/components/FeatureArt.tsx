const BARS = [2, 1, 1, 3, 1, 2, 2, 1, 3, 1, 1, 2, 1, 1, 3, 2, 1, 2, 1, 3, 2, 1, 1, 2];

function MiniBars({ x, y, h, unit }: { x: number; y: number; h: number; unit: number }) {
  let cx = x;
  return (
    <>
      {BARS.map((w, i) => {
        const r = i % 2 === 0 ? <rect key={i} x={cx} y={y} width={w * unit} height={h} fill="#1A1A1A" /> : null;
        cx += w * unit;
        return r;
      })}
    </>
  );
}

/** A sample GST tax invoice with CGST / SGST lines. */
export function GstInvoiceArt() {
  const rows: [string, string, string, string][] = [
    ["Rice 5 kg", "1006", "2", "₹ 640.00"],
    ["Sugar 1 kg", "1701", "3", "₹ 135.00"],
    ["Tea 250 g", "0902", "1", "₹ 95.00"],
  ];
  return (
    <svg viewBox="0 0 320 240" role="img" aria-labelledby="gstart-t gstart-d" className="h-auto w-full">
      <title id="gstart-t">Sample GST tax invoice</title>
      <desc id="gstart-d">A tax invoice with GSTIN, HSN codes, CGST and SGST split out and a total.</desc>
      <rect width="320" height="240" rx="16" fill="#EEF2FF" />
      <rect x="40" y="14" width="240" height="212" rx="8" fill="#fff" stroke="#E4E0D6" />
      <rect x="40" y="14" width="240" height="30" rx="8" fill="#2563EB" />
      <text x="54" y="33" fontSize="11" fontWeight="700" fill="#fff">TAX INVOICE</text>
      <text x="266" y="33" fontSize="8" fill="#fff" textAnchor="end">INV-0148</text>
      <text x="54" y="58" fontSize="8" fill="#565248">Sunrise Traders · GSTIN 33ABCDE1234F1Z5</text>
      <rect x="52" y="66" width="216" height="14" fill="#F1F5F9" />
      <text x="58" y="76" fontSize="7.5" fontWeight="700" fill="#1A1A1A">Item</text>
      <text x="150" y="76" fontSize="7.5" fontWeight="700" fill="#1A1A1A">HSN</text>
      <text x="196" y="76" fontSize="7.5" fontWeight="700" fill="#1A1A1A">Qty</text>
      <text x="262" y="76" fontSize="7.5" fontWeight="700" fill="#1A1A1A" textAnchor="end">Amount</text>
      {rows.map(([n, h, q, a], i) => (
        <g key={n} transform={`translate(0 ${i * 15})`}>
          <text x="58" y="94" fontSize="8" fill="#1A1A1A">{n}</text>
          <text x="150" y="94" fontSize="8" fill="#565248">{h}</text>
          <text x="198" y="94" fontSize="8" fill="#565248">{q}</text>
          <text x="262" y="94" fontSize="8" fill="#1A1A1A" textAnchor="end">{a}</text>
        </g>
      ))}
      <rect x="52" y="140" width="216" height="1" fill="#E4E0D6" />
      {[
        ["Taxable value", "₹ 870.00"],
        ["CGST 2.5%", "₹ 21.75"],
        ["SGST 2.5%", "₹ 21.75"],
      ].map(([l, v], i) => (
        <g key={l} transform={`translate(0 ${i * 13})`}>
          <text x="150" y="155" fontSize="8" fill="#565248">{l}</text>
          <text x="262" y="155" fontSize="8" fill="#1A1A1A" textAnchor="end">{v}</text>
        </g>
      ))}
      <rect x="52" y="194" width="216" height="22" rx="5" fill="#0F3D3E" />
      <text x="60" y="208" fontSize="9" fontWeight="600" fill="#fff">Total</text>
      <text x="262" y="209" fontSize="11" fontWeight="700" fill="#fff" textAnchor="end">₹ 913.50</text>
    </svg>
  );
}

/** Sticker labels on a two-column sheet, with a printer. */
export function LabelSheetArt() {
  const labels = [
    ["Rice 5 kg", "₹320"],
    ["Sugar 1 kg", "₹45"],
    ["Tea 250 g", "₹95"],
    ["Oil 1 L", "₹140"],
    ["Salt 1 kg", "₹22"],
    ["Dal 500 g", "₹78"],
  ];
  return (
    <svg viewBox="0 0 320 240" role="img" aria-labelledby="lblart-t lblart-d" className="h-auto w-full">
      <title id="lblart-t">Barcode labels printed on a two-column sticker sheet</title>
      <desc id="lblart-d">Six product labels, each with the item name, price and a barcode, laid out in two columns.</desc>
      <rect width="320" height="240" rx="16" fill="#FBF6E3" />
      <rect x="62" y="12" width="196" height="196" rx="6" fill="#fff" stroke="#E4E0D6" />
      {labels.map(([n, p], i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const x = 72 + col * 94;
        const y = 22 + row * 60;
        return (
          <g key={n}>
            <rect x={x} y={y} width="88" height="54" rx="5" fill="#fff" stroke="#9C7D1B" strokeDasharray="3 2" />
            <text x={x + 6} y={y + 12} fontSize="8" fontWeight="600" fill="#1A1A1A">{n}</text>
            <text x={x + 82} y={y + 12} fontSize="8" fontWeight="700" fill="#0F3D3E" textAnchor="end">{p}</text>
            <MiniBars x={x + 8} y={y + 18} h={22} unit={1.5} />
            <text x={x + 44} y={y + 50} fontSize="6" fill="#565248" textAnchor="middle" fontFamily="monospace">200123456789{i}</text>
          </g>
        );
      })}
      <rect x="262" y="150" width="46" height="46" rx="8" fill="#0F3D3E" />
      <path d="M272 162h26v10h-26zM275 172v10h20v-10M275 162v-6h20v6" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" />
      <circle cx="292" cy="176" r="1.6" fill="#4ADE80" />
      <text x="285" y="210" fontSize="8" fill="#565248" textAnchor="middle">Print</text>
    </svg>
  );
}
