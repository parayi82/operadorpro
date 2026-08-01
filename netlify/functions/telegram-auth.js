// ============================================================
// telegram-auth.js — Genera código de autenticación para
// vincular Telegram con cuenta de OperadorPro.
// Flujo: usuario recibe código → lo ingresa en el bot →
// bot valida con esta function → se crea sesión Telegram.
// ============================================================

const crypto = require("crypto");
const { withHandler } = require("./_lib/handler");
const { validate, parseJsonBody, schemas } = require("./_lib/validate");
const { ok } = require("./_lib/response");
const { UnauthorizedError } = require("./_lib/errors");

// Generar código de 6 dígitos válido por 15 minutos
function generateAuthCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

exports.handler = withHandler(
  { name: "telegram-auth", methods: ["POST"], rateLimit: { limit: 10, windowMs: 60_000 } },
  async ({ event, user, admin }) => {
    const input = validate(schemas.telegramAuth, parseJsonBody(event));

    const code = generateAuthCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    // Guardar código en BD (no en memoria)
    const { data, error } = await admin
      .from("telegram_auth_codes")
      .insert({
        code,
        user_id: user.id,
        company_id: input.company_id,
        expires_at: expiresAt
      })
      .select()
      .single();

    if (error) throw error;

    // En prod: enviar código por SMS/email, no retornar aquí
    return ok({
      code,
      expiresIn: "15m",
      instructions: "Ingresa este código en el bot de Telegram (@operadorpro_bot /start)"
    });
  }
);

// Validar código y crear sesión Telegram (llamado por telegram-poller)
exports.validateAndCreateSession = async (code, telegramUserId, telegramChatId, admin) => {
  // Buscar código en BD
  const { data: codeData, error: codeError } = await admin
    .from("telegram_auth_codes")
    .select("*")
    .eq("code", code)
    .eq("used", false)
    .single();

  if (codeError || !codeData) {
    throw new UnauthorizedError("Código inválido o expirado");
  }

  // Verificar que no ha expirado
  if (new Date() > new Date(codeData.expires_at)) {
    throw new UnauthorizedError("Código expirado");
  }

  const { user_id, company_id } = codeData;

  // Marcar código como usado
  await admin
    .from("telegram_auth_codes")
    .update({ used: true, used_at: new Date().toISOString() })
    .eq("id", codeData.id);

  // Crear/actualizar sesión Telegram
  const { data: sessionData, error: sessionError } = await admin
    .from("telegram_sessions")
    .upsert({
      telegram_user_id: telegramUserId,
      telegram_chat_id: telegramChatId,
      user_id,
      company_id,
      authenticated_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString()
    }, { onConflict: "user_id,company_id" })
    .select()
    .single();

  if (sessionError) throw sessionError;

  return sessionData;
};

// Recuperar sesión Telegram por telegram_user_id
exports.getSession = async (telegramUserId, admin) => {
  const { data, error } = await admin
    .from("telegram_sessions")
    .select("*")
    .eq("telegram_user_id", telegramUserId)
    .single();

  if (error && error.code !== "PGRST116") throw error; // PGRST116 = no rows
  return data;
};
