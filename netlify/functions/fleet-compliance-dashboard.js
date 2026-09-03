// ============================================================
// fleet-compliance-dashboard.js — Semáforo de cumplimiento por
// unidad/chofer. Lectura de alto tráfico (se abre cada vez que el
// dueño entra al panel): cacheada 45s en Upstash, invalidada de forma
// activa al escribir un documento nuevo.
// ============================================================

const { withHandler } = require("./_lib/handler");
const { requireCompanyRole, requireActiveSubscription } = require("./_lib/auth");
const { validate, z } = require("./_lib/validate");
const { ok } = require("./_lib/response");
const { getCached, setCached } = require("./_lib/cache");

const querySchema = z.object({ company_id: z.string().uuid() });

exports.handler = withHandler(
  { name: "fleet-compliance-dashboard", methods: ["GET"], rateLimit: { limit: 60, windowMs: 60_000 } },
  async ({ event, admin, user }) => {
    const { company_id } = validate(querySchema, event.queryStringParameters || {});
    await requireActiveSubscription(admin, user.id, company_id);
    await requireCompanyRole(admin, user.id, company_id, null);

    const cacheKey = `fleet:${company_id}:dashboard`;
    const cached = await getCached(cacheKey);
    if (cached) return ok({ documents: cached, cached: true });

    const { data, error } = await admin
      .from("compliance_status_v")
      .select("id, vehicle_id, driver_id, doc_type, expires_at, days_to_expire, semaforo")
      .eq("company_id", company_id)
      .order("expires_at", { ascending: true });

    if (error) throw error;
    await setCached(cacheKey, data, 45);
    return ok({ documents: data, cached: false });
  }
);
