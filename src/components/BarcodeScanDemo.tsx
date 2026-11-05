/**
 * "How barcode scanning works" — three illustrated steps (pure SVG, no image
 * files): make the barcode, scan it with the phone camera, the item lands in
 * the bill.
 */

const PATTERN = [2, 1, 1, 3, 1, 2, 2, 1, 3, 1, 1, 2, 1, 1, 3, 2, 1, 2, 1, 3, 2, 1, 1, 2, 3, 1, 2, 1, 1, 3, 1, 2, 2, 1, 1, 2];

function Bars({ x, y, h, unit, color = "#1A1A1A" }: { x: number; y: number; h: number; unit: number; color?: string }) {
  let cx = x;
  return (
    <>
      {PATTERN.map((w, i) => {
        const rect = i % 2 === 0 ? <rect key={i} x={cx} y={y} width={w * unit} height={h} fill={color} /> : null;
        cx += w * unit;
        return rect;
      })}
    </>
  );
}

const STEPS = [
  {
    title: "1. Add an item, the barcode is made for you",
    body: "Every item gets its own unique barcode number automatically. Print stickers in your size (single or double column) and stick them on the products.",
  },
  {
    title: "2. Open Billing and tap Scan barcode",
    body: "Point your phone camera at the sticker. It reads the code in a moment and keeps the camera open so you can scan item after item. A USB or Bluetooth scanner works too.",
  },
  {
    title: "3. The item is added to the bill",
    body: "Each scan adds the item with its price, scanning the same item again adds one more, and the total updates as you go. Then save, share or print the invoice.",
  },
];

export function StepOne() {
  return (
    <svg viewBox="0 0 320 220" role="img" aria-labelledby="bs1-t bs1-d" className="h-auto w-full">
      <title id="bs1-t">Item form with an automatically generated barcode label</title>
      <desc id="bs1-d">An item named Rice 5 kg shows a barcode label and a Print label button.</desc>
      <rect x="0" y="0" width="320" height="220" rx="16" fill="#E9F2ED" />
      <rect x="24" y="22" width="272" height="176" rx="12" fill="#fff" stroke="#E4E0D6" />
      <rect x="40" y="38" width="86" height="9" rx="4" fill="#0F3D3E" />
      <rect x="40" y="56" width="150" height="22" rx="6" fill="#F7F5F0" stroke="#E4E0D6" />
      <text x="48" y="71" fontSize="11" fill="#1A1A1A">Rice 5 kg</text>
      <rect x="200" y="56" width="80" height="22" rx="6" fill="#F7F5F0" stroke="#E4E0D6" />
      <text x="208" y="71" fontSize="11" fill="#1A1A1A">₹ 320</text>
      <rect x="40" y="92" width="150" height="86" rx="8" fill="#fff" stroke="#9C7D1B" strokeDasharray="4 3" />
      <text x="52" y="108" fontSize="9" fill="#565248">Rice 5 kg · ₹320</text>
      <Bars x={54} y={114} h={36} unit={1.5} />
      <text x="56" y="165" fontSize="9" fill="#1A1A1A" fontFamily="monospace">2001234567893</text>
      <rect x="204" y="92" width="76" height="26" rx="7" fill="#0F3D3E" />
      <text x="242" y="109" fontSize="10" fill="#fff" textAnchor="middle" fontWeight="600">Print label</text>
      <rect x="204" y="128" width="76" height="22" rx="6" fill="#fff" stroke="#C9A227" />
      <text x="242" y="143" fontSize="9" fill="#9C7D1B" textAnchor="middle">Auto barcode ✓</text>
    </svg>
  );
}

