// ============================================================
// fleet-create-vehicle.js — Alta de unidad. Solo owner/admin.
// ============================================================

const { withHandler } = require("./_lib/handler");
const { requireCompanyRole, requireActiveSubscription } = require("./_lib/auth");
const { validate, parseJsonBody, schemas } = require("./_lib/validate");
const { created } = require("./_lib/response");
const { invalidate } = require("./_lib/cache");

exports.handler = withHandler(
  { name: "fleet-create-vehicle", methods: ["POST"] },
  async ({ event, admin, user }) => {
    const input = validate(schemas.createVehicle, parseJsonBody(event));
    await requireActiveSubscription(admin, user.id);
    await requireCompanyRole(admin, user.id, input.company_id, ["owner", "admin"]);

    const { data, error } = await admin.from("vehicles").insert(input).select().single();
    if (error) throw error;

    await invalidate(`fleet:${input.company_id}:dashboard`);

    return created({ vehicle: data });
  }
);
