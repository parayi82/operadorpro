// ============================================================
// rateLimit.js — Ventana deslizante por IP+identidad.
// Producción: Upstash Redis (HTTP, apto para serverless, límite
// compartido entre TODAS las invocaciones). Desarrollo local sin
// credenciales: fallback en memoria de proceso (NO distribuido,
// documentado explícitamente como no apto para producción).
// ============================================================

const { RateLimitError } = require("./errors");

const memoryStore = new Map(); // key -> [timestamps]

function memoryHit(key, limit, windowMs) {
  const now = Date.now();
  const arr = (memoryStore.get(key) || []).filter((t) => now - t < windowMs);
  arr.push(now);
  memoryStore.set(key, arr);
  return arr.length <= limit;
}

async function upstashHit(key, limit, windowMs) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  const now = Date.now();
  const windowKey = `ratelimit:${key}:${Math.floor(now / windowMs)}`;

  // INCR + EXPIRE vía comandos pipeline REST de Upstash
  const res = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify([
      ["INCR", windowKey],
      ["PEXPIRE", windowKey, String(windowMs)]
    ])
  });
  if (!res.ok) throw new Error(`Upstash error: ${res.status}`);
  const [incrResult] = await res.json();
  const count = Number(incrResult?.result ?? 0);
  return count <= limit;
}

/**
 * @param {string} key identificador único (ip+ruta+usuario)
 * @param {{limit:number, windowMs:number}} opts
 */
async function checkRateLimit(key, opts) {
  const { limit, windowMs } = opts;
  const useUpstash = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;

  let allowed;
  try {
    allowed = useUpstash ? await upstashHit(key, limit, windowMs) : memoryHit(key, limit, windowMs);
  } catch {
    // Si el limitador distribuido falla, no se cae el servicio completo:
    // se degrada a limitador local en memoria para esa invocación.
    allowed = memoryHit(key, limit, windowMs);
  }

  if (!allowed) throw new RateLimitError();
}

function clientKey(event) {
  const ip =
    event.headers["x-nf-client-connection-ip"] ||
    (event.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
    "unknown";
  return ip;
}

module.exports = { checkRateLimit, clientKey };
