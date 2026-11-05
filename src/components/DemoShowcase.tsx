"use client";

import { useEffect, useRef, useState } from "react";
import { BillingScreen, InvoiceScreen, PhoneScan, StockScreen, WindowFrame } from "@/components/AppScreens";
import { LabelsScreen, SettingsScreen, TeamScreen } from "@/components/AppScreensMore";

/**
 * Real screenshots / video: drop files into /public/demo and they are used automatically.
 *   hero.png  billing.png  stock.png  labels.png  invoice.png  settings.png  team.png  zenbiz-demo.mp4
 * Until a file exists, a drawn look-alike of that screen is shown instead.
 */

/** Scales a fixed 640 x 400 design to whatever width it is given. */
function ScaledBox({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / 640);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} className={`relative w-full overflow-hidden ${className}`} style={{ aspectRatio: "640 / 400" }}>
      <div className="absolute left-0 top-0" style={{ width: 640, height: 400, transform: `scale(${scale})`, transformOrigin: "top left" }}>
        {children}
      </div>
    </div>
  );
}

/** True once the real image file is found. */
function useRealImage(src: string): boolean {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    const img = new window.Image();
    img.onload = () => setOk(true);
    img.src = src;
  }, [src]);
  return ok;
}

function Screen({ src, alt, children }: { src: string; alt: string; children: React.ReactNode }) {
  const real = useRealImage(src);
  if (real) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} className="w-full rounded-xl border border-paper-fold object-cover shadow-xl" />;
  }
  return (
    <div role="img" aria-label={alt}>
      <ScaledBox>{children}</ScaledBox>
    </div>
  );
}

/** Picture beside the headline: the billing screen with a phone scanning a barcode. */
export function HeroShowcase({ className = "" }: { className?: string }) {
  return (
    <div className={className}>
      <Screen src="/demo/hero.png" alt="Zen Biz billing screen with a phone scanning a product barcode">
        <WindowFrame url="zenbiz.app/dashboard/billing">
          <BillingScreen added={3} flash />
        </WindowFrame>
        <PhoneScan className="bottom-3 right-3" />
      </Screen>
    </div>
  );
}

type Item = { id: string; src: string; alt: string; cap: string; node: React.ReactNode };

const frame = (url: string, inner: React.ReactNode) => <WindowFrame url={url}>{inner}</WindowFrame>;

const ITEMS: Record<string, Item> = {
  billing: { id: "billing", src: "/demo/billing.png", alt: "Zen Biz billing screen", cap: "Billing: scan, tap, total", node: frame("zenbiz.app/dashboard/billing", <BillingScreen added={4} />) },
  stock: { id: "stock", src: "/demo/stock.png", alt: "Zen Biz stock screen", cap: "Stock: update in packs, low stock alerts", node: frame("zenbiz.app/dashboard/stock", <StockScreen />) },
  labels: { id: "labels", src: "/demo/labels.png", alt: "Zen Biz barcode label settings with live preview", cap: "Settings: barcode label size and preview", node: frame("zenbiz.app/dashboard/settings", <LabelsScreen />) },
  invoice: { id: "invoice", src: "/demo/invoice.png", alt: "Zen Biz GST invoice", cap: "Invoice: PDF, WhatsApp, print", node: frame("zenbiz.app/dashboard/invoices", <InvoiceScreen />) },
  settings: { id: "settings", src: "/demo/settings.png", alt: "Zen Biz document appearance settings", cap: "Settings: paper size and invoice design", node: frame("zenbiz.app/dashboard/settings", <SettingsScreen />) },
  team: { id: "team", src: "/demo/team.png", alt: "Zen Biz team members and roles", cap: "Team: add users and set roles", node: frame("zenbiz.app/dashboard/settings", <TeamScreen />) },
};

const SCENES: { title: string; body: string; item: string; node: React.ReactNode }[] = [
  {
    title: "Scan or tap an item",
    body: "Point your phone camera at the barcode, or tap the item. It is added to the bill straight away.",
    item: "billing",
    node: (
      <div className="h-full w-full">
        {frame("zenbiz.app/dashboard/billing", <BillingScreen added={1} flash />)}
        <PhoneScan className="bottom-3 right-3" />
      </div>
    ),
  },
  { title: "The bill builds itself", body: "Prices, quantities and the total update with every scan. No typing, no mistakes.", item: "billing", node: ITEMS.billing.node },
  { title: "Stock stays right", body: "See what is low, add stock in packs, change the price while you update, and print new labels.", item: "stock", node: ITEMS.stock.node },
  { title: "Set up your barcode labels", body: "Choose your sticker size, one or two columns and the design. The live preview shows exactly what will print.", item: "labels", node: ITEMS.labels.node },
  { title: "Print or share the invoice", body: "A clean GST invoice as PDF: share it on WhatsApp or print it on A4 or a thermal receipt printer.", item: "invoice", node: ITEMS.invoice.node },
  { title: "Change settings your way", body: "Pick the paper size, one of 20 designs, your logo, signature and bank details. The preview updates as you choose.", item: "settings", node: ITEMS.settings.node },
  { title: "Add your team and set roles", body: "Invite staff and give each role only what it needs. A cashier can bill customers but cannot see reports or change prices.", item: "team", node: ITEMS.team.node },
];
const SCENE_MS = 4800;
/** The six screenshot cards under the walkthrough. Hidden for now; set to true to show them again. */
const SHOW_SCREENSHOT_GRID = false;

