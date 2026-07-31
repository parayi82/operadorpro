// ============================================================
// register-sw.js — Registro del service worker (requisito para que
// Android/Chrome ofrezca "Instalar app"). Archivo externo porque la
// CSP del sitio es script-src 'self' sin 'unsafe-inline'.
// ============================================================

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
