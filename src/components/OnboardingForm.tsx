"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BUSINESS_TYPE_OPTIONS } from "@/lib/businessLabels";

const OTHER_VALUE = "__other__";

export function OnboardingForm({ userId }: { userId: string }) {
  const router = useRouter();
  const supabase = createClient();

  const [businessTypeSelect, setBusinessTypeSelect] = useState<string>("");
  const [customBusinessType, setCustomBusinessType] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoRemoved, setLogoRemoved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    setLogoRemoved(false);
  }

  function removeLogo() {
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
    setSaving(true);

    let logoUrl: string | null = null;
    if (logoFile) {
      const ext = logoFile.name.split(".").pop();
      const path = `${userId}/logo.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("business-logos")
        .upload(path, logoFile, { upsert: true });
      if (uploadErr) {
        setSaving(false);
        setError(
          `Couldn't upload logo (${uploadErr.message}). You can add it later in Settings — try again, or resubmit and we'll continue without it.`
        );
        return;
      }
      const { data: publicUrlData } = supabase.storage
        .from("business-logos")
        .getPublicUrl(path);
      // Supabase Storage keeps the same public URL for the same path even
      // after upsert-replacing the file, so browsers can keep showing the
      // old cached image. Appending a cache-busting query param forces a
      // fresh fetch every time the logo is changed.
      logoUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`;
    }

    const { error: dbError } = await supabase
      .from("profiles")
      .update({
        business_name: businessName.trim(),
        business_type: finalBusinessType,
        phone: phone.trim() || null,
        address: address.trim() || null,
        gst_number: gstNumber.trim() || null,
        logo_url: logoUrl,
        onboarding_complete: true,
      })
      .eq("id", userId);

    setSaving(false);
    if (dbError) {
      console.error("Zen Biz: failed to save business profile", dbError);
      setError(
        dbError.message ||
          "Something went wrong saving your business. Please try again."
      );
      return;
    }
    router.push("/dashboard");
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
          placeholder="e.g. Sunrise Enterprises"
          className="rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text placeholder:text-text-soft/60 focus:border-ink"
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
            placeholder="e.g. Furniture Workshop"
            className="rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text placeholder:text-text-soft/60 focus:border-ink"
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
              className="text-xs font-medium text-alert"
            >
              Remove
            </button>
          )}
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
          placeholder="Shown on your invoices"
          className="rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text placeholder:text-text-soft/60 focus:border-ink"
        />
      </label>

      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-text">
            Phone number <span className="text-text-soft">(optional)</span>
          </span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="For your invoices"
            className="rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text placeholder:text-text-soft/60 focus:border-ink"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-text">
            GST number <span className="text-text-soft">(optional)</span>
          </span>
          <input
            value={gstNumber}
            onChange={(e) => setGstNumber(e.target.value)}
            placeholder="e.g. 22AAAAA0000A1Z5"
            className="rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text placeholder:text-text-soft/60 focus:border-ink"
          />
        </label>
      </div>

      {error && (
        <p className="rounded-lg bg-alert-bg px-3.5 py-2.5 text-sm text-alert" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="rounded-xl bg-ink px-4 py-3 text-[0.95rem] font-semibold text-paper transition hover:bg-ink-light disabled:opacity-60"
      >
        {saving ? "Setting up…" : "Open my CRM"}
      </button>
    </form>
  );
}
