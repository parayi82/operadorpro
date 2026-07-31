// ============================================================
// fleet-admin-list-companies.js — Lista TODAS las empresas de la
// plataforma (cruza el aislamiento normal por RLS/company_members a
// propósito). Exclusivo para administradores de plataforma —
// requirePlatformAdmin() es el primer chequeo, antes de tocar
// cualquier dato.
// ============================================================

const { withHandler } = require("./_lib/handler");
const { requirePlatformAdmin } = require("./_lib/auth");
const { ok } = require("./_lib/response");

exports.handler = withHandler(
  { name: "fleet-admin-list-companies", methods: ["GET"], rateLimit: { limit: 30, windowMs: 60_000 } },
  async ({ admin, user }) => {
    await requirePlatformAdmin(admin, user.id);

    const { data: companies, error } = await admin
      .from("companies")
      .select("id, name, rfc, entity_type, plan, subscription_status, owner_user_id, created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;

    const { data: vehicles } = await admin.from("vehicles").select("company_id, status");
    const vehicleCounts = new Map();
    for (const v of vehicles || []) {
      if (v.status !== "activa") continue;
      vehicleCounts.set(v.company_id, (vehicleCounts.get(v.company_id) || 0) + 1);
    }

    // auth.users no es una tabla PostgREST expuesta: el correo del
    // dueño se resuelve una por una vía la API admin de GoTrue.
    const owners = await Promise.all(
      companies.map((c) => admin.auth.admin.getUserById(c.owner_user_id).then(
        (r) => r.data?.user?.email || null,
        () => null
      ))
    );

    const result = companies.map((c, i) => ({
      ...c,
      owner_email: owners[i],
      active_vehicles: vehicleCounts.get(c.id) || 0
    }));

    return ok({ companies: result });
  }
);
