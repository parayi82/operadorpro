// ============================================================
// fleet-register-payment.js — Marca una factura como pagada y
// cancela sus recordatorios pendientes en una sola transacción
// (fn_register_payment).
// ============================================================

const { withHandler } = require("./_lib/handler");
const { validate, parseJsonBody, schemas, z } = require("./_lib/validate");
const { ok } = require("./_lib/response");

const schema = z.object({ invoice_id: schemas.uuid });

exports.handler = withHandler(
  { name: "fleet-register-payment", methods: ["POST"] },
  async ({ event, admin, user }) => {
    const { invoice_id } = validate(schema, parseJsonBody(event));
    const { data, error } = await admin.rpc("fn_register_payment", {
      p_actor_user_id: user.id,
      p_invoice_id: invoice_id
    });
    if (error) throw error;
    return ok({ invoice: data });
  }
);
