import { Sidebar } from "@/components/AppScreens";

/** Settings, team/roles and barcode-label screens, same fixed 640 x 400 look-alikes as AppScreens. */

function Check({ on, label, note }: { on: boolean; label: string; note?: string }) {
  return (
    <div className="flex items-center gap-2 text-[10px] text-slate-700">
      <span className={`flex h-3.5 w-3.5 items-center justify-center rounded border text-[9px] font-bold ${on ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white text-transparent"}`}>✓</span>
      <span className={on ? "" : "text-slate-400"}>{label}</span>
      {note && <span className="ml-auto rounded bg-slate-100 px-1.5 py-0.5 text-[8px] font-semibold text-slate-500">{note}</span>}
    </div>
  );
}

function SettingsTabsBar({ active }: { active: string }) {
  const tabs = ["Business info", "Team", "Document appearance", "Barcode labels", "Bank & payment", "Plan"];
  return (
    <div className="flex w-[132px] shrink-0 flex-col gap-1 border-r border-slate-200 bg-white p-3">
      <p className="mb-1 text-[12px] font-semibold text-slate-800">Settings</p>
      {tabs.map((t) => (
        <span key={t} className={`rounded-md px-2 py-1.5 text-[10px] ${t === active ? "bg-blue-50 font-semibold text-blue-700" : "text-slate-500"}`}>{t}</span>
      ))}
    </div>
  );
}

const BAR_PATTERN = [2, 1, 1, 3, 1, 2, 2, 1, 3, 1, 1, 2, 1, 1, 3, 2, 1, 2];

