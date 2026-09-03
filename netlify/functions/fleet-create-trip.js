// ============================================================
// fleet-create-trip.js — Abre un viaje. Lo puede abrir el dueño/admin
// (asignándolo a cualquier chofer) o el propio chofer sobre su
// registro (drivers.user_id = él). Además del presupuesto de viáticos
// se captura el flete cobrado y el km inicial: la base de "¿cuánto me
// quedó?" en Cuentas claras.
// ============================================================

const { withHandler } = require("./_lib/handler");
const { requireCompanyRole, requireActiveSubscription } = require("./_lib/auth");
const { assertBelongsToCompany } = require("./_lib/tenant");
const { validate, parseJsonBody, schemas } = require("./_lib/validate");
const { created } = require("./_lib/response");
const { ForbiddenError } = require("./_lib/errors");

exports.handler = withHandler(
  { name: "fleet-create-trip", methods: ["POST"] },
  async ({ event, admin, user }) => {
    const input = validate(schemas.createTrip, parseJsonBody(event));
    await requireActiveSubscription(admin, user.id, input.company_id);
    const role = await requireCompanyRole(admin, user.id, input.company_id, null);
    await assertBelongsToCompany(admin, "vehicles", input.vehicle_id, input.company_id, "La unidad");
    await assertBelongsToCompany(admin, "drivers", input.driver_id, input.company_id, "El chofer");

    if (role === "driver") {
      const { data: drv } = await admin
        .from("drivers").select("user_id").eq("id", input.driver_id).maybeSingle();
      if (drv?.user_id !== user.id) throw new ForbiddenError("Solo puedes abrir viajes a tu nombre");
    }

    const { data, error } = await admin.from("trips").insert(input).select().single();
    if (error) throw error;

    if (input.km_start != null) {
      await admin.from("vehicles")
        .update({ odometer_km: input.km_start })
        .eq("id", input.vehicle_id)
        .or(`odometer_km.is.null,odometer_km.lt.${input.km_start}`);
    }

    return created({ trip: data });
  }
);
