/**
 * Look-alike screens of the real app (billing, stock, invoice), drawn at a fixed
 * 640 x 400 so they can be scaled to any width. Used in the home page hero and
 * the Demo section until real screenshots are dropped into /public/demo.
 */

const ink = "#0F3D3E";

export function Sidebar({ active }: { active: string }) {
  const items = ["Overview", "Items", "Stock", "Customers", "Invoices", "Billing"];
  return (
    <div className="flex w-[116px] shrink-0 flex-col gap-1 border-r border-slate-200 bg-white p-3">
      <div className="mb-3 flex items-center gap-1.5">
        <span className="flex h-5 w-5 items-center justify-center rounded-md bg-blue-600 text-[10px] font-bold text-white">Z</span>
        <span className="text-[12px] font-semibold" style={{ color: ink }}>Zen Biz</span>
      </div>
      {items.map((i) => (
        <span key={i} className={`rounded-md px-2 py-1.5 text-[10px] ${i === active ? "bg-blue-50 font-semibold text-blue-700" : "text-slate-500"}`}>
          {i}
        </span>
      ))}
    </div>
  );
}

export function WindowFrame({ url, children }: { url: string; children: React.ReactNode }) {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-xl">
      <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-slate-300" />
        <span className="h-2 w-2 rounded-full bg-slate-300" />
        <span className="h-2 w-2 rounded-full bg-slate-300" />
        <span className="ml-2 rounded-full border border-slate-200 px-3 py-0.5 text-[9px] text-slate-500">{url}</span>
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}

const ITEMS: [string, string][] = [
  ["Rice 5 kg", "₹320"],
  ["Sugar 1 kg", "₹45"],
  ["Tea 250 g", "₹95"],
  ["Cola 600 ml", "₹40"],
  ["Biscuits", "₹30"],
  ["Oil 1 L", "₹140"],
];
const CART: [string, string, number][] = [
  ["Rice 5 kg", "× 1", 320],
  ["Sugar 1 kg", "× 2", 90],
  ["Tea 250 g", "× 1", 95],
  ["Cola 600 ml", "× 3", 120],
];

