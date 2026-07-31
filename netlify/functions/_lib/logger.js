// ============================================================
// logger.js — Logging estructurado JSON a stdout. Nunca loggea
// secretos (service role key, tokens) ni cuerpos de request crudos.
// Cualquier colector de logs de Netlify/terceros puede ingerir esto.
// ============================================================

const REDACT_KEYS = new Set(["password", "token", "authorization", "service_role", "apikey", "api_key"]);

function redact(obj) {
  if (!obj || typeof obj !== "object") return obj;
  const out = Array.isArray(obj) ? [] : {};
  for (const [k, v] of Object.entries(obj)) {
    if (REDACT_KEYS.has(k.toLowerCase())) out[k] = "[redacted]";
    else if (v && typeof v === "object") out[k] = redact(v);
    else out[k] = v;
  }
  return out;
}

function log(level, event, fields = {}) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    event,
    ...redact(fields)
  };
  // eslint-disable-next-line no-console
  console[level === "error" ? "error" : "log"](JSON.stringify(entry));
}

module.exports = {
  info: (event, fields) => log("info", event, fields),
  warn: (event, fields) => log("warn", event, fields),
  error: (event, fields) => log("error", event, fields)
};
