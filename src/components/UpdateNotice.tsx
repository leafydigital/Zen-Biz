"use client";

import { useEffect, useState } from "react";

const BUILD = process.env.NEXT_PUBLIC_BUILD_ID;
import { openApkDownload } from "@/lib/openApk";
import { isNativeShell } from "@/lib/nativeShell";

type Apk = { versionCode: number; versionName?: string };

/**
 * "New update available" popup for the website, the Android app and the PC app.
 *  - Website / PC / Android screens: a new deployment is detected, one tap reloads
 *    with the newest version (nothing to reinstall).
 *  - Android app: when a newer app file (.apk) has been published, one tap downloads
 *    it; opening it installs over the old app (no uninstall).
 * (The PC app updates its own program through electron-updater, see electron/main.js.)
 */
export function UpdateNotice() {
  const [web, setWeb] = useState(false);
  const [apk, setApk] = useState<Apk | null>(null);
  const [hidden, setHidden] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let stop = false;
    async function check() {
      if (!navigator.onLine) return;
      try {
        const r = await fetch("/api/version", { cache: "no-store" });
        if (!r.ok) return;
        const j = (await r.json()) as { build: string | null; apk: Apk | null };
        if (stop) return;
        // Inside the Android / Windows app only the app itself matters (logo, permissions);
        // website changes reach it automatically.
        if (BUILD && j.build && j.build !== BUILD && !isNativeShell()) setWeb(true);
        const cap = (window as any).Capacitor;
        if (cap?.isNativePlatform?.() && j.apk) {
          const app = cap.Plugins?.App ?? cap.registerPlugin?.("App");
          const info = await app?.getInfo?.();
          if (info && Number(info.build) < j.apk.versionCode) setApk(j.apk);
        }
      } catch {
        /* ignore */
      }
    }
    void check();
    const t = setInterval(check, 10 * 60 * 1000);
    const onVisible = () => document.visibilityState === "visible" && void check();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", check);
    return () => {
      stop = true;
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", check);
    };
  }, []);

  if (hidden || (!web && !apk)) return null;

  async function update() {
    setBusy(true);
    if (apk) {
      openApkDownload();
      setBusy(false);
      return;
    }
    try {
      const names = await caches.keys();
      await Promise.all(names.filter((n) => n.startsWith("zb-pages") || n.startsWith("zb-static")).map((n) => caches.delete(n)));
    } catch {
      /* ignore */
    }
    window.location.reload();
  }

  return (
    <div className="fixed inset-x-0 bottom-16 z-50 flex justify-center px-3" role="dialog" aria-label="Update available">
      <div className="flex w-full max-w-md items-center gap-3 rounded-2xl bg-ink p-3.5 text-paper shadow-2xl">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Update available</p>
          <p className="text-xs opacity-80">
            {apk ? "A new version of the Zen Biz app is ready. Download it, open the file and tap Install (no uninstall needed). If asked, allow your browser to install apps." : "A new version of Zen Biz is ready."}
          </p>
        </div>
        <button type="button" onClick={() => setHidden(true)} className="rounded-lg px-2.5 py-2 text-xs font-semibold opacity-80 hover:opacity-100">
          Later
        </button>
        <button type="button" onClick={update} disabled={busy} className="rounded-lg bg-paper px-3.5 py-2 text-sm font-semibold text-ink disabled:opacity-60">
          {apk ? "Download" : "Update"}
        </button>
      </div>
    </div>
  );
}
