// ============================================================
// response.js — Sobres HTTP estandarizados + cabeceras de seguridad
// comunes a toda función. CORS restringido al dominio del sitio.
// ============================================================

const ALLOWED_ORIGIN = process.env.SITE_URL || "*";

function securityHeaders(extra = {}) {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "no-store",
    ...extra
  };
}

function ok(body, extraHeaders = {}) {
  return { statusCode: 200, headers: securityHeaders(extraHeaders), body: JSON.stringify(body) };
}

function created(body) {
  return { statusCode: 201, headers: securityHeaders(), body: JSON.stringify(body) };
}

function fail(statusCode, code, message, details) {
  return {
    statusCode,
    headers: securityHeaders(),
    body: JSON.stringify({ error: { code, message, details: details || undefined } })
  };
}

function fromAppError(err) {
  return fail(err.statusCode || 500, err.code || "internal_error", err.message || "Error interno", err.details);
}

function preflight() {
  return { statusCode: 204, headers: securityHeaders() };
}

module.exports = { ok, created, fail, fromAppError, preflight, securityHeaders };
