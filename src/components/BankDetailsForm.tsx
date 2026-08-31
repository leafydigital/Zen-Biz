"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types/database";

export function BankDetailsForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const supabase = createClient();

  const [bankName, setBankName] = useState(profile.bank_name ?? "");
  const [accountName, setAccountName] = useState(profile.bank_account_name ?? "");
  const [accountNumber, setAccountNumber] = useState(profile.bank_account_number ?? "");
  const [ifscOrSwift, setIfscOrSwift] = useState(profile.bank_ifsc_or_swift ?? "");
  const [qrPreview, setQrPreview] = useState<string | null>(profile.payment_qr_url);
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function handleQrChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSaved(false);
    setQrFile(file);
    setQrPreview(URL.createObjectURL(file));
  }

  function removeQr() {
    setSaved(false);
    setQrFile(null);
    setQrPreview(null);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);

    let qrUrl = qrPreview;
    if (qrFile) {
      const ext = qrFile.name.split(".").pop();
      const path = `${profile.id}/qr.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("payment-qr")
        .upload(path, qrFile, { upsert: true });
      if (uploadErr) {
        setSaving(false);
        setError(`Couldn't upload QR code (${uploadErr.message}).`);
        return;
      }
      const { data: publicUrlData } = supabase.storage.from("payment-qr").getPublicUrl(path);
      qrUrl = publicUrlData.publicUrl;
    }

    const { error } = await supabase
      .from("profiles" as never)
      .update({
        bank_name: bankName.trim() || null,
        bank_account_name: accountName.trim() || null,
        bank_account_number: accountNumber.trim() || null,
        bank_ifsc_or_swift: ifscOrSwift.trim() || null,
        payment_qr_url: qrUrl,
      } as never)
      .eq("id", profile.id);
    setSaving(false);
    if (error) {
      console.error("Zen Biz: failed to save bank details", error);
      setError(error.message || "Could not save. Please try again.");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-lg font-semibold text-text">
          Bank details & payment QR
        </h2>
        <p className="text-sm text-text-soft">
          Optional — shown on every document PDF so customers know how to pay you.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-text">Bank name</span>
          <input
            value={bankName}
            onChange={(e) => {
              setSaved(false);
              setBankName(e.target.value);
            }}
            placeholder="e.g. State Bank of India"
            className="rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text placeholder:text-text-soft/60 focus:border-ink"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-text">Account holder name</span>
          <input
            value={accountName}
            onChange={(e) => {
              setSaved(false);
              setAccountName(e.target.value);
            }}
            placeholder="Name on the account"
            className="rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text placeholder:text-text-soft/60 focus:border-ink"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-text">Account number</span>
          <input
            value={accountNumber}
            onChange={(e) => {
              setSaved(false);
              setAccountNumber(e.target.value);
            }}
            className="rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text placeholder:text-text-soft/60 focus:border-ink"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-text">IFSC / SWIFT code</span>
          <input
            value={ifscOrSwift}
            onChange={(e) => {
              setSaved(false);
              setIfscOrSwift(e.target.value);
            }}
            placeholder="e.g. SBIN0001234"
            className="rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text placeholder:text-text-soft/60 focus:border-ink"
          />
        </label>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-text">
          Payment QR code <span className="text-text-soft">(optional)</span>
        </span>
        <div className="flex items-center gap-4">
          {qrPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qrPreview}
              alt="Payment QR preview"
              className="h-24 w-24 rounded-lg border border-paper-fold bg-white object-contain p-1"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-lg border border-dashed border-paper-fold text-xs text-text-soft">
              No QR
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <input
              type="file"
              accept="image/*"
              onChange={handleQrChange}
              className="text-sm text-text-soft"
            />
            {qrPreview && (
              <button
                type="button"
                onClick={removeQr}
                className="self-start text-xs font-medium text-alert"
              >
                Remove
              </button>
            )}
          </div>
        </div>
        <span className="text-xs text-text-soft">
          e.g. a UPI QR code — printed near the bank details on the PDF.
        </span>
      </div>

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
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="self-start rounded-xl bg-ink px-6 py-2.5 text-sm font-semibold text-paper transition hover:bg-ink-light disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save settings"}
      </button>
    </div>
  );
}