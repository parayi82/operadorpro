// ============================================================
// fleet-admin-set-subscription.js — Activa/desactiva manualmente el
// plan de certificación de un usuario, sin pasar por Stripe (tratos
// negociados, cortesías, o corregir un desajuste). Da acceso a cursos
// Y a Flota a la vez (una sola suscripción, ver requireActiveSubscription
// en _lib/auth.js). Exclusivo para administradores de plataforma.
//
// Esta es la ÚNICA vía además del webhook de Stripe que puede escribir
// profiles.subscription_status/plan — y solo llega aquí tras
// requirePlatformAdmin(), usando el cliente admin (service role, ignora
// la protección RLS que blinda esas columnas para el resto de los casos).
// ============================================================

const { withHandler } = require("./_lib/handler");
const { requirePlatformAdmin } = require("./_lib/auth");
const { validate, parseJsonBody, schemas } = require("./_lib/validate");
const { ok } = require("./_lib/response");
const logger = require("./_lib/logger");

exports.handler = withHandler(
  { name: "fleet-admin-set-subscription", methods: ["POST"], rateLimit: { limit: 30, windowMs: 60_000 } },
  async ({ event, admin, user }) => {
    await requirePlatformAdmin(admin, user.id);
    const input = validate(schemas.adminSetSubscription, parseJsonBody(event));

    const patch = { subscription_status: input.subscription_status };
    if (input.plan) patch.plan = input.plan;

    const { data, error } = await admin
      .from("profiles")
      .update(patch)
      .eq("id", input.user_id)
      .select()
      .single();
    if (error) throw error;

    logger.info("admin.subscription_set", { adminId: user.id, targetUserId: input.user_id, status: input.subscription_status });
    return ok({ profile: data });
  }
);
