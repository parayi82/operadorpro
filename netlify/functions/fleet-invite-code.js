// ============================================================
// fleet-invite-code.js — Devuelve (o genera la primera vez) el código
// de patrón de la empresa. El dueño lo comparte por WhatsApp; el
// chofer lo usa en fleet-join-company.
// ============================================================

const { withHandler } = require("./_lib/handler");
const { requireCompanyRole } = require("./_lib/auth");
const { validate, schemas } = require("./_lib/validate");
const { ok } = require("./_lib/response");

exports.handler = withHandler(
  { name: "fleet-invite-code", methods: ["GET"], rateLimit: { limit: 20, windowMs: 60_000 } },
  async ({ event, admin, user }) => {
    const { company_id } = validate(schemas.inviteCode, event.queryStringParameters || {});
    await requireCompanyRole(admin, user.id, company_id, ["owner", "admin"]);

    const { data, error } = await admin.rpc("fn_get_or_create_invite_code", {
      p_actor_user_id: user.id,
      p_company_id: company_id
    });
    if (error) throw error;
    return ok({ invite_code: data });
  }
);
