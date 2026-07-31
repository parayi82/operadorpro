// ============================================================
// auth.js — Verificación de sesión (JWT de Supabase Auth) y RBAC
// por empresa. Capa de interfaz: traduce el token en un "actor"
// que los casos de uso pueden autorizar sin volver a tocar HTTP.
// ============================================================

const { AuthError, ForbiddenError } = require("./errors");

async function requireUser(event, admin) {
  const authHeader = event.headers.authorization || event.headers.Authorization || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) throw new AuthError("Falta el encabezado Authorization");

  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) throw new AuthError("Sesión no válida o expirada");

  return { id: data.user.id, email: data.user.email };
}

// Verifica que el usuario pertenezca a la empresa con alguno de los roles dados.
// No confía en RLS como única barrera: falla rápido con 403 explícito.
async function requireCompanyRole(admin, userId, companyId, roles) {
  const { data, error } = await admin
    .from("company_members")
    .select("role, status")
    .eq("company_id", companyId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (error) throw error;
  if (!data || (roles && !roles.includes(data.role))) {
    throw new ForbiddenError("No perteneces a esta empresa con el rol requerido");
  }
  return data.role;
}

// Flota está incluida en la suscripción de certificación (Esencial o
// Protegido) del usuario que actúa — no hay cobro aparte por unidad.
// Se verifica sobre profiles.subscription_status (no sobre la empresa):
// dos miembros de la misma empresa pueden tener planes distintos.
async function requireActiveSubscription(admin, userId) {
  const { data, error } = await admin
    .from("profiles")
    .select("subscription_status")
    .eq("id", userId)
    .single();

  if (error) throw error;
  if (data?.subscription_status !== "active") {
    throw new ForbiddenError("Necesitas un plan de certificación activo (Esencial o Protegido) para usar el módulo de flota");
  }
}

// Verifica que el usuario sea administrador de PLATAFORMA (acceso
// transversal a todas las empresas). platform_admins no tiene ninguna
// política RLS a propósito — esta consulta solo puede resolverla el
// cliente admin (service role, que ignora RLS). Usar SIEMPRE como
// primer chequeo en cualquier función fleet-admin-*.js, antes de tocar
// cualquier otro dato.
async function requirePlatformAdmin(admin, userId) {
  const { data, error } = await admin
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new ForbiddenError("Acceso exclusivo para administradores de la plataforma");
}

module.exports = { requireUser, requireCompanyRole, requireActiveSubscription, requirePlatformAdmin };
