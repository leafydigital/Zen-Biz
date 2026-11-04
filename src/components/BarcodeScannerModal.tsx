"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Camera barcode scanner (phone / APK / any device with a camera). Stays open so
 * several items can be scanned one after another; the same code is ignored for
 * a moment so one scan doesn't add the item twice. `onScan` returns a short
 * message to show under the camera (e.g. "Added Rice" or "No item with code …").
 */
export interface ScanLine {
  id: string;
  name: string;
  qty: number;
  amount: string;
}

export function BarcodeScannerModal({
  onScan,
  onClose,
  lines,
  total,
  count,
  onInc,
  onDec,
}: {
  onScan: (code: string) => string;
  onClose: () => void;
  lines: ScanLine[];
  total: string;
  count: number;
  onInc: (id: string) => void;
  onDec: (id: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;
  const [message, setMessage] = useState("Point the camera at a barcode");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stopped = false;
    let controls: { stop: () => void } | null = null;
    let lastCode = "";
    let lastAt = 0;

    (async () => {
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader();
        controls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: "environment" } } },
          videoRef.current!,
          (result) => {
            if (!result || stopped) return;
            const code = result.getText();
            const now = Date.now();
            if (code === lastCode && now - lastAt < 2000) return;
            lastCode = code;
            lastAt = now;
            if (navigator.vibrate) navigator.vibrate(60);
            setMessage(onScanRef.current(code));
          }
        );
        if (stopped) controls.stop();
      } catch (e) {
        const name = (e as Error)?.name;
        setError(
          name === "NotAllowedError"
            ? "Camera permission was denied. Allow camera access for Zen Biz and try again."
            : name === "NotFoundError"
              ? "No camera found on this device."
              : "Couldn't start the camera. Camera needs a secure (https) page."
        );
      }
    })();

    return () => {
      stopped = true;
      controls?.stop();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-paper">
      <div className="flex shrink-0 items-center justify-between border-b border-paper-fold bg-paper-card px-4 py-2.5">
        <p className="text-sm font-semibold text-text">Scan barcode</p>
        <button type="button" onClick={onClose} className="rounded-lg bg-ink px-4 py-1.5 text-sm font-semibold text-paper">
          Done
        </button>
      </div>

      {error ? (
        <p className="m-4 rounded-lg bg-alert-bg px-3 py-2 text-sm text-alert">{error}</p>
      ) : (
        <div className="shrink-0">
          <div className="relative h-[30vh] overflow-hidden bg-black">
            <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
            <div className="pointer-events-none absolute inset-x-8 top-1/2 h-0.5 -translate-y-1/2 bg-red-500/80" />
          </div>
          <p key={message} className="bg-success-bg px-4 py-2 text-center text-sm font-semibold text-success">{message}</p>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {lines.length === 0 ? (
          <p className="py-6 text-center text-sm text-text-soft">Scanned items will appear here.</p>
        ) : (
          <ul className="divide-y divide-paper-fold">
            {lines.map((l) => (
              <li key={l.id} className="flex items-center gap-3 px-4 py-2.5">
                <p className="min-w-0 flex-1 truncate text-sm font-medium text-text">{l.name}</p>
                <div className="flex shrink-0 items-center gap-2">
                  <button type="button" onClick={() => onDec(l.id)} className="h-8 w-8 rounded-lg bg-paper-fold text-lg font-bold text-text" aria-label={`Remove one ${l.name}`}>−</button>
                  <span className="w-7 text-center text-sm font-bold tabular-nums text-text">{l.qty}</span>
                  <button type="button" onClick={() => onInc(l.id)} className="h-8 w-8 rounded-lg bg-ink text-lg font-bold text-paper" aria-label={`Add one ${l.name}`}>+</button>
                </div>
                <p className="w-20 shrink-0 text-right font-ledger text-sm tabular-nums text-text">{l.amount}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex shrink-0 items-center justify-between border-t border-paper-fold bg-paper-card px-4 py-3">
        <p className="text-xs uppercase tracking-wide text-text-soft">{count} item{count === 1 ? "" : "s"}</p>
        <p className="font-ledger text-xl font-bold tabular-nums text-ink">{total}</p>
      </div>
    </div>
  );
}