export function StepTwo() {
  return (
    <svg viewBox="0 0 320 220" role="img" aria-labelledby="bs2-t bs2-d" className="h-auto w-full">
      <title id="bs2-t">A phone camera scanning a product barcode</title>
      <desc id="bs2-d">The phone screen shows a viewfinder with a red scan line over a barcode on a rice bag.</desc>
      <rect x="0" y="0" width="320" height="220" rx="16" fill="#FBF6E3" />
      <rect x="40" y="132" width="110" height="68" rx="8" fill="#fff" stroke="#E4E0D6" />
      <text x="95" y="150" fontSize="10" fill="#565248" textAnchor="middle">Rice 5 kg</text>
      <Bars x={62} y={156} h={26} unit={1.2} />
      <g transform="rotate(-6 210 112)">
        <rect x="150" y="14" width="124" height="196" rx="18" fill="#1A1A1A" />
        <rect x="157" y="26" width="110" height="172" rx="10" fill="#0b1f20" />
        <rect x="190" y="19" width="44" height="5" rx="2.5" fill="#3a3a3a" />
        <rect x="170" y="64" width="84" height="72" rx="6" fill="#fff" />
        <Bars x={180} y={78} h={42} unit={1.5} />
        <path d="M170 76v-12h12M254 76v-12h-12M170 124v12h12M254 124v12h-12" stroke="#4ADE80" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <rect x="166" y="99" width="92" height="2.6" rx="1.3" fill="#EF4444" />
        <text x="212" y="156" fontSize="9" fill="#fff" textAnchor="middle">Point at a barcode</text>
        <rect x="177" y="166" width="70" height="20" rx="6" fill="#0F3D3E" />
        <text x="212" y="179" fontSize="8.5" fill="#fff" textAnchor="middle" fontWeight="600">Scanning…</text>
      </g>
    </svg>
  );
}

export function StepThree() {
  return (
    <svg viewBox="0 0 320 220" role="img" aria-labelledby="bs3-t bs3-d" className="h-auto w-full">
      <title id="bs3-t">Scanned items listed in the bill with a running total</title>
      <desc id="bs3-d">The bill shows Rice 5 kg, Sugar 1 kg and Tea 250 g with a total of ₹ 505.</desc>
      <rect x="0" y="0" width="320" height="220" rx="16" fill="#EEF2FF" />
      <rect x="80" y="12" width="160" height="196" rx="18" fill="#1A1A1A" />
      <rect x="87" y="24" width="146" height="172" rx="10" fill="#fff" />
      <rect x="97" y="32" width="126" height="18" rx="6" fill="#E9F2ED" />
      <text x="160" y="45" fontSize="9" fill="#2E6B4F" textAnchor="middle" fontWeight="600">✓ Added Rice 5 kg</text>
      {[
        ["Rice 5 kg", "× 1", "₹ 320"],
        ["Sugar 1 kg", "× 2", "₹ 90"],
        ["Tea 250 g", "× 1", "₹ 95"],
      ].map(([n, q, a], i) => (
        <g key={n} transform={`translate(0 ${i * 28})`}>
          <rect x="97" y="58" width="126" height="24" rx="6" fill="#F7F5F0" />
          <text x="104" y="73" fontSize="9" fill="#1A1A1A">{n}</text>
          <text x="162" y="73" fontSize="8.5" fill="#565248">{q}</text>
          <text x="216" y="73" fontSize="9" fill="#1A1A1A" textAnchor="end" fontWeight="600">{a}</text>
        </g>
      ))}
      <rect x="97" y="150" width="126" height="1" fill="#E4E0D6" />
      <text x="104" y="166" fontSize="10" fill="#565248">Total</text>
      <text x="216" y="166" fontSize="12" fill="#0F3D3E" textAnchor="end" fontWeight="700">₹ 505</text>
      <rect x="97" y="173" width="126" height="18" rx="7" fill="#0F3D3E" />
      <text x="160" y="185" fontSize="9" fill="#fff" textAnchor="middle" fontWeight="600">Save invoice</text>
    </svg>
  );
}

export function BarcodeScanDemo() {
  const art = [<StepOne key="1" />, <StepTwo key="2" />, <StepThree key="3" />];
  return (
    <ol className="grid gap-5 md:grid-cols-3">
      {STEPS.map((s, i) => (
        <li key={s.title} className="flex flex-col overflow-hidden rounded-xl2 border border-paper-fold bg-white shadow-card">
          {art[i]}
          <div className="p-5">
            <h3 className="font-display text-base font-semibold text-text">{s.title}</h3>
            <p className="mt-2 text-sm text-text-soft">{s.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export const BARCODE_STEPS = STEPS;
