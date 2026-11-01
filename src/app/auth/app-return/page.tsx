"use client";

import { useEffect, useState } from "react";

/**
 * Google sign-in from the Android app finishes here, in the phone's browser.
 * This page hands the sign-in code back to the Zen Biz app. An https page plus
 * an Android "intent" link is far more reliable than redirecting straight to a
 * custom link, which browsers often block.
 */
export default function AppReturnPage() {
  const [link, setLink] = useState("");

  useEffect(() => {
    const q = window.location.search.replace(/^\?/, "");
    const isAndroid = /Android/i.test(navigator.userAgent);
    const target = isAndroid
      ? `intent://auth/callback?${q}#Intent;scheme=zenbiz;package=com.leafydigital.zenbiz;end`
      : `zenbiz://auth/callback?${q}`;
    setLink(target);
    window.location.href = target;
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white p-6 text-center">
      <h1 className="text-xl font-semibold text-gray-900">Signed in with Google</h1>
      <p className="text-sm text-gray-600">Returning to the Zen Biz app…</p>
      <a href={link || "#"} className="rounded-xl bg-gray-900 px-6 py-3 text-base font-semibold text-white">
        Open Zen Biz app
      </a>
      <p className="max-w-xs text-xs text-gray-500">If nothing happens, tap the button above.</p>
    </main>
  );
}
