// ============================================================
// fleet-update-company.js — Edita nombre/RFC/tipo de contribuyente
// (persona física o moral) de la empresa. Solo owner/admin.
//
// NUNCA toca stripe_customer_id/stripe_subscription_id/subscription_status
// — esas columnas solo las escribe fleet-stripe-webhook.js (protegido
// además a nivel de RLS, ver hotfix_billing_rls.sql). No es necesario
// ni posible pasarlas aquí: el UPDATE solo incluye las columnas de este
// endpoint, por diseño.
// ============================================================

const { withHandler } = require("./_lib/handler");
const { requireCompanyRole } = require("./_lib/auth");
const { validate, parseJsonBody, schemas } = require("./_lib/validate");
const { ok } = require("./_lib/response");
const { invalidate } = require("./_lib/cache");

exports.handler = withHandler(
  { name: "fleet-update-company", methods: ["POST"] },
  async ({ event, admin, user }) => {
    const input = validate(schemas.updateCompany, parseJsonBody(event));
    await requireCompanyRole(admin, user.id, input.company_id, ["owner", "admin"]);

    const patch = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.rfc !== undefined) patch.rfc = input.rfc || null;
    if (input.entity_type !== undefined) patch.entity_type = input.entity_type;

    const { data, error } = await admin
      .from("companies")
      .update(patch)
      .eq("id", input.company_id)
      .select()
      .single();
    if (error) throw error;

    await invalidate(`fleet:${input.company_id}:dashboard`);
    return ok({ company: data });
  }
);
