// ============================================================
// fleet-create-vehicle.js — Alta de unidad. Solo owner/admin.
// ============================================================

const { withHandler } = require("./_lib/handler");
const { requireCompanyRole } = require("./_lib/auth");
const { validate, parseJsonBody, schemas } = require("./_lib/validate");
const { created } = require("./_lib/response");
const { invalidate } = require("./_lib/cache");
const { getStripeAdmin } = require("./_lib/stripeAdmin");
const { syncFleetSubscriptionQuantity } = require("./_lib/stripeSync");

exports.handler = withHandler(
  { name: "fleet-create-vehicle", methods: ["POST"] },
  async ({ event, admin, user }) => {
    const input = validate(schemas.createVehicle, parseJsonBody(event));
    await requireCompanyRole(admin, user.id, input.company_id, ["owner", "admin"]);

    const { data, error } = await admin.from("vehicles").insert(input).select().single();
    if (error) throw error;

    await invalidate(`fleet:${input.company_id}:dashboard`);

    // Best-effort: si la empresa ya paga por unidad, ajusta la cantidad de
    // la suscripción. Nunca bloquea el alta de la unidad si Stripe falla.
    if (process.env.STRIPE_SECRET_KEY) {
      await syncFleetSubscriptionQuantity(admin, getStripeAdmin(), input.company_id);
    }

    return created({ vehicle: data });
  }
);