/** Settings → Document appearance: paper size and template. */
export function SettingsScreen() {
  const templates = ["#1d4ed8", "#0f766e", "#7e22ce", "#c2410c", "#166534", "#be185d"];
  return (
    <div className="flex h-full bg-slate-50">
      <Sidebar active="Overview" />
      <SettingsTabsBar active="Document appearance" />
      <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">
        <div>
          <p className="text-[13px] font-semibold text-slate-800">Document appearance</p>
          <p className="text-[9px] text-slate-500">Applies to every invoice, quotation and purchase PDF</p>
        </div>
        <div>
          <p className="mb-1 text-[10px] font-medium text-slate-700">Paper size</p>
          <div className="grid grid-cols-4 gap-1.5">
            {["A4", "A5", "Thermal 80mm", "Thermal 58mm"].map((p, i) => (
              <span key={p} className={`rounded-md border px-2 py-1.5 text-center text-[9px] font-semibold ${i === 0 ? "border-[#0F3D3E] bg-[#0F3D3E] text-white" : "border-slate-200 bg-white text-slate-600"}`}>{p}</span>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1 text-[10px] font-medium text-slate-700">Design style</p>
          <div className="grid grid-cols-4 gap-1.5">
            {["Simple", "Colourful", "Templates", "Custom"].map((p, i) => (
              <span key={p} className={`rounded-md border px-2 py-1.5 text-center text-[9px] font-semibold ${i === 2 ? "border-[#0F3D3E] bg-[#0F3D3E] text-white" : "border-slate-200 bg-white text-slate-600"}`}>{p}</span>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1 text-[10px] font-medium text-slate-700">Choose a template</p>
          <div className="grid grid-cols-6 gap-1.5">
            {templates.map((c, i) => (
              <div key={c} className={`rounded-md border bg-white p-1 ${i === 1 ? "border-[#0F3D3E] ring-2 ring-[#0F3D3E]/20" : "border-slate-200"}`}>
                <div className="relative h-11 overflow-hidden rounded bg-white ring-1 ring-slate-100">
                  <div className="absolute inset-x-0 top-0 h-3" style={{ background: c }} />
                  <div className="absolute inset-x-1 top-5 h-1.5 rounded-sm" style={{ background: c, opacity: 0.3 }} />
                  <div className="absolute inset-x-1 top-8 h-1 rounded-sm bg-slate-200" />
                  <div className="absolute bottom-1 right-1 h-2 w-6 rounded-sm" style={{ background: c }} />
                </div>
                <p className="mt-0.5 text-center text-[8px] font-semibold text-slate-600">Template {i + 1}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-auto flex items-center justify-between">
          <span className="text-[9px] text-slate-500">Logo, signature and colour can be changed too</span>
          <span className="rounded-md bg-blue-600 px-3 py-1.5 text-[10px] font-semibold text-white">Save changes</span>
        </div>
      </div>
    </div>
  );
}

/** Settings → Team: members and what each role may do. */
export function TeamScreen() {
  const members: [string, string, string][] = [
    ["Meera Nair", "Owner", "bg-violet-100 text-violet-700"],
    ["Arjun Patel", "Admin", "bg-blue-100 text-blue-700"],
    ["Kavya Rao", "Cashier", "bg-emerald-100 text-emerald-700"],
  ];
  return (
    <div className="flex h-full bg-slate-50">
      <Sidebar active="Overview" />
      <SettingsTabsBar active="Team" />
      <div className="grid min-w-0 flex-1 grid-cols-[1fr_1.1fr] gap-3 p-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-semibold text-slate-800">Team members</p>
            <span className="rounded-md bg-blue-600 px-2 py-1 text-[9px] font-semibold text-white">+ Invite</span>
          </div>
          {members.map(([n, r, c], i) => (
            <div key={n} className={`flex items-center gap-2 rounded-lg border bg-white px-2.5 py-2 ${i === 2 ? "border-blue-400 ring-2 ring-blue-100" : "border-slate-200"}`}>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-600">{n[0]}</span>
              <span className="text-[10px] font-medium text-slate-700">{n}</span>
              <span className={`ml-auto rounded-full px-2 py-0.5 text-[8px] font-semibold ${c}`}>{r}</span>
            </div>
          ))}
          <p className="mt-1 text-[9px] leading-snug text-slate-500">Owner and Admin can do everything. Create roles like Cashier or Accountant and tick exactly what each one can open.</p>
        </div>
        <div className="flex flex-col gap-1.5 rounded-lg border border-slate-200 bg-white p-3">
          <p className="text-[11px] font-semibold text-slate-800">Role: Cashier</p>
          <Check on label="Billing POS (make new bills)" />
          <Check on label="Customers" />
          <Check on label="Invoices" />
          <Check on={false} label="Items / Stock" />
          <Check on={false} label="Purchases & suppliers" />
          <Check on={false} label="GST & Profit/Loss reports" />
          <Check on label="Settings: Bank & payment" note="View only" />
          <Check on={false} label="Activity log" />
          <span className="mt-auto self-end rounded-md bg-blue-600 px-3 py-1.5 text-[10px] font-semibold text-white">Save role</span>
        </div>
      </div>
    </div>
  );
}

/** Settings → Barcode labels: sticker size, columns and a live preview. */
export function LabelsScreen() {
  return (
    <div className="flex h-full bg-slate-50">
      <Sidebar active="Overview" />
      <SettingsTabsBar active="Barcode labels" />
      <div className="grid min-w-0 flex-1 grid-cols-[1fr_1fr] gap-3 p-4">
        <div className="flex flex-col gap-2">
          <p className="text-[13px] font-semibold text-slate-800">Barcode labels</p>
          <p className="text-[10px] font-medium text-slate-700">Sticker paper</p>
          <div className="grid grid-cols-2 gap-1.5">
            {["1 column", "2 columns"].map((c, i) => (
              <span key={c} className={`rounded-md border px-2 py-1.5 text-center text-[9px] font-semibold ${i === 1 ? "border-[#0F3D3E] bg-[#0F3D3E] text-white" : "border-slate-200 bg-white text-slate-600"}`}>{c}</span>
            ))}
          </div>
          {[["Label width", "38 mm"], ["Label height", "25 mm"], ["Barcode type", "EAN-13"]].map(([l, v]) => (
            <div key={l} className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[10px]">
              <span className="text-slate-500">{l}</span>
              <span className="font-semibold text-slate-800">{v}</span>
            </div>
          ))}
          <Check on label="Show item name and price" />
          <span className="mt-auto self-start rounded-md bg-blue-600 px-3 py-1.5 text-[10px] font-semibold text-white">Save settings</span>
        </div>
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white p-3">
          <p className="self-start text-[10px] font-semibold text-slate-700">Live preview</p>
          <div className="grid grid-cols-2 gap-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="w-[92px] rounded border border-dashed border-amber-600 bg-white p-1.5">
                <div className="flex justify-between text-[7px] font-semibold text-slate-800"><span>Rice 5 kg</span><span>₹320</span></div>
                <svg width="76" height="26" viewBox="0 0 76 26" aria-hidden="true" className="mt-1">
                  {BAR_PATTERN.map((w, k, a) => {
                    const x = a.slice(0, k).reduce((s, v) => s + v * 2, 0);
                    return k % 2 === 0 ? <rect key={k} x={x} y="0" width={w * 2} height="26" fill="#1A1A1A" /> : null;
                  })}
                </svg>
                <p className="text-center font-mono text-[6px] text-slate-500">200123456789{i}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
