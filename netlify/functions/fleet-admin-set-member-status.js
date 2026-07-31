// ============================================================
// fleet-admin-set-member-status.js — Suspende o reactiva el acceso de
// un usuario a una empresa (company_members.status). Permite al
// administrador de plataforma bloquear una cuenta problemática sin
// afectar al resto de los miembros de esa empresa. Exclusivo admin.
// ============================================================

const { withHandler } = require("./_lib/handler");
const { requirePlatformAdmin } = require("./_lib/auth");
const { validate, parseJsonBody, schemas } = require("./_lib/validate");
const { ok } = require("./_lib/response");
const { NotFoundError } = require("./_lib/errors");
const logger = require("./_lib/logger");

exports.handler = withHandler(
  { name: "fleet-admin-set-member-status", methods: ["POST"], rateLimit: { limit: 30, windowMs: 60_000 } },
  async ({ event, admin, user }) => {
    await requirePlatformAdmin(admin, user.id);
    const input = validate(schemas.adminSetMemberStatus, parseJsonBody(event));

    const { data, error } = await admin
      .from("company_members")
      .update({ status: input.status })
      .eq("company_id", input.company_id)
      .eq("user_id", input.user_id)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new NotFoundError("Membresía no encontrada");

    logger.info("admin.member_status_set", { adminId: user.id, companyId: input.company_id, userId: input.user_id, status: input.status });
    return ok({ member: data });
  }
);
