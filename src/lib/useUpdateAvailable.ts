"use client";

import { useEffect, useState } from "react";

const BUILD = process.env.NEXT_PUBLIC_BUILD_ID;

/**
 * True while a newer Zen Biz is available for THIS device: new website content,
 * a newer Android app file (inside the Android app) or a newer Windows program
 * (inside the PC app). Turns false by itself once the update has been installed.
 */
export function useUpdateAvailable(): boolean {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    let stop = false;
    async function check() {
      if (!navigator.onLine) return;
      try {
        const r = await fetch("/api/version", { cache: "no-store" });
        if (!r.ok) return;
        const j = (await r.json()) as { build: string | null; apk: { versionCode: number } | null };
        let any = !!(BUILD && j.build && j.build !== BUILD);

        const cap = (window as any).Capacitor;
        if (!any && cap?.isNativePlatform?.() && j.apk) {
          const app = cap.Plugins?.App ?? cap.registerPlugin?.("App");
          const info = await app?.getInfo?.();
          if (info && Number(info.build) < j.apk.versionCode) any = true;
        }
        const desktop = (window as any).zenbizDesktop;
        if (!any && desktop?.checkUpdate) {
          const res = await desktop.checkUpdate();
          if (res?.status === "available") any = true;
        }
        if (!stop) setAvailable(any);
      } catch {
        /* keep the last answer */
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

  return available;
}
