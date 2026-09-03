// ============================================================
// sw.js — Service worker mínimo para que el sitio sea instalable
// como app (Android/Chrome lo exige para el prompt de instalación;
// iOS/Safari lo ignora pero no estorba).
//
// Estrategia: "red primero, caché de respaldo" en TODO — nunca
// "caché primero". El sitio se actualiza seguido; con caché-primero
// el usuario se queda viendo una versión vieja hasta borrar datos.
// Con red-primero, si hay internet siempre ve lo último, y si no hay
// internet (o el celular pierde señal a media carretera) puede seguir
// abriendo el cascarón de la app — incluida la pantalla de Auxilio
// con los teléfonos de carretera — en vez de una pantalla en blanco.
//
// Las llamadas a /.netlify/functions/* y a Supabase NUNCA se
// interceptan aquí (no se les llama respondWith) — son API calls,
// no contenido cacheable.
// ============================================================

const CACHE_NAME = "operadorpro-shell-v2";
const APP_SHELL = [
  "/fleet-qr.html",
  "/index.html",
  "/app.html",
  "/verificar.html",
  "/css/styles.css",
  "/css/fleet.css",
  "/css/operador-ui.css",
  "/js/config.js",
  "/js/panel.js",
  "/js/operador-ui.js",
  "/js/courses-data.js",
  "/js/register-sw.js",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/manifest.webmanifest"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL).catch(() => {}))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

function isApiCall(url) {
  return url.pathname.startsWith("/.netlify/functions/") || url.hostname.endsWith("supabase.co");
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET") return;
  if (url.origin !== self.location.origin && !url.hostname.endsWith("supabase.co")) return;
  if (isApiCall(url)) return; // deja pasar las llamadas a la API sin tocarlas

  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match("/app.html")))
  );
});
