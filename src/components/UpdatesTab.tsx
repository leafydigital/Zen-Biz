"use client";

import { useCallback, useEffect, useState } from "react";

const BUILD = process.env.NEXT_PUBLIC_BUILD_ID;
import { isNativeShell } from "@/lib/nativeShell";
import { appVersionLabel } from "@/lib/appVersion";
import { APK_URL, EXE_URL, openApkDownload } from "@/lib/openApk";

type Desktop = {
  getVersion: () => Promise<string>;
  checkUpdate: () => Promise<{ status: "dev" | "uptodate" | "available" | "error"; version?: string }>;
  downloadUpdate: () => Promise<boolean>;
  installUpdate: () => Promise<void>;
};

type Row = {
  key: string;
  title: string;
  current?: string;
  state: "checking" | "uptodate" | "available" | "unknown";
  detail?: string;
  action?: { label: string; run: () => void };
  link?: { label: string; href: string };
};

/** Settings → Updates: is a newer Zen Biz available for the website, the Android app and the PC app? */
export function UpdatesTab() {
  const [rows, setRows] = useState<Row[]>([]);
  const [checking, setChecking] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const check = useCallback(async () => {
    setChecking(true);
    const out: Row[] = [];
    const cap = (window as any).Capacitor;
    const desktop = (window as any).zenbizDesktop as Desktop | undefined;
    const native = !!cap?.isNativePlatform?.();

    let server: { build: string | null; apk: { versionCode: number; versionName?: string } | null } | null = null;
    try {
      if (!navigator.onLine) throw new Error("offline");
      const r = await fetch("/api/version", { cache: "no-store" });
      if (r.ok) server = await r.json();
    } catch {
      server = null;
    }

    // 1) Screens, features and fixes (website content). Not shown inside the Android / Windows
    // app: there they arrive by themselves, and only app updates (logo, permissions) are listed.
    if (isNativeShell()) {
      /* skip */
    } else if (!server) {
      out.push({ key: "web", title: "App content & features", current: appVersionLabel(), state: "unknown", detail: "Could not check. Connect to the internet and try again." });
    } else if (BUILD && server.build && server.build !== BUILD) {
      out.push({
        key: "web",
        title: "App content & features",
        current: appVersionLabel(),
        state: "available",
        detail: "A newer version is ready.",
        action: {
          label: "Update now",
          run: async () => {
            try {
              const names = await caches.keys();
              await Promise.all(names.filter((n) => n.startsWith("zb-pages") || n.startsWith("zb-static")).map((n) => caches.delete(n)));
            } catch {
              /* ignore */
            }
            window.location.reload();
          },
        },
      });
    } else {
      out.push({ key: "web", title: "App content & features", current: appVersionLabel(), state: "uptodate", detail: "You have the latest version." });
    }

    // 2) Android app
    if (native) {
      try {
        const app = cap.Plugins?.App ?? cap.registerPlugin?.("App");
        const info = await app?.getInfo?.();
        const cur = info ? `${info.version} (build ${info.build})` : undefined;
        if (!server?.apk) {
          out.push({ key: "apk", title: "Android app", current: cur, state: server ? "uptodate" : "unknown", detail: server ? "You have the latest version." : "Could not check." });
        } else if (info && Number(info.build) < server.apk.versionCode) {
          out.push({
            key: "apk",
            title: "Android app",
            current: cur,
            state: "available",
            detail: `New version ${server.apk.versionName ?? server.apk.versionCode} is ready. Download it, open it and tap Install. No uninstall needed.`,
            link: { label: "Download doesn't start? Open the direct link", href: APK_URL },
            action: {
              label: "Download update",
              run: () => openApkDownload(),
            },
          });
        } else {
          out.push({ key: "apk", title: "Android app", current: cur, state: "uptodate", detail: "You are up to date." });
        }
      } catch {
        out.push({ key: "apk", title: "Android app", state: "unknown", detail: "Could not read the app version." });
      }
    }

    // 3) Windows app
    if (!desktop && navigator.userAgent.includes("Electron")) {
      out.push({
        key: "exe-old",
        title: "Windows app",
        state: "available",
        detail: "This PC app was installed before automatic updates existed, so it cannot update itself. Download and run the latest installer once (it installs over this app, your data stays). After that, updates are one click.",
        link: { label: "Direct link", href: EXE_URL },
        action: { label: "Download installer", run: () => window.open(EXE_URL, "_blank") },
      });
    }
    if (desktop) {
      try {
        const version = await desktop.getVersion();
        const res = await desktop.checkUpdate();
        if (res.status === "available") {
          out.push({
            key: "exe",
            title: "Windows app",
            current: version,
            state: "available",
            detail: `New version ${res.version ?? ""} is ready. The app downloads it and restarts. Nothing to uninstall.`,
            action: {
              label: "Update now",
              run: async () => {
                setBusy("exe");
                const ok = await desktop.downloadUpdate();
                setBusy(null);
                if (ok) await desktop.installUpdate();
              },
            },
          });
        } else if (res.status === "error") {
          out.push({ key: "exe", title: "Windows app", current: version, state: "unknown", detail: "Could not check. Try again when you are online." });
        } else {
          out.push({ key: "exe", title: "Windows app", current: version, state: "uptodate", detail: res.status === "dev" ? "Test build." : "You are up to date." });
        }
      } catch {
        out.push({ key: "exe", title: "Windows app", state: "unknown", detail: "Could not check." });
      }
    }

    setRows(out);
    setLastChecked(new Date());
    setChecking(false);
  }, []);

  useEffect(() => {
    void check();
  }, [check]);

  const badge = (s: Row["state"]) =>
    s === "uptodate"
      ? "bg-green-100 text-green-800"
      : s === "available"
        ? "bg-amber-100 text-amber-800"
        : "bg-paper text-text-soft";
  const badgeText = (s: Row["state"]) => (s === "uptodate" ? "Up to date" : s === "available" ? "Update available" : "Unknown");

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-display text-lg font-semibold text-text">Updates</h2>
        <p className="text-sm text-text-soft">Check whether a newer Zen Biz is available on this device.</p>
      </div>

      <div className="flex flex-col gap-3">
        {checking && rows.length === 0 && <p className="text-sm text-text-soft">Checking…</p>}
        {rows.map((r) => (
          <div key={r.key} className="flex flex-col gap-3 rounded-xl border border-paper-fold bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-text">
                {r.title}
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge(r.state)}`}>{badgeText(r.state)}</span>
              </p>
              {r.current && <p className="mt-0.5 text-xs text-text-soft">Installed version: {r.current}</p>}
              {r.detail && <p className="mt-1 text-sm text-text-soft">{r.detail}</p>}
              {r.link && (
                <a href={r.link.href} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs font-semibold text-ink underline">
                  {r.link.label}
                </a>
              )}
            </div>
            {r.action && (
              <button
                type="button"
                disabled={busy === r.key}
                onClick={r.action.run}
                className="shrink-0 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-paper hover:bg-ink-light disabled:opacity-60"
              >
                {busy === r.key ? "Downloading…" : r.action.label}
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void check()}
          disabled={checking}
          className="rounded-xl border border-paper-fold bg-white px-4 py-2.5 text-sm font-semibold text-text hover:bg-paper disabled:opacity-60"
        >
          {checking ? "Checking…" : "Check for updates"}
        </button>
        {lastChecked && <span className="text-xs text-text-soft">Last checked {lastChecked.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>}
      </div>
    </div>
  );
}
