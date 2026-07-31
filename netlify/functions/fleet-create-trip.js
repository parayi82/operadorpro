// ============================================================
// fleet-create-trip.js — Módulo 2 (Viáticos): abre un viaje con
// presupuesto asignado. Solo owner/admin autoriza el gasto.
// ============================================================

const { withHandler } = require("./_lib/handler");
const { requireCompanyRole, requireActiveSubscription } = require("./_lib/auth");
const { assertBelongsToCompany } = require("./_lib/tenant");
const { validate, parseJsonBody, z } = require("./_lib/validate");
const { created } = require("./_lib/response");

const schema = z.object({
  company_id: z.string().uuid(),
  vehicle_id: z.string().uuid(),
  driver_id: z.string().uuid(),
  origin: z.string().trim().min(2).max(120),
  destination: z.string().trim().min(2).max(120),
  budget_amount: z.number().nonnegative().max(1_000_000)
});

exports.handler = withHandler(
  { name: "fleet-create-trip", methods: ["POST"] },
  async ({ event, admin, user }) => {
    const input = validate(schema, parseJsonBody(event));
    await requireActiveSubscription(admin, user.id);
    await requireCompanyRole(admin, user.id, input.company_id, ["owner", "admin"]);
    await assertBelongsToCompany(admin, "vehicles", input.vehicle_id, input.company_id, "La unidad");
    await assertBelongsToCompany(admin, "drivers", input.driver_id, input.company_id, "El chofer");

    const { data, error } = await admin.from("trips").insert(input).select().single();
    if (error) throw error;
    return created({ trip: data });
  }
);
