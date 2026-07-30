// ============================================================
// cache.js — Caché compartido para lecturas de alto tráfico
// (dashboard de flota). Upstash Redis vía REST (apto serverless).
// Sin credenciales configuradas: no-op transparente (siempre lee de
// BD), para que el módulo funcione en desarrollo sin dependencias.
// ============================================================

const configured = () => process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;

async function upstash(command) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  const res = await fetch(`${url}/${command.map(encodeURIComponent).join("/")}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error(`Upstash error: ${res.status}`);
  return res.json();
}

async function getCached(key) {
  if (!configured()) return null;
  try {
    const { result } = await upstash(["GET", key]);
    return result ? JSON.parse(result) : null;
  } catch {
    return null; // el caché nunca puede tumbar la lectura principal
  }
}

async function setCached(key, value, ttlSeconds) {
  if (!configured()) return;
  try {
    await upstash(["SET", key, JSON.stringify(value), "EX", String(ttlSeconds)]);
  } catch {
    /* best-effort */
  }
}

async function invalidate(prefix) {
  if (!configured()) return;
  try {
    // Upstash REST no soporta SCAN+DEL atómico simple sin Lua; se documenta
    // el TTL corto (30-60s) como red de seguridad si la invalidación falla.
    await upstash(["DEL", prefix]);
  } catch {
    /* best-effort */
  }
}

module.exports = { getCached, setCached, invalidate };
