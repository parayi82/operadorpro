// ============================================================
// fleet-close-trip.js — Cierra el viaje y concilia gasto vs.
// presupuesto en una sola transacción de BD (fn_close_trip_and_reconcile),
// evitando estados intermedios inconsistentes.
// ============================================================

const { withHandler } = require("./_lib/handler");
const { requireActiveSubscription } = require("./_lib/auth");
const { validate, parseJsonBody, schemas, z } = require("./_lib/validate");
const { ok } = require("./_lib/response");

const schema = z.object({ trip_id: schemas.uuid });

exports.handler = withHandler(
  { name: "fleet-close-trip", methods: ["POST"] },
  async ({ event, admin, user }) => {
    const { trip_id } = validate(schema, parseJsonBody(event));
    await requireActiveSubscription(admin, user.id);
    // RBAC y "trip not found" se validan dentro de fn_close_trip_and_reconcile
    // (mismo patrón que fn_register_payment): una sola transacción autoritativa.
    const { data, error } = await admin.rpc("fn_close_trip_and_reconcile", {
      p_actor_user_id: user.id,
      p_trip_id: trip_id
    });
    if (error) throw error;
    return ok({ trip: data });
  }
);
