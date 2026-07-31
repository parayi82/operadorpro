// ============================================================
// fleet-admin-set-subscription.js — Activa/desactiva manualmente la
// suscripción de flota de una empresa, sin pasar por Stripe (para
// tratos negociados, cortesías, o corregir un desajuste). Exclusivo
// para administradores de plataforma.
//
// Esta es la ÚNICA vía además del webhook de Stripe que puede escribir
// subscription_status — y solo llega aquí tras requirePlatformAdmin(),
// usando el cliente admin (service role, ignora la protección RLS que
// blindamos en hotfix_billing_rls.sql para el resto de los casos).
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

    const { data, error } = await admin
      .from("companies")
      .update({ subscription_status: input.subscription_status })
      .eq("id", input.company_id)
      .select()
      .single();
    if (error) throw error;

    logger.info("admin.subscription_set", { adminId: user.id, companyId: input.company_id, status: input.subscription_status });
    return ok({ company: data });
  }
);
