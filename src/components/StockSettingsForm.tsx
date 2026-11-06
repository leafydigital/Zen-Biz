"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useGlobalLoader } from "@/lib/GlobalLoaderContext";
import type { Business } from "@/types/database";

export const DEFAULT_LOW_STOCK_LEVEL = 5;

export function StockSettingsForm({ business }: { business: Business }) {
  const router = useRouter();
  const supabase = createClient();
  const { showLoader, hideLoader } = useGlobalLoader();
  const [level, setLevel] = useState(String(business.low_stock_level ?? DEFAULT_LOW_STOCK_LEVEL));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const n = Math.floor(Number(level));
    if (level.trim() === "" || !Number.isFinite(n) || n < 0 || n > 1000000) {
      setError("Enter a whole number, 0 or more.");
      return;
    }
    setSaving(true);
    setError(null);
    showLoader("Saving stock settings…");
    const { error: err } = await supabase
      .from("businesses" as never)
      .update({ low_stock_level: n } as never)
      .eq("id", business.id);
    setSaving(false);
    hideLoader();
    if (err) {
      setError(
        /low_stock_level/.test(err.message)
          ? "The low_stock_level column is missing. Run supabase/migration_52.sql in the Supabase SQL editor."
          : err.message
      );
      return;
    }
    setLevel(String(n));
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-display text-lg font-semibold text-text">Stock limit</h2>
        <p className="text-sm text-text-soft">
          When an item&apos;s stock falls to this number or below, it shows as low stock on the dashboard alert and in Stock.
        </p>
      </div>
      <label className="flex max-w-xs flex-col gap-1">
        <span className="text-xs font-medium text-text">Low stock limit (quantity)</span>
        <input
          type="number"
          min={0}
          step={1}
          inputMode="numeric"
          value={level}
          onChange={(e) => {
            setLevel(e.target.value);
            setSaved(false);
          }}
          className="w-full rounded-xl border border-paper-fold bg-white px-3 py-2 text-sm text-text focus:border-ink"
        />
      </label>
      {error && <p className="text-sm text-alert">{error}</p>}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-xl bg-ink px-5 py-2.5 text-sm font-semibold text-paper hover:bg-ink-light disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        {saved && <span className="text-sm text-text-soft">Saved</span>}
      </div>
    </div>
  );
}
