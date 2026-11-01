"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Phones and the Android app can't show a PDF inside an <iframe> (it comes
 * out blank), so on those we draw each page onto a canvas with pdf.js.
 * pdf.js is loaded on demand from a CDN, so it adds nothing to the bundle.
 */
const PDFJS = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js";
const WORKER = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";

let loader: Promise<any> | null = null;
function loadPdfJs(): Promise<any> {
  const w = window as any;
  if (w.pdfjsLib) return Promise.resolve(w.pdfjsLib);
  if (!loader) {
    loader = new Promise((resolve, reject) => {
      const el = document.createElement("script");
      el.src = PDFJS;
      el.onload = () => {
        w.pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER;
        resolve(w.pdfjsLib);
      };
      el.onerror = () => {
        loader = null;
        reject(new Error("Could not load the preview library"));
      };
      document.head.appendChild(el);
    });
  }
  return loader;
}

/** True where an <iframe> PDF would not render (phones, tablets, the Android app). */
export function needsCanvasPdf() {
  if (typeof navigator === "undefined") return false;
  if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) return true;
  return (navigator as any).pdfViewerEnabled === false;
}

export function PdfCanvasView({ url, className }: { url: string; className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [lib, buf] = await Promise.all([loadPdfJs(), fetch(url).then((r) => r.arrayBuffer())]);
        const doc = await lib.getDocument({ data: new Uint8Array(buf) }).promise;
        const host = box.current;
        if (!host || cancelled) return;
        host.innerHTML = "";
        const width = host.clientWidth || 360;
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        for (let n = 1; n <= doc.numPages; n++) {
          const page = await doc.getPage(n);
          if (cancelled) return;
          const base = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({ scale: (width / base.width) * ratio });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = "100%";
          canvas.style.display = "block";
          canvas.style.marginBottom = "8px";
          canvas.style.background = "#fff";
          host.appendChild(canvas);
          await page.render({ canvasContext: canvas.getContext("2d")!, viewport }).promise;
        }
        setError(null);
      } catch (e) {
        console.error("Zen Biz: PDF canvas preview failed", e);
        if (!cancelled) setError("The preview couldn't be shown here. Use Download to view the PDF.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url]);

  return (
    <div className={className}>
      <div ref={box} className="w-full" />
      {error && <p className="p-3 text-xs text-alert">{error}</p>}
    </div>
  );
}
