"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Only does anything inside the Android app. Google sign-in has to happen in a
 * real browser tab (Google blocks sign-in inside an app's web view); when it
 * finishes, Android re-opens this app through the zenbiz:// link and we hand
 * the sign-in code to the site's normal /auth/callback inside the app.
 */
export function NativeAppBridge() {
  const router = useRouter();
  useEffect(() => {
    const cap = (window as any).Capacitor;
    if (!cap?.isNativePlatform?.()) return;
    document.documentElement.classList.add("is-native");
    // The app opens on the login page (a signed-in user is sent on to the dashboard).
    if (window.location.pathname === "/") window.location.replace("/login");

    // Android's web view can lose cookies when the app is closed (it happens after the
    // Google round-trip), which logs the user out. Keep a copy of the session and put
    // it back when the cookies are gone, so the user stays signed in.
    const KEY = "zb_native_session";
    const supabase = createClient();
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.refresh_token) {
        localStorage.setItem(KEY, JSON.stringify({ access_token: session.access_token, refresh_token: session.refresh_token }));
      } else if (event === "SIGNED_OUT") {
        localStorage.removeItem(KEY);
      }
    });
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) return;
      const saved = localStorage.getItem(KEY);
      if (!saved) return;
      try {
        const { access_token, refresh_token } = JSON.parse(saved);
        const { error } = await supabase.auth.setSession({ access_token, refresh_token });
        if (error) localStorage.removeItem(KEY);
        else if (/^\/(login|signup)?$/.test(window.location.pathname)) window.location.replace("/dashboard");
      } catch {
        localStorage.removeItem(KEY);
      }
    });
    // registerPlugin works on a remote (live-site) app; Plugins.X is the older fallback.
    const get = (name: string) => cap.Plugins?.[name] ?? cap.registerPlugin?.(name);
    const App = get("App");
    const Browser = get("Browser");
    if (!App?.addListener) return () => sub.subscription.unsubscribe();

    // Keep screens fresh: changes made on the website show up without reopening the app.
    const refresh = () => {
      if (document.visibilityState === "visible" && !document.querySelector("input:focus, textarea:focus, select:focus")) router.refresh();
    };
    const timer = setInterval(refresh, 15_000);
    document.addEventListener("visibilitychange", refresh);
    const resume = App.addListener("appStateChange", (s: { isActive: boolean }) => s?.isActive && router.refresh());

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
      sub.subscription.unsubscribe();
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
      Promise.resolve(resume).then((h: any) => h?.remove?.());
      Promise.resolve(handle).then((h: any) => h?.remove?.());
    };
  }, []);
  return null;
}
