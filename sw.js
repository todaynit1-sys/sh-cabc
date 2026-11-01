/* 재단법인 맑고푸른곶 — 서비스 워커 (scripts/html/pwa.mjs가 내보낼 때마다 만든다) */
const CACHE = "cabc-58ebaa9151";
const CDN = "cabc-cdn";
const PRECACHE = ["./","about.html","assets/motion.js","assets/style.css","consult.html","equipment.html","icons/apple-touch-icon.png","icons/favicon-32.png","icons/icon-192.png","icons/icon-512.png","icons/icon.svg","icons/maskable-512.png","images/edu-group.jpg","images/edu-lecture.jpg","images/eq-icp-lg.jpg","images/eq-icp.jpg","images/eq-sampler-lg.jpg","images/eq-sampler.jpg","images/favicon.svg","images/field-diag.jpg","images/field-measure.jpg","images/field-support.jpg","images/logo.png","images/photo-birds.jpg","images/photo-center.jpg","images/photo-sunset.jpg","images/regen-center.jpg","images/regen-complex.jpg","images/regen-energy.jpg","index.html","manifest.webmanifest","measure.html","regen.html"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== CDN).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const put = (name, req, res) => {
  if (res && res.ok) caches.open(name).then((c) => c.put(req, res));
};

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => (put(CACHE, req, res.clone()), res))
        .catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match("index.html"))),
    );
    return;
  }
  if (url.origin === self.location.origin) {
    e.respondWith(caches.match(req).then((r) => r || fetch(req).then((res) => (put(CACHE, req, res.clone()), res))));
    return;
  }
  if (url.hostname === "cdn.jsdelivr.net") {
    e.respondWith(
      caches.open(CDN).then((c) =>
        c.match(req).then((r) => {
          const net = fetch(req).then((res) => (res.ok && c.put(req, res.clone()), res)).catch(() => r);
          return r || net;
        }),
      ),
    );
  }
});
