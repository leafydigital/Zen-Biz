"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useGlobalLoader } from "@/lib/GlobalLoaderContext";
import {
  DEFAULT_BARCODE_SETTINGS,
  LABEL_PRESETS,
  getBarcodeSettings,
  printLabelItems,
  randomEan13,
  type BarcodeSettings,
} from "@/lib/barcode";
import { LabelPreview } from "@/components/LabelPreview";
import type { Business } from "@/types/database";

const inputCls =
  "w-full rounded-xl border border-paper-fold bg-white px-3 py-2 text-sm text-text focus:border-ink";

function Field({ label, unit, children }: { label: string; unit?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-text">
        {label} {unit && <span className="text-text-soft">({unit})</span>}
      </span>
      {children}
    </label>
  );
}

export function BarcodeSettingsForm({ business }: { business: Business }) {
  const router = useRouter();
  const supabase = createClient();
  const { showLoader, hideLoader } = useGlobalLoader();
  const [s, setS] = useState<BarcodeSettings>(getBarcodeSettings(business.barcode_settings));
  const [sample] = useState(() => randomEan13());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCustom = s.presetId === "custom";

  function set<K extends keyof BarcodeSettings>(key: K, value: BarcodeSettings[K]) {
    setS((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  // Number inputs keep what you type (even an empty box) and clamp on save/print via getBarcodeSettings.
  function numField(key: keyof BarcodeSettings, step = 1) {
    return (
      <input
        type="number"
        step={step}
        min={0}
        value={String(s[key])}
        onChange={(e) => set(key, (e.target.value === "" ? 0 : parseFloat(e.target.value)) as never)}
        className={inputCls}
      />
    );
  }

  function pickPreset(id: string) {
    const p = LABEL_PRESETS.find((x) => x.id === id);
    if (!p) return;
    setS((prev) => ({
      ...prev,
      presetId: p.id,
      // "Custom" keeps whatever is already set so you can tweak from your current layout.
      ...(p.id === "custom"
        ? {}
        : {
            paperType: p.paperType,
            columns: p.columns,
            labelWidth: p.labelWidth,
            labelHeight: p.labelHeight,
            gapX: p.gapX,
            gapY: p.gapY,
            marginX: p.marginX,
            marginY: p.marginY,
          }),
    }));
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    setError(null);
    showLoader("Saving barcode settings…");
    const clean = getBarcodeSettings(s);
    const { error: err } = await supabase
      .from("businesses" as never)
      .update({ barcode_settings: clean } as never)
      .eq("id", business.id);
    setSaving(false);
    hideLoader();
    if (err) {
      setError(
        /barcode_settings/.test(err.message)
          ? "The barcode_settings column is missing. Run supabase/migration_45.sql in the Supabase SQL editor."
          : err.message
      );
      return;
    }
    setS(clean);
    setSaved(true);
    router.refresh();
  }

  async function testPrint() {
    const clean = getBarcodeSettings(s);
    await printLabelItems(
      [{ item: { name: "Sample item", price: 99, code: sample }, copies: clean.columns * 2 }],
      clean,
      business.business_name,
      "barcode-test.pdf"
    );
  }

  const live = getBarcodeSettings(s);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-5">
        <div>
          <h2 className="font-display text-lg font-semibold text-text">Barcode label</h2>
          <p className="text-sm text-text-soft">
            Choose your sticker paper and how the barcode label looks. This is used whenever you print labels from Stock.
          </p>
        </div>

        <Field label="Sticker paper">
          <select value={s.presetId} onChange={(e) => pickPreset(e.target.value)} className={inputCls}>
            {LABEL_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Paper type">
            <select
              value={s.paperType}
              disabled={!isCustom}
              onChange={(e) => set("paperType", e.target.value as BarcodeSettings["paperType"])}
              className={inputCls}
            >
              <option value="roll">Roll (label printer)</option>
              <option value="sheet">A4 sheet</option>
            </select>
          </Field>
          <Field label="Labels across">
            <select
              value={s.columns}
              disabled={!isCustom}
              onChange={(e) => set("columns", parseInt(e.target.value, 10))}
              className={inputCls}
            >
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? "column" : "columns"}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Label width" unit="mm">
            <div className={isCustom ? "" : "pointer-events-none opacity-60"}>{numField("labelWidth")}</div>
          </Field>
          <Field label="Label height" unit="mm">
            <div className={isCustom ? "" : "pointer-events-none opacity-60"}>{numField("labelHeight")}</div>
          </Field>
          <Field label="Gap between labels" unit="mm">
            <div className={isCustom ? "" : "pointer-events-none opacity-60"}>{numField("gapX", 0.5)}</div>
          </Field>
          <Field label="Gap between rows" unit="mm">
            <div className={isCustom ? "" : "pointer-events-none opacity-60"}>{numField("gapY", 0.5)}</div>
          </Field>
          <Field label="Side margin" unit="mm">
            <div className={isCustom ? "" : "pointer-events-none opacity-60"}>{numField("marginX", 0.5)}</div>
          </Field>
          <Field label="Top margin" unit="mm">
            <div className={isCustom ? "" : "pointer-events-none opacity-60"}>{numField("marginY", 0.5)}</div>
          </Field>
        </div>
        {!isCustom && (
          <p className="-mt-3 text-xs text-text-soft">Pick “Custom size” to enter your own measurements.</p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Barcode type">
            <select
              value={s.format}
              onChange={(e) => set("format", e.target.value as BarcodeSettings["format"])}
              className={inputCls}
            >
              <option value="EAN13">EAN-13 (standard shop barcode)</option>
              <option value="CODE128">Code 128 (any text/SKU)</option>
            </select>
          </Field>
          <Field label="Text align">
            <select value={s.align} onChange={(e) => set("align", e.target.value as BarcodeSettings["align"])} className={inputCls}>
              <option value="center">Center</option>
              <option value="left">Left</option>
            </select>
          </Field>
          <Field label="Barcode height" unit={`${s.barHeight}% of label`}>
            <input type="range" min={20} max={80} value={s.barHeight} onChange={(e) => set("barHeight", +e.target.value)} />
          </Field>
          <Field label="Bar thickness" unit={`${s.barWidth}`}>
            <input type="range" min={1} max={4} step={0.5} value={s.barWidth} onChange={(e) => set("barWidth", +e.target.value)} />
          </Field>
          <Field label="Text size" unit={`${s.fontSize} pt`}>
            <input type="range" min={4} max={14} step={0.5} value={s.fontSize} onChange={(e) => set("fontSize", +e.target.value)} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["showBusiness", "Business name"],
              ["showName", "Item name"],
              ["showPrice", "Price"],
              ["showCode", "Number under barcode"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 rounded-xl border border-paper-fold bg-white px-3 py-2 text-sm text-text">
              <input type="checkbox" checked={s[key]} onChange={(e) => set(key, e.target.checked)} />
              {label}
            </label>
          ))}
        </div>

        {error && <p className="rounded-lg bg-alert/10 px-3 py-2 text-sm text-alert">{error}</p>}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-xl bg-ink px-5 py-2.5 text-sm font-semibold text-paper transition hover:bg-ink-light disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save barcode settings"}
          </button>
          <button
            type="button"
            onClick={testPrint}
            className="rounded-xl border border-paper-fold bg-white px-4 py-2.5 text-sm font-semibold text-text hover:bg-paper"
          >
            Print test label
          </button>
          <button
            type="button"
            onClick={() => {
              setS(DEFAULT_BARCODE_SETTINGS);
              setSaved(false);
            }}
            className="text-sm text-text-soft underline"
          >
            Reset
          </button>
          {saved && <span className="text-sm font-medium text-green-700">Saved ✓</span>}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-text">Preview</h3>
        <p className="text-xs text-text-soft">Updates as you change anything. Dashed boxes are the stickers.</p>
        <LabelPreview
          settings={live}
          item={{ name: "Sample item", price: 99, code: sample }}
          businessName={business.business_name}
        />
      </div>
    </div>
  );
}
