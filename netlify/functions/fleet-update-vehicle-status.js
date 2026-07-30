// ============================================================
// fleet-update-vehicle-status.js — Cambia el estatus de una unidad
// (activa/taller/baja). Solo owner/admin. Al cambiar el estatus se
// resincroniza la cantidad de la suscripción de Stripe (best-effort):
// dar de baja una unidad reduce lo que se factura al mes siguiente.
// ============================================================

const { withHandler } = require("./_lib/handler");
const { requireCompanyRole } = require("./_lib/auth");
const { validate, parseJsonBody, schemas } = require("./_lib/validate");
const { ok } = require("./_lib/response");
const { NotFoundError } = require("./_lib/errors");
const { invalidate } = require("./_lib/cache");
const { getStripeAdmin } = require("./_lib/stripeAdmin");
const { syncFleetSubscriptionQuantity } = require("./_lib/stripeSync");

exports.handler = withHandler(
  { name: "fleet-update-vehicle-status", methods: ["POST"] },
  async ({ event, admin, user }) => {
    const input = validate(schemas.updateVehicleStatus, parseJsonBody(event));
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

    if (process.env.STRIPE_SECRET_KEY) {
      await syncFleetSubscriptionQuantity(admin, getStripeAdmin(), input.company_id);
    }

    return ok({ vehicle: data });
  }
);
