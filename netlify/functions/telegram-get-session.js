// ============================================================
// telegram-get-session.js — Obtiene información de la sesión
// Telegram del usuario (para mostrar en panel web).
// ============================================================

const { withHandler } = require("./_lib/handler");
const { ok } = require("./_lib/response");
const { NotFoundError } = require("./_lib/errors");

exports.handler = withHandler(
  { name: "telegram-get-session", methods: ["GET"] },
  async ({ event, user, admin }) => {
    const companyId = event.queryStringParameters?.company_id;

    if (!companyId) {
      throw new Error("company_id requerido");
    }

    // Obtener sesión de Telegram del usuario en esa empresa
    const { data: session, error } = await admin
      .from("telegram_sessions")
      .select("id, telegram_user_id, authenticated_at, last_activity_at")
      .eq("user_id", user.id)
      .eq("company_id", companyId)
      .single();

    if (error && error.code !== "PGRST116") throw error; // PGRST116 = no rows

    if (!session) {
      throw new NotFoundError("No hay sesión de Telegram vinculada para esta empresa");
    }

    return ok(session);
  }
);