export function BillingScreen({ added = 3, flash }: { added?: number; flash?: boolean }) {
  const lines = CART.slice(0, added);
  const total = lines.reduce((a, l) => a + l[2], 0);
  return (
    <div className="flex h-full bg-slate-50">
      <Sidebar active="Billing" />
      <div className="flex min-w-0 flex-1 flex-col gap-2 p-3">
        <div className="flex items-center gap-2">
          <div className="flex-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] text-slate-400">Search items or scan barcode…</div>
          <div className={`rounded-md px-2.5 py-1.5 text-[10px] font-semibold text-white ${flash ? "bg-emerald-600" : "bg-blue-600"}`}>
            {flash ? "✓ Scanned" : "Scan barcode"}
          </div>
        </div>
        <div className="flex gap-1.5">
          {["All", "Groceries", "Drinks", "Snacks"].map((c, i) => (
            <span key={c} className={`rounded-full border px-2.5 py-0.5 text-[9px] font-medium ${i === 0 ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-500"}`}>
              {c}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {ITEMS.map(([n, p], i) => (
            <div key={n} className={`rounded-lg border bg-white p-2 ${flash && i === 0 ? "border-emerald-500 ring-2 ring-emerald-200" : "border-slate-200"}`}>
              <div className="mb-1.5 h-9 rounded bg-slate-100" />
              <p className="text-[10px] font-medium text-slate-700">{n}</p>
              <p className="text-[10px] font-semibold text-blue-700">{p}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="flex w-[188px] shrink-0 flex-col border-l border-slate-200 bg-white p-3">
        <p className="text-[11px] font-semibold text-slate-800">Current bill</p>
        <div className="mt-2 flex flex-1 flex-col gap-1.5">
          {lines.map(([n, q, a]) => (
            <div key={n} className="flex items-center justify-between rounded bg-slate-50 px-2 py-1.5">
              <div>
                <p className="text-[10px] text-slate-700">{n}</p>
                <p className="text-[9px] text-slate-400">{q}</p>
              </div>
              <p className="text-[10px] font-semibold text-slate-800">₹{a}</p>
            </div>
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2">
          <span className="text-[10px] text-slate-500">Total</span>
          <span className="text-[14px] font-bold" style={{ color: ink }}>₹{total}</span>
        </div>
        <div className="mt-2 rounded-md bg-[#0F3D3E] py-1.5 text-center text-[10px] font-semibold text-white">Save invoice</div>
      </div>
    </div>
  );
}

const STOCK: [string, string, string, string][] = [
  ["Rice 5 kg", "2001234567893", "48", "ok"],
  ["Sugar 1 kg", "2009876543217", "6", "low"],
  ["Tea 250 g", "2004567891230", "30", "ok"],
  ["Cola 600 ml", "2007418529631", "72", "ok"],
  ["Oil 1 L", "2003692581474", "15", "ok"],
];

export function StockScreen() {
  return (
    <div className="flex h-full bg-slate-50">
      <Sidebar active="Stock" />
      <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[14px] font-semibold text-slate-800">Stock</p>
            <p className="text-[10px] text-slate-500">See what you have and update it in packs</p>
          </div>
          <div className="rounded-md bg-blue-600 px-3 py-1.5 text-[10px] font-semibold text-white">Update stock</div>
        </div>
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="grid grid-cols-[1.4fr_1.4fr_0.7fr_0.8fr] bg-slate-100 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wide text-slate-500">
            <span>Item</span><span>Barcode</span><span>In stock</span><span>Status</span>
          </div>
          {STOCK.map(([n, b, q, s], i) => (
            <div key={n} className={`grid grid-cols-[1.4fr_1.4fr_0.7fr_0.8fr] items-center px-3 py-2 text-[10px] ${i === 1 ? "bg-amber-50" : ""} ${i ? "border-t border-slate-100" : ""}`}>
              <span className="font-medium text-slate-700">{n}</span>
              <span className="font-mono text-slate-500">{b}</span>
              <span className="text-slate-700">{q}</span>
              <span className={`w-fit rounded-full px-2 py-0.5 text-[9px] font-semibold ${s === "low" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                {s === "low" ? "Low stock" : "In stock"}
              </span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-blue-300 bg-blue-50 px-3 py-2 text-[10px] text-blue-800">
          <span className="font-semibold">Sugar 1 kg</span> add <span className="rounded bg-white px-1.5 py-0.5 font-semibold">5 packs</span> of 1 kg · price changed to ₹45 · barcode label ready to print
        </div>
      </div>
    </div>
  );
}

export function InvoiceScreen() {
  const rows: [string, string, string, string][] = [
    ["Rice 5 kg", "1006", "1", "320.00"],
    ["Sugar 1 kg", "1701", "2", "90.00"],
    ["Tea 250 g", "0902", "1", "95.00"],
  ];
  return (
    <div className="flex h-full items-center justify-center gap-5 bg-slate-100 p-4">
      <div className="h-full w-[330px] overflow-hidden rounded-md bg-white shadow-lg">
        <div className="flex items-center justify-between bg-blue-600 px-4 py-3 text-white">
          <div>
            <p className="text-[13px] font-bold">Sunrise Traders</p>
            <p className="text-[8px] opacity-80">GSTIN 33ABCDE1234F1Z5</p>
          </div>
          <p className="text-[12px] font-bold">TAX INVOICE</p>
        </div>
        <div className="px-4 py-2 text-[9px] text-slate-500">Bill to: Meera Nair · INV-0148 · 05-Nov-2026</div>
        <div className="mx-4 overflow-hidden rounded border border-slate-200">
          <div className="grid grid-cols-[1.6fr_0.6fr_0.4fr_0.8fr] bg-blue-50 px-2 py-1 text-[8px] font-semibold text-blue-800">
            <span>Item</span><span>HSN</span><span>Qty</span><span className="text-right">Amount</span>
          </div>
          {rows.map(([n, h, q, a]) => (
            <div key={n} className="grid grid-cols-[1.6fr_0.6fr_0.4fr_0.8fr] border-t border-slate-100 px-2 py-1.5 text-[9px] text-slate-700">
              <span>{n}</span><span className="text-slate-500">{h}</span><span>{q}</span><span className="text-right">{a}</span>
            </div>
          ))}
        </div>
        <div className="mx-4 mt-2 flex flex-col items-end gap-0.5 text-[9px] text-slate-600">
          <span>CGST 2.5% · 12.63</span>
          <span>SGST 2.5% · 12.63</span>
          <span className="mt-1 rounded bg-[#0F3D3E] px-3 py-1 text-[11px] font-bold text-white">Total ₹530.26</span>
        </div>
      </div>
      <div className="flex w-[150px] flex-col gap-2">
        {["Download PDF", "Share on WhatsApp", "Print (A4 / thermal)"].map((b, i) => (
          <div key={b} className={`rounded-lg px-3 py-2 text-center text-[10px] font-semibold ${i === 1 ? "bg-emerald-600 text-white" : "border border-slate-300 bg-white text-slate-700"}`}>{b}</div>
        ))}
      </div>
    </div>
  );
}

/** A phone scanning a barcode, laid over a screen. Absolutely positioned by the parent. */
export function PhoneScan({ className = "" }: { className?: string }) {
  return (
    <div className={`absolute ${className}`} style={{ width: 112, height: 214 }}>
      <style>{`@keyframes zb-scan{0%{top:14%}50%{top:78%}100%{top:14%}}`}</style>
      <div className="relative h-full w-full rounded-[18px] border-[5px] border-slate-900 bg-slate-900 shadow-2xl">
        <div className="absolute left-1/2 top-1 h-1 w-8 -translate-x-1/2 rounded-full bg-slate-700" />
        <div className="relative mx-auto mt-3 h-[184px] w-full overflow-hidden rounded-xl bg-[#0b1f20]">
          <div className="absolute left-3 right-3 top-[26%] flex h-[52px] items-center justify-center rounded bg-white">
            <svg width="70" height="34" viewBox="0 0 70 34" aria-hidden="true">
              {[2, 1, 1, 3, 1, 2, 2, 1, 3, 1, 1, 2, 1, 1, 3, 2].map((w, i, a) => {
                const x = a.slice(0, i).reduce((s, v) => s + v * 2, 0);
                return i % 2 === 0 ? <rect key={i} x={x} y="0" width={w * 2} height="34" fill="#1A1A1A" /> : null;
              })}
            </svg>
          </div>
          <div className="absolute left-3 right-3 h-[2px] rounded bg-red-500" style={{ animation: "zb-scan 2.4s ease-in-out infinite" }} />
          <p className="absolute inset-x-0 bottom-2 text-center text-[8px] text-white/80">Point at a barcode</p>
        </div>
      </div>
    </div>
  );
}
