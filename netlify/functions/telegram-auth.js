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

// Guardamos códigos en caché en memoria (en prod sería mejor Redis).
// Estructura: { code: { user_id, company_id, created_at, expires_at } }
const authCodes = new Map();

exports.handler = withHandler(
  { name: "telegram-auth", methods: ["POST"], rateLimit: { limit: 10, windowMs: 60_000 } },
  async ({ event, user, admin }) => {
    const input = validate(schemas.telegramAuth, parseJsonBody(event));

    const code = generateAuthCode();
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutos

    authCodes.set(code, {
      user_id: user.id,
      company_id: input.company_id,
      created_at: Date.now(),
      expires_at: expiresAt
    });

    // En prod: enviar código por SMS/email, no retornar aquí
    return ok({
      code,
      expiresIn: "15m",
      instructions: "Ingresa este código en el bot de Telegram (@operadorpro_bot /start)"
    });
  }
);

// Validar código y crear sesión Telegram (llamado por webhook del bot)
exports.validateAndCreateSession = async (code, telegramUserId, telegramChatId, admin) => {
  const stored = authCodes.get(code);
  if (!stored) throw new UnauthorizedError("Código inválido o expirado");
  if (Date.now() > stored.expires_at) {
    authCodes.delete(code);
    throw new UnauthorizedError("Código expirado");
  }

  const { user_id, company_id } = stored;

  // Crear/actualizar sesión Telegram
  const { data, error } = await admin
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

  if (error) throw error;

  authCodes.delete(code);
  return data;
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
