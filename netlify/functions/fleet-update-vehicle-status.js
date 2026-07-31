// ============================================================
// fleet-update-vehicle-status.js — Cambia el estatus de una unidad
// (activa/taller/baja). Solo owner/admin.
// ============================================================

const { withHandler } = require("./_lib/handler");
const { requireCompanyRole, requireActiveSubscription } = require("./_lib/auth");
const { validate, parseJsonBody, schemas } = require("./_lib/validate");
const { ok } = require("./_lib/response");
const { NotFoundError } = require("./_lib/errors");
const { invalidate } = require("./_lib/cache");

exports.handler = withHandler(
  { name: "fleet-update-vehicle-status", methods: ["POST"] },
  async ({ event, admin, user }) => {
    const input = validate(schemas.updateVehicleStatus, parseJsonBody(event));
    await requireActiveSubscription(admin, user.id);
    await requireCompanyRole(admin, user.id, input.company_id, ["owner", "admin"]);

    // El doble .eq (id + company_id) es lo que impide que se actualice
    // una unidad de otra empresa aunque se conozca su vehicle_id.
    const { data, error } = await admin
      .from("vehicles")
      .update({ status: input.status })
      .eq("id", input.vehicle_id)
      .eq("company_id", input.company_id)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new NotFoundError("Unidad no encontrada en esta empresa");

    await invalidate(`fleet:${input.company_id}:dashboard`);

    return ok({ vehicle: data });
  }
);
