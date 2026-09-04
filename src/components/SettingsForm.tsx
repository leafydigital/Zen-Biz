"use client";

import { useState } from "react";
import { INDIAN_STATE_NAMES } from "@/lib/indianStates";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BUSINESS_TYPE_OPTIONS } from "@/lib/businessLabels";
import { CURRENCY_OPTIONS } from "@/types/database";
import { LANGUAGES } from "@/lib/i18n/languages";
import { useTranslation } from "@/lib/i18n/I18nContext";
import type { Profile } from "@/types/database";

const OTHER_VALUE = "__other__";

export function SettingsForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const supabase = createClient();
  const { t, language, setLanguage } = useTranslation();

  const isKnownType = (BUSINESS_TYPE_OPTIONS as readonly string[]).includes(
    profile.business_type
  );

  const [businessTypeSelect, setBusinessTypeSelect] = useState<string>(
    isKnownType ? profile.business_type : profile.business_type ? OTHER_VALUE : ""
  );
  const [customBusinessType, setCustomBusinessType] = useState(
    isKnownType ? "" : profile.business_type
  );
  const [businessName, setBusinessName] = useState(profile.business_name);
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [address, setAddress] = useState(profile.address ?? "");
  const [state, setState] = useState(profile.state ?? "");
  const [gstNumber, setGstNumber] = useState(profile.gst_number ?? "");
  const [defaultCurrency, setDefaultCurrency] = useState(profile.default_currency ?? "INR");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(profile.logo_url);
  const [logoRemoved, setLogoRemoved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSaved(false);
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    setLogoRemoved(false);
  }

  function removeLogo() {
    setSaved(false);
    setLogoFile(null);
    setLogoPreview(null);
    setLogoRemoved(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const finalBusinessType =
      businessTypeSelect === OTHER_VALUE
        ? customBusinessType.trim()
        : businessTypeSelect;

    if (!finalBusinessType) {
      setError("Please choose or enter what kind of business this is.");
      return;
    }
    setError(null);
    setSaved(false);
    setSaving(true);

    let logoUrl = profile.logo_url;
    if (logoRemoved) {
      logoUrl = null;
    } else if (logoFile) {
      const ext = logoFile.name.split(".").pop();
      const path = `${profile.id}/logo.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("business-logos")
        .upload(path, logoFile, { upsert: true });
      if (uploadErr) {
        setSaving(false);
        setError(`Couldn't upload logo (${uploadErr.message}).`);
        return;
      }
      const { data: publicUrlData } = supabase.storage
        .from("business-logos")
        .getPublicUrl(path);
      // Supabase Storage returns the same public URL for the same path
      // even after upsert-replacing the file, so browsers can keep showing
      // a stale cached image. Appending a cache-busting query param forces
      // a fresh fetch every time the logo is changed.
      logoUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`;
    }

    const { error: dbError } = await supabase
      .from("profiles" as never)
      .update({
        business_name: businessName.trim(),
        business_type: finalBusinessType,
        phone: phone.trim() || null,
        address: address.trim() || null,
        state: state || null,
        gst_number: gstNumber.trim() || null,
        default_currency: defaultCurrency,
        logo_url: logoUrl,
        language,
      } as never)
      .eq("id", profile.id);

    setSaving(false);
    if (dbError) {
      console.error("Zen Biz: failed to save business profile", dbError);
      setError(
        dbError.message ||
          "Something went wrong saving your business. Please try again."
      );
      return;
    }
    setSaved(true);
    setLogoFile(null);
    setLogoRemoved(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-text">Business name</span>
        <input
          required
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          className="rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text focus:border-ink"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-text">Business type</span>
        <select
          required
          value={businessTypeSelect}
          onChange={(e) => setBusinessTypeSelect(e.target.value)}
          className="rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text focus:border-ink"
        >
          <option value="" disabled>
            Select your business type…
          </option>
          {BUSINESS_TYPE_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
          <option value={OTHER_VALUE}>Other (type your own)</option>
        </select>
      </label>

      {businessTypeSelect === OTHER_VALUE && (
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-text">
            Describe your business type
          </span>
          <input
            required
            value={customBusinessType}
            onChange={(e) => setCustomBusinessType(e.target.value)}
            className="rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text focus:border-ink"
          />
        </label>
      )}

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-text">
          Business logo <span className="text-text-soft">(optional)</span>
        </span>
        <div className="flex items-center gap-4">
          {logoPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoPreview}
              alt="Logo preview"
              className="h-14 w-14 rounded-lg border border-paper-fold object-cover"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-dashed border-paper-fold text-xs text-text-soft">
              Logo
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              className="text-sm text-text-soft"
            />
            {logoPreview && (
              <button
                type="button"
                onClick={removeLogo}
                className="self-start text-xs font-medium text-alert"
              >
                Remove
              </button>
            )}
          </div>
        </div>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-text">
          Business address <span className="text-text-soft">(optional)</span>
        </span>
        <textarea
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          rows={2}
          className="rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text focus:border-ink"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-text">
          State <span className="text-text-soft">(for GST — CGST/SGST vs IGST)</span>
        </span>
        <select
          value={state}
          onChange={(e) => setState(e.target.value)}
          className="rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text focus:border-ink"
        >
          <option value="">Select state…</option>
          {INDIAN_STATE_NAMES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <span className="text-xs text-text-soft">
          Compared against each customer's state to automatically split
          GST into CGST+SGST or IGST on invoices.
        </span>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-text">
            Phone number <span className="text-text-soft">(optional)</span>
          </span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text focus:border-ink"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-text">
            GST number <span className="text-text-soft">(optional)</span>
          </span>
          <input
            value={gstNumber}
            onChange={(e) => setGstNumber(e.target.value)}
            className="rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text focus:border-ink"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-text">Default currency</span>
        <select
          value={defaultCurrency}
          onChange={(e) => setDefaultCurrency(e.target.value)}
          className="rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text focus:border-ink"
        >
          {CURRENCY_OPTIONS.map((c) => (
            <option key={c.code} value={c.code}>
              {c.label}
            </option>
          ))}
        </select>
        <span className="text-xs text-text-soft">
          Suggested by default on new invoices, quotations, and purchases —
          you can still change it for any individual document.
        </span>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-text">{t.settings.language}</span>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text focus:border-ink"
        >
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.nativeName} ({l.englishName})
            </option>
          ))}
        </select>
        <span className="text-xs text-text-soft">{t.settings.languageHint}</span>
      </label>

      {error && (
        <p className="rounded-lg bg-alert-bg px-3.5 py-2.5 text-sm text-alert" role="alert">
          {error}
        </p>
      )}
      {saved && !error && (
        <p className="rounded-lg bg-success-bg px-3.5 py-2.5 text-sm text-success" role="status">
          Saved.
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="self-start rounded-xl bg-ink px-6 py-2.5 text-sm font-semibold text-paper transition hover:bg-ink-light disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