/** The demo section: an auto-playing walkthrough (or your own video), plus screenshots that open large. */
export function DemoShowcase() {
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [videoOk, setVideoOk] = useState(false);
  const [zoom, setZoom] = useState<Item | null>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setPlaying(false);
  }, []);
  useEffect(() => {
    if (!playing || videoOk || zoom) return;
    const t = setTimeout(() => setActive((a) => (a + 1) % SCENES.length), SCENE_MS);
    return () => clearTimeout(t);
  }, [active, playing, videoOk, zoom]);
  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setZoom(null);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [zoom]);

  const openScene = () => setZoom(ITEMS[SCENES[active].item]);

  return (
    <div className="flex flex-col gap-10">
      <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr] lg:items-start">
        <div className="overflow-hidden rounded-xl2 border border-paper-fold bg-white p-3 shadow-card">
          <video
            src="/demo/zenbiz-demo.mp4"
            controls
            playsInline
            preload="metadata"
            onLoadedMetadata={() => setVideoOk(true)}
            className={videoOk ? "w-full rounded-xl" : "hidden"}
            aria-label="Zen Biz demo video"
          />
          {!videoOk && (
            <div
              className="group relative cursor-zoom-in"
              role="button"
              tabIndex={0}
              aria-label="Enlarge the demo"
              onClick={openScene}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && openScene()}
            >
              <ScaledBox>
                {SCENES.map((s, i) => (
                  <div key={s.title} className="absolute inset-0 transition-opacity duration-500" style={{ opacity: active === i ? 1 : 0 }} aria-hidden={active !== i}>
                    {s.node}
                  </div>
                ))}
              </ScaledBox>
            </div>
          )}
          {!videoOk && (
            <div className="mt-3 flex items-center justify-between gap-3 px-1">
              <button
                type="button"
                onClick={() => setPlaying((p) => !p)}
                aria-label={playing ? "Pause the demo" : "Play the demo"}
                title={playing ? "Pause" : "Play"}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-paper-fold bg-white text-ink transition hover:bg-paper"
              >
                {playing ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <rect x="6" y="5" width="4" height="14" rx="1" />
                    <rect x="14" y="5" width="4" height="14" rx="1" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>
              <span className="text-xs text-text-soft">Click the picture to view it large</span>
            </div>
          )}
        </div>

        <ol className="flex flex-col gap-2">
          {SCENES.map((s, i) => (
            <li key={s.title}>
              <button
                type="button"
                onClick={() => {
                  setActive(i);
                  setPlaying(true);
                }}
                className={`w-full rounded-xl border px-4 py-2.5 text-left transition ${active === i ? "border-ink bg-white shadow-card" : "border-paper-fold bg-paper-card hover:bg-white"}`}
              >
                <span className="flex items-center gap-3">
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${active === i ? "bg-ink text-paper" : "bg-paper text-text-soft"}`}>{i + 1}</span>
                  <span className="font-display text-sm font-semibold text-text">{s.title}</span>
                </span>
                {active === i && <span className="mt-1.5 block pl-9 text-sm text-text-soft">{s.body}</span>}
              </button>
            </li>
          ))}
        </ol>
      </div>

      {SHOW_SCREENSHOT_GRID && (
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Object.values(ITEMS).map((c) => (
          <figure key={c.id} className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setZoom(c)}
              aria-label={`Enlarge: ${c.cap}`}
              className="group relative block w-full cursor-zoom-in text-left"
            >
              <Screen src={c.src} alt={c.alt}>{c.node}</Screen>
            </button>
            <figcaption className="text-center">
              <span className="block text-sm font-medium text-text-soft">{c.cap}</span>
              <span className="block text-xs text-text-soft/70">Click to view large</span>
            </figcaption>
          </figure>
        ))}
      </div>
      )}

      {zoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-8" onClick={() => setZoom(null)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label={zoom.cap}
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-full w-full max-w-5xl overflow-y-auto rounded-xl2 bg-paper-card p-3 shadow-card sm:p-5"
          >
            <button
              type="button"
              onClick={() => setZoom(null)}
              aria-label="Close"
              className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-paper-fold bg-white text-text-soft shadow hover:bg-paper hover:text-text"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
            <p className="mb-3 pr-12 font-display text-base font-semibold text-text">{zoom.cap}</p>
            <Screen src={zoom.src} alt={zoom.alt}>{zoom.node}</Screen>
          </div>
        </div>
      )}
    </div>
  );
}
