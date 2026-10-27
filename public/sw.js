// Lock In service worker: offline shell + Web Push from the Cloudflare Worker.
const WORKER = new URL(self.location).searchParams.get("w") || "";
const CACHE = "lockin-v1";
const DEV = ["localhost", "127.0.0.1"].includes(self.location.hostname);

self.addEventListener("install", (e) => {
  self.skipWaiting();
  if (!DEV) e.waitUntil(caches.open(CACHE).then((c) => c.addAll(["/", "/manifest.webmanifest", "/pwa-192.png"]).catch(() => {})));
});

self.addEventListener("activate", (e) =>
  e.waitUntil(
    (async () => {
      for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
      await self.clients.claim();
    })()
  )
);

self.addEventListener("fetch", (e) => {
  const r = e.request;
  if (DEV || r.method !== "GET") return;
  const u = new URL(r.url);
  if (u.origin !== self.location.origin) return;
  // Pages: network first, fall back to the cached shell when offline.
  if (r.mode === "navigate") {
    e.respondWith(
      fetch(r)
        .then((res) => {
          const c = res.clone();
          caches.open(CACHE).then((x) => x.put("/", c));
          return res;
        })
        .catch(() => caches.match("/"))
    );
    return;
  }
  // Static assets: cache first.
  e.respondWith(
    caches.match(r).then(
      (hit) =>
        hit ||
        fetch(r).then((res) => {
          if (res.ok && (u.pathname.startsWith("/_next/static") || /\.(png|svg|woff2?|webmanifest)$/.test(u.pathname))) {
            const c = res.clone();
            caches.open(CACHE).then((x) => x.put(r, c));
          }
          return res;
        })
    )
  );
});

// Pushes arrive with no payload; the message text is fetched from the Worker.
self.addEventListener("push", (e) =>
  e.waitUntil(
    (async () => {
      let msgs = [];
      try {
        if (e.data) msgs = [e.data.json()];
      } catch {}
      if (!msgs.length && WORKER) {
        try {
          const sub = await self.registration.pushManager.getSubscription();
          if (sub) {
            const r = await fetch(WORKER + "/pending", { method: "POST", body: JSON.stringify({ endpoint: sub.endpoint }) });
            msgs = await r.json();
          }
        } catch {}
      }
      if (!msgs.length) msgs = [{ id: "lockin", title: "Lock In", body: "Time to check in." }];
      await Promise.all(
        msgs.map((m) =>
          self.registration.showNotification(m.title || "Lock In", {
            body: m.body || "",
            tag: m.id,
            icon: "/pwa-192.png",
            badge: "/pwa-192.png",
            data: { url: m.url || "/" },
          })
        )
      );
    })()
  )
);

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const c of all) if ("focus" in c) return c.focus();
      return self.clients.openWindow((e.notification.data && e.notification.data.url) || "/");
    })()
  );
});
