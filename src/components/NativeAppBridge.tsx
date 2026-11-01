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
    // registerPlugin works on a remote (live-site) app; Plugins.X is the older fallback.
    const get = (name: string) => cap.Plugins?.[name] ?? cap.registerPlugin?.(name);
    const App = get("App");
    const Browser = get("Browser");
    if (!App?.addListener) return;

    const finish = (url: string) => {
      if (!url.startsWith("zenbiz://auth")) return;
      const query = url.includes("?") ? url.slice(url.indexOf("?") + 1) : "";
      try { Browser?.close?.(); } catch { /* already closed */ }
      window.location.replace(`/auth/callback?${query}`);
    };
    const handle = App.addListener("appUrlOpen", (event: { url: string }) => finish(event?.url ?? ""));
    // App was closed when the link arrived.
    Promise.resolve(App.getLaunchUrl?.()).then((r: any) => r?.url && finish(r.url)).catch(() => {});
    return () => {
      Promise.resolve(handle).then((h: any) => h?.remove?.());
    };
  }, []);
  return null;
}
