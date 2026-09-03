// ============================================================
// fleet-close-trip.js — Cierra el viaje y concilia en una sola
// transacción de BD (fn_close_trip_and_reconcile). Guarda km final,
// evidencia de entrega (remisión firmada) y el flete si se conoció
// hasta el cierre; actualiza el odómetro de la unidad.
// Lo puede cerrar owner/admin o el chofer del viaje (validado en la RPC).
// ============================================================

const { withHandler } = require("./_lib/handler");
const { requireActiveSubscription } = require("./_lib/auth");
const { validate, parseJsonBody, schemas } = require("./_lib/validate");
const { ok } = require("./_lib/response");
const { NotFoundError } = require("./_lib/errors");

exports.handler = withHandler(
  { name: "fleet-close-trip", methods: ["POST"] },
  async ({ event, admin, user }) => {
    const input = validate(schemas.closeTrip, parseJsonBody(event));

    const { data: trip } = await admin
      .from("trips").select("id, company_id").eq("id", input.trip_id).maybeSingle();
    if (!trip) throw new NotFoundError("Viaje no encontrado");

    await requireActiveSubscription(admin, user.id, trip.company_id);

    const { data, error } = await admin.rpc("fn_close_trip_and_reconcile", {
      p_actor_user_id: user.id,
      p_trip_id: input.trip_id,
      p_km_end: input.km_end ?? null,
      p_pod_url: input.pod_url ?? null,
      p_freight_amount: input.freight_amount ?? null
    });
    if (error) throw error;
    return ok({ trip: data });
  }
);
