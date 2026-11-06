"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { upiLink } from "@/lib/billingLoyalty";

/** Shows a UPI QR code with the exact amount. The cashier confirms once the customer has paid. */
export function UpiQrModal({
  vpa,
  shopName,
  amount,
  amountLabel,
  note,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  vpa: string;
  shopName: string;
  amount: number;
  amountLabel: string;
  note?: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    QRCode.toDataURL(upiLink({ vpa, name: shopName, amount, note }), { width: 360, margin: 1, errorCorrectionLevel: "M" }).then(
      (url) => live && setSrc(url)
    );
    return () => {
      live = false;
    };
  }, [vpa, shopName, amount, note]);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/50 sm:items-center" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-[380px] flex-col items-center gap-3 rounded-t-xl2 bg-paper-card p-6 text-center shadow-card sm:rounded-xl2"
      >
        <h2 className="font-display text-lg font-semibold text-text">Scan to pay</h2>
        <p className="font-ledger text-3xl font-bold tabular-nums text-ink">{amountLabel}</p>
        <div className="flex h-[260px] w-[260px] items-center justify-center rounded-xl border border-paper-fold bg-white p-2">
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt={"UPI QR for " + amountLabel} className="h-full w-full" />
          ) : (
            <span className="text-sm text-text-soft">Making QR…</span>
          )}
        </div>
        <p className="text-xs text-text-soft">
          Open GPay, PhonePe, Paytm or any UPI app and scan. Paying to <span className="font-semibold text-text">{vpa}</span>
        </p>
        <div className="flex w-full gap-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-paper-fold bg-white px-4 py-2.5 text-sm font-semibold text-text">
            Cancel
          </button>
          <button type="button" onClick={onConfirm} className="flex-1 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-paper hover:bg-ink-light">
            {confirmLabel}
          </button>
        </div>
        <p className="text-[0.7rem] text-text-soft">Tap the button only after you see the payment success on your phone.</p>
      </div>
    </div>
  );
}
