"use client";

import { useEffect, useState } from "react";
import { appVersionLabel } from "@/lib/appVersion";

/**
 * Menu footer: "Version 1.00.5" is the app content (changes silently with every release).
 * Inside the Android / Windows app it also shows the app's own version ("App 1.17"),
 * which changes only when the app itself is updated (logo, permissions...).
 */
export function VersionLine({ label }: { label: string }) {
  const [app, setApp] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const cap = (window as any).Capacitor;
        const desktop = (window as any).zenbizDesktop;
        if (cap?.isNativePlatform?.()) {
          const a = cap.Plugins?.App ?? cap.registerPlugin?.("App");
          const info = await a?.getInfo?.();
          if (info?.version) setApp(String(info.version));
        } else if (desktop?.getVersion) {
          setApp(String(await desktop.getVersion()).replace(/\.0$/, ""));
        }
      } catch {
        /* ignore */
      }
    })();
  }, []);

  return (
    <>
      {label} {appVersionLabel()}
      {app ? ` · App ${app}` : ""}
    </>
  );
}
