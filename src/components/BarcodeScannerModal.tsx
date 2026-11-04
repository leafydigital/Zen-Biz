"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Camera barcode scanner (phone / APK / any device with a camera). Stays open so
 * several items can be scanned one after another; the same code is ignored for
 * a moment so one scan doesn't add the item twice. `onScan` returns a short
 * message to show under the camera (e.g. "Added Rice" or "No item with code …").
 */
export function BarcodeScannerModal({ onScan, onClose }: { onScan: (code: string) => string; onClose: () => void }) {
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
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/60 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="flex w-full max-w-md flex-col gap-3 rounded-xl bg-paper-card p-4 shadow-card">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-text">Scan barcode</p>
          <button type="button" onClick={onClose} className="rounded-lg px-3 py-1.5 text-sm font-semibold text-text hover:bg-paper">
            Done
          </button>
        </div>
        {error ? (
          <p className="rounded-lg bg-alert-bg px-3 py-2 text-sm text-alert">{error}</p>
        ) : (
          <>
            <div className="relative overflow-hidden rounded-lg bg-black">
              <video ref={videoRef} className="aspect-[4/3] w-full object-cover" muted playsInline />
              <div className="pointer-events-none absolute inset-x-8 top-1/2 h-0.5 -translate-y-1/2 bg-red-500/80" />
            </div>
            <p className="text-center text-sm text-text">{message}</p>
          </>
        )}
      </div>
    </div>
  );
}
