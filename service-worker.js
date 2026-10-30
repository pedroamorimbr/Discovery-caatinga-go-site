const CACHE_NAME = "discovery-caatinga-offline-v7";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./style.css",
  "./memory-game.css",
  "./discovery-day.css",
  "./premium.css?v=download-badge-1",
  "./snake-io.css",
  "./ai-chat.css",
  "./script.js",
  "./snake-io.js",
  "./ai-chat.js",
  "./logo.png",
  "./pwa-icon-512.png",
  "./acaua.jpg",
  "./alexandre-costa.jpeg",
  "./calango.jpg",
  "./carcara.jpg",
  "./juazeiro.jpg",
  "./kaike-medeiros.jpeg",
  "./mandacaru.webp",
  "./memory-anu-preto.jpg",
  "./memory-barauna.jpg",
  "./memory-cancao.jpg",
  "./memory-carcara.jpg",
  "./memory-carnauba.jpg",
  "./memory-faveleira.jpg",
  "./memory-galo-campina.jpg",
  "./memory-mandacaru.webp",
  "./mod-adaptacoes.jpg",
  "./mod-biodiversidade.jpg",
  "./mod-intro.jpg",
  "./pedro-amorim.jpeg",
  "./tatu-bola.webp",
  "./tatu-peba.webp",
  "./umbuzeiro.jpg",
  "./xique-xique.jpg"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("discovery-caatinga-offline-") && key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.includes("/api/") || request.headers.has("range")) return;

  event.respondWith(caches.match(request).then(cached => {
    if (cached) return cached;
    return fetch(request).then(response => {
      if (response.ok && response.type === "basic") {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
      }
      return response;
    }).catch(error => {
      if (request.mode === "navigate") return caches.match("./index.html");
      throw error;
    });
  }));
});
