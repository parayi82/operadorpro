// ============================================================
// handler.js — Pipeline común a toda función del módulo de flota:
// CORS/OPTIONS → rate limit → autenticación → try/catch central con
// logging estructurado. Los casos de uso (fleet-*.js) solo escriben
// su lógica de negocio; nunca repiten este boilerplate.
// ============================================================

const crypto = require("crypto");
const { getSupabaseAdmin } = require("./supabaseAdmin");
const { requireUser } = require("./auth");
const { checkRateLimit, clientKey } = require("./rateLimit");
const { preflight, fromAppError, fail } = require("./response");
const { AppError } = require("./errors");
const logger = require("./logger");

/**
 * @param {object} opts
 * @param {string} opts.name nombre de la función (para logs)
 * @param {string[]} opts.methods métodos HTTP permitidos, ej. ["POST"]
 * @param {boolean} [opts.auth=true] si requiere sesión válida
 * @param {{limit:number, windowMs:number}} [opts.rateLimit] override del límite por defecto
 * @param {(ctx: {event, admin, user, requestId}) => Promise<object>} fn caso de uso
 */
function withHandler(opts, fn) {
  return async (event) => {
    const requestId = crypto.randomUUID();
    const startedAt = Date.now();

    if (event.httpMethod === "OPTIONS") return preflight();
    if (!opts.methods.includes(event.httpMethod)) {
      return fail(405, "method_not_allowed", "Método no permitido");
    }

    const admin = getSupabaseAdmin();
    const rl = opts.rateLimit || { limit: 30, windowMs: 60_000 };

    try {
      await checkRateLimit(`${opts.name}:${clientKey(event)}`, rl);

      const user = opts.auth === false ? null : await requireUser(event, admin);

      const result = await fn({ event, admin, user, requestId });

      logger.info("request.ok", { requestId, route: opts.name, userId: user?.id, latencyMs: Date.now() - startedAt });
      return result;
    } catch (err) {
      if (err instanceof AppError) {
        logger.warn("request.handled_error", {
          requestId, route: opts.name, code: err.code, message: err.message,
          latencyMs: Date.now() - startedAt
        });
        return fromAppError(err);
      }
      logger.error("request.unhandled_error", {
        requestId, route: opts.name, message: err.message, stack: err.stack,
        latencyMs: Date.now() - startedAt
      });
      return fail(500, "internal_error", "Ocurrió un error interno. Intenta de nuevo.");
    }
  };
}

module.exports = { withHandler };
