"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const WARM_PAGES = [
  "/dashboard",
  "/dashboard/billing-records",
  "/dashboard/products",
  "/dashboard/stock",
  "/dashboard/customers",
  "/dashboard/invoices",
];

/**
 * Offline mode. Registers the service worker (public/sw.js), shows an offline /
 * "waiting to sync" bar, and tells the worker to upload queued changes to the
 * cloud as soon as the internet is back.
 */
export function OfflineSupport() {
  const router = useRouter();
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [failed, setFailed] = useState(0);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
    const supabase = createClient();
    let hadPending = false;

    const post = (msg: unknown) => navigator.serviceWorker.controller?.postMessage(msg);
    async function flush() {
      const { data } = await supabase.auth.getSession();
      post({ type: "flush", token: data.session?.access_token });
    }

    const onMessage = (e: MessageEvent) => {
      if (e.data?.type !== "queue") return;
      setPending(e.data.pending);
      setFailed(e.data.failed);
      if (e.data.pending > 0) hadPending = true;
      else if (hadPending) {
        hadPending = false;
        router.refresh(); // synced: show the saved data
      }
    };
    navigator.serviceWorker.addEventListener("message", onMessage);

    const goOnline = () => {
      setOnline(true);
      void flush();
    };
    const goOffline = () => setOnline(false);
    setOnline(navigator.onLine);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    navigator.serviceWorker
      .register("/sw.js")
      .then(() => navigator.serviceWorker.ready)
      .then(() => {
        post({ type: "count" });
        if (navigator.onLine) {
          void flush();
          // Save the main screens once per session so they open offline too.
          if (location.pathname.startsWith("/dashboard") && !sessionStorage.getItem("zb_warmed")) {
            sessionStorage.setItem("zb_warmed", "1");
            post({ type: "warm", urls: WARM_PAGES });
          }
        }
      })
      .catch(() => {});

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        post({ type: "clear" });
        sessionStorage.removeItem("zb_warmed");
      }
    });
    const retry = setInterval(() => navigator.onLine && void flush(), 30_000);

    return () => {
      navigator.serviceWorker.removeEventListener("message", onMessage);
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      sub.subscription.unsubscribe();
      clearInterval(retry);
    };
  }, [router]);

  if (online && pending === 0 && failed === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-3 z-50 flex justify-center px-3">
      <div
        className={`pointer-events-auto max-w-md rounded-full px-4 py-2 text-xs font-semibold shadow-lg ${
          failed > 0 ? "bg-red-600 text-white" : online ? "bg-blue-600 text-white" : "bg-gray-900 text-white"
        }`}
      >
        {failed > 0
          ? `${failed} offline change(s) were rejected by the server and not saved.`
          : !online
            ? `Offline mode — changes are saved on this phone${pending ? ` (${pending} waiting)` : ""} and sync when internet returns.`
            : `Syncing ${pending} offline change(s) to the cloud…`}
        {failed > 0 && (
          <button
            className="ml-3 underline"
            onClick={() => {
              navigator.serviceWorker.controller?.postMessage({ type: "resetFailed" });
              setFailed(0);
            }}
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}
