/* Zen Biz service worker: lets the app open and keep working without internet.
 *  - App files and pages you visited are kept on the phone and open offline.
 *  - Saves (new items, stock, bills...) made offline are queued on the phone and
 *    sent to the cloud (Supabase) automatically when the internet is back.
 */
const VERSION = "v1";
const STATIC = `zb-static-${VERSION}`;
const PAGES = `zb-pages-${VERSION}`;
const DATA = `zb-data-${VERSION}`;
const KEEP = [STATIC, PAGES, DATA];

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((n) => n.startsWith("zb-") && !KEEP.includes(n)).map((n) => caches.delete(n)));
      await self.clients.claim();
    })()
  );
});

// ── Offline write queue (IndexedDB) ─────────────────────────────────────────
function db() {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open("zb-offline", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("queue", { keyPath: "id", autoIncrement: true });
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
async function tx(mode, fn) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const t = d.transaction("queue", mode);
    const out = fn(t.objectStore("queue"));
    t.oncomplete = () => resolve(out && "result" in out ? out.result : undefined);
    t.onerror = () => reject(t.error);
  });
}
const enqueue = (item) => tx("readwrite", (s) => s.add(item));
const remove = (id) => tx("readwrite", (s) => s.delete(id));
const all = () => tx("readonly", (s) => s.getAll());

let failed = 0;
async function broadcast() {
  const pending = (await all()).length;
  const clients = await self.clients.matchAll({ includeUncontrolled: true });
  clients.forEach((c) => c.postMessage({ type: "queue", pending, failed }));
}

let flushing = false;
async function flush(token) {
  if (flushing) return;
  flushing = true;
  try {
    const items = (await all()).sort((a, b) => a.id - b.id);
    for (const it of items) {
      const headers = new Headers(it.headers);
      // The saved login token may have expired while offline; use the fresh one.
      if (token) headers.set("Authorization", `Bearer ${token}`);
      let res;
      try {
        res = await fetch(it.url, { method: it.method, headers, body: it.body });
      } catch {
        break; // still offline: keep the rest, in order
      }
      if (res.status === 401 || res.status === 408 || res.status === 429 || res.status >= 500) break;
      if (!res.ok) failed++; // rejected by the server (e.g. duplicate): drop it so it cannot block the rest
      await remove(it.id);
    }
  } finally {
    flushing = false;
    await broadcast();
  }
}

async function mutate(req) {
  const copy = req.clone();
  try {
    return await fetch(req);
  } catch {
    const body = await copy.text();
    await enqueue({
      url: copy.url,
      method: copy.method,
      headers: [...copy.headers.entries()],
      body: body || undefined,
    });
    await broadcast();
    const wantsRows = /return=representation/.test(copy.headers.get("Prefer") || "");
    return new Response(wantsRows ? "[]" : null, {
      status: wantsRows ? 201 : 204,
      headers: { "Content-Type": "application/json", "X-Zb-Queued": "1" },
    });
  }
}

// ── Caching strategies ──────────────────────────────────────────────────────
async function networkFirst(req, cacheName, key, timeoutMs) {
  const cache = await caches.open(cacheName);
  const cacheKey = key || req;
  const network = fetch(req).then((res) => {
    if (res.ok && !res.redirected) cache.put(cacheKey, res.clone());
    return res;
  });
  network.catch(() => {}); // handled below; avoids an unhandled-rejection warning when the cache wins
  try {
    if (!timeoutMs) return await network;
    const cached = await cache.match(cacheKey, { ignoreVary: true });
    if (!cached) return await network;
    return await Promise.race([network, new Promise((_, rej) => setTimeout(rej, timeoutMs))]);
  } catch {
    const cached = await cache.match(cacheKey, { ignoreVary: true });
    if (cached) return cached;
    return null;
  }
}

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  const net = fetch(req)
    .then((res) => {
      if (res.ok || res.type === "opaque") cache.put(req, res.clone());
      return res;
    })
    .catch(() => null);
  return hit || (await net) || Response.error();
}

const OFFLINE_PAGE = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline</title>
<body style="font-family:system-ui,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;text-align:center;padding:24px;color:#333">
<div><h2>You're offline</h2><p>This page hasn't been opened on this device yet.<br>Connect to the internet once to use it offline later.</p>
<button onclick="location.reload()" style="margin-top:12px;padding:10px 20px;border:0;border-radius:10px;background:#1a1a1a;color:#fff;font-size:16px">Try again</button></div></body>`;

function pageKey(url, isRsc) {
  const u = new URL(url);
  u.searchParams.delete("_rsc");
  u.hash = "";
  return new Request(u.toString() + (isRsc ? (u.search ? "&" : "?") + "__rsc=1" : ""));
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (url.hostname.endsWith(".supabase.co")) {
    if (url.pathname.startsWith("/rest/v1/")) {
      if (req.method === "GET") {
        event.respondWith(
          networkFirst(req, DATA).then(
            (r) => r || new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } })
          )
        );
      } else {
        event.respondWith(mutate(req));
      }
    } else if (req.method === "GET" && url.pathname.startsWith("/storage/v1/object/public/")) {
      event.respondWith(staleWhileRevalidate(req, STATIC));
    }
    return;
  }

  if (req.method !== "GET") return;
  if (url.origin !== self.location.origin) {
    if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) event.respondWith(staleWhileRevalidate(req, STATIC));
    return;
  }
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/") || url.pathname === "/sw.js") return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/_next/image") || /\.(png|jpe?g|svg|webp|ico|woff2?)$/.test(url.pathname)) {
    event.respondWith(url.pathname.startsWith("/_next/static/") ? cacheFirst(req, STATIC) : staleWhileRevalidate(req, STATIC));
    return;
  }

  const isRsc = req.headers.get("RSC") === "1";
  if (req.mode === "navigate" || isRsc) {
    event.respondWith(
      networkFirst(req, PAGES, pageKey(req.url, isRsc), 6000).then(
        (r) => r || (req.mode === "navigate" ? new Response(OFFLINE_PAGE, { headers: { "Content-Type": "text/html" } }) : Response.error())
      )
    );
  }
});

self.addEventListener("message", (event) => {
  const msg = event.data || {};
  if (msg.type === "flush") event.waitUntil(flush(msg.token));
  else if (msg.type === "count") event.waitUntil(broadcast());
  else if (msg.type === "resetFailed") failed = 0;
  else if (msg.type === "warm") {
    event.waitUntil(
      (async () => {
        const cache = await caches.open(PAGES);
        for (const path of msg.urls || []) {
          try {
            const res = await fetch(path, { credentials: "same-origin" });
            if (res.ok && !res.redirected) await cache.put(pageKey(new URL(path, self.location.origin).toString(), false), res);
          } catch {
            /* offline: skip */
          }
        }
      })()
    );
  } else if (msg.type === "clear") {
    // Signed out: forget saved pages/data so the next person on this phone cannot see them.
    event.waitUntil(Promise.all([caches.delete(PAGES), caches.delete(DATA)]));
  }
});
