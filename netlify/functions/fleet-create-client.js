// ============================================================
// fleet-create-client.js — Módulo 4 (Cobranza): alta de cliente
// (fábrica/intermediario al que se le prestan servicios de flete).
// ============================================================

const { withHandler } = require("./_lib/handler");
const { requireCompanyRole } = require("./_lib/auth");
const { validate, parseJsonBody, z } = require("./_lib/validate");
const { created } = require("./_lib/response");

const schema = z.object({
  company_id: z.string().uuid(),
  name: z.string().trim().min(2).max(120),
  rfc: z.string().trim().max(13).optional(),
  contact_phone: z.string().trim().max(20).optional(),
  contact_email: z.string().email().optional(),
  payment_terms_days: z.number().int().positive().max(180).optional()
});

exports.handler = withHandler(
  { name: "fleet-create-client", methods: ["POST"] },
  async ({ event, admin, user }) => {
    const input = validate(schema, parseJsonBody(event));
    await requireCompanyRole(admin, user.id, input.company_id, ["owner", "admin"]);

    const { data, error } = await admin.from("clients").insert(input).select().single();
    if (error) throw error;
    return created({ client: data });
  }
);
