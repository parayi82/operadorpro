// ============================================================
// fleet-create-company.js — Alta de la empresa transportista.
// El usuario autenticado se vuelve 'owner' automáticamente
// (trigger on_company_created en supabase/schema_fleet.sql).
// ============================================================

const { withHandler } = require("./_lib/handler");
const { validate, parseJsonBody, z } = require("./_lib/validate");
const { created } = require("./_lib/response");

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  rfc: z.string().trim().max(13).optional()
});

exports.handler = withHandler(
  { name: "fleet-create-company", methods: ["POST"], rateLimit: { limit: 5, windowMs: 60_000 } },
  async ({ event, admin, user }) => {
    const input = validate(schema, parseJsonBody(event));

    const { data, error } = await admin
      .from("companies")
      .insert({ name: input.name, rfc: input.rfc || null, owner_user_id: user.id })
      .select()
      .single();

    if (error) throw error;
    return created({ company: data });
  }
);
