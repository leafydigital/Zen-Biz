"use client";

import { useEffect } from "react";

/**
 * Only does anything inside the Android app. Google sign-in has to happen in a
 * real browser tab (Google blocks sign-in inside an app's web view); when it
 * finishes, Android re-opens this app through the zenbiz:// link and we hand
 * the sign-in code to the site's normal /auth/callback inside the app.
 */
export function NativeAppBridge() {
  useEffect(() => {
    const cap = (window as any).Capacitor;
    if (!cap?.isNativePlatform?.()) return;
    const App = cap.Plugins?.App;
    const Browser = cap.Plugins?.Browser;
    if (!App?.addListener) return;

    const handle = App.addListener("appUrlOpen", (event: { url: string }) => {
      const url = event?.url ?? "";
      if (!url.startsWith("zenbiz://auth")) return;
      const query = url.includes("?") ? url.slice(url.indexOf("?") + 1) : "";
      try { Browser?.close?.(); } catch { /* already closed */ }
      window.location.replace(`/auth/callback?${query}`);
    });
    return () => {
      Promise.resolve(handle).then((h: any) => h?.remove?.());
    };
  }, []);
  return null;
}
