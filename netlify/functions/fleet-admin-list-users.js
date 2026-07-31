// ============================================================
// fleet-admin-list-users.js — Lista TODOS los usuarios registrados
// en la plataforma (vía la API admin de GoTrue, ya que auth.users no
// se expone por PostgREST) junto con su perfil de certificación y las
// empresas a las que pertenecen. Exclusivo para administradores.
// ============================================================

const { withHandler } = require("./_lib/handler");
const { requirePlatformAdmin } = require("./_lib/auth");
const { ok } = require("./_lib/response");
const { validate, z } = require("./_lib/validate");

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1)
});

exports.handler = withHandler(
  { name: "fleet-admin-list-users", methods: ["GET"], rateLimit: { limit: 30, windowMs: 60_000 } },
  async ({ event, admin, user }) => {
    await requirePlatformAdmin(admin, user.id);
    const { page } = validate(querySchema, event.queryStringParameters || {});

    const perPage = 50;
    const { data: authList, error: authErr } = await admin.auth.admin.listUsers({ page, perPage });
    if (authErr) throw authErr;

    const ids = authList.users.map((u) => u.id);

    const [{ data: profiles }, { data: memberships }] = await Promise.all([
      admin.from("profiles").select("id, full_name, subscription_status").in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]),
      admin.from("company_members").select("user_id, role, status, companies:company_id (id, name)").in("user_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"])
    ]);

    const profileById = new Map((profiles || []).map((p) => [p.id, p]));
    const membershipsByUser = new Map();
    for (const m of memberships || []) {
      const list = membershipsByUser.get(m.user_id) || [];
      list.push({ company_id: m.companies?.id, company_name: m.companies?.name, role: m.role, status: m.status });
      membershipsByUser.set(m.user_id, list);
    }

    const users = authList.users.map((u) => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      full_name: profileById.get(u.id)?.full_name || null,
      certification_subscription_status: profileById.get(u.id)?.subscription_status || null,
      companies: membershipsByUser.get(u.id) || []
    }));

    return ok({ users, page, per_page: perPage, total: authList.total || users.length });
  }
);
