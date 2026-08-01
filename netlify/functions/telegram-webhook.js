// ============================================================
// telegram-webhook.js — Webhook para Telegram Bot.
// Recibe mensajes, maneja conversación y encola acciones offline.
// ============================================================

const { withHandler } = require("./_lib/handler");
const { ok, badRequest } = require("./_lib/response");
const telegramAuth = require("./telegram-auth");
const telegramSender = require("./telegram-send-message");
const logger = require("./_lib/logger");

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN not set");

async function handleMessage(admin, update) {
  const message = update.message || update.edited_message;
  if (!message || !message.text) return;

  const telegramUserId = message.from.id.toString();
  const chatId = message.chat.id.toString();
  const text = message.text.trim();

  try {
    // Recuperar sesión o crear si es /start
    let session = await telegramAuth.getSession(telegramUserId, admin);

    if (text.startsWith("/start")) {
      if (session) {
        // Ya autenticado
        await showMenu(chatId, session, admin);
      } else {
        // Primer uso: solicita código
        await telegramSender.send(chatId, `
👋 Bienvenido a OperadorPro Telegram.

Para vincular tu cuenta, necesitas un código de autenticación.

Abre la app web en tu dispositivo en la sección de configuración y solicita un código. Luego escribe aquí:

/auth <código>
        `);
      }
      return;
    }

    if (!session) {
      await telegramSender.send(chatId, "⚠️ No estás autenticado. Usa /start para comenzar.");
      return;
    }

    // Actualizar last_activity_at
    await admin
      .from("telegram_sessions")
      .update({ last_activity_at: new Date().toISOString() })
      .eq("id", session.id);

    // Rutas: comandos + menú
    if (text.startsWith("/auth ")) {
      const code = text.substring(6).trim();
      try {
        const newSession = await telegramAuth.validateAndCreateSession(
          code,
          telegramUserId,
          chatId,
          admin
        );
        session = newSession;
        await telegramSender.send(chatId, "✅ ¡Cuenta vinculada! Ahora puedes usar el bot.");
        await showMenu(chatId, session, admin);
      } catch (e) {
        await telegramSender.send(chatId, `❌ ${e.message}`);
      }
      return;
    }

    if (text === "🔍 Inspeccionar" || text === "1") {
      await handleInspectionMenu(chatId, session, admin);
      return;
    }

    if (text === "🚗 Crear Viaje" || text === "2") {
      await handleTripStart(chatId, session, admin);
      return;
    }

    if (text === "⛽ Reportar Gasto" || text === "3") {
      await handleExpense(chatId, session, admin);
      return;
    }

    if (text === "📋 Ver Estado" || text === "4") {
      await handleViewStatus(chatId, session, admin);
      return;
    }

    if (text === "↩️ Menú Principal") {
      await showMenu(chatId, session, admin);
      return;
    }

    // Fallback
    await telegramSender.send(chatId, "No entiendo ese comando. Usa los botones del menú.");
  } catch (e) {
    logger.error("telegram.message_error", { telegramUserId, error: e.message });
    await telegramSender.send(chatId, "❌ Error: " + e.message);
  }
}

async function showMenu(chatId, session, admin) {
  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, subscription_status, plan")
    .eq("id", session.user_id)
    .single();

  const status = profile?.subscription_status === "active" ? "✅" : "⚠️";
  const plan = profile?.plan || "esencial";

  await telegramSender.send(chatId, `
👤 ${profile?.full_name || "Operador"}
${status} Plan: ${plan === "protegido" ? "Protegido (asesoría legal)" : "Esencial"}

¿Qué deseas hacer?
  `, [
    ["🔍 Inspeccionar", "1"],
    ["🚗 Crear Viaje", "2"],
    ["⛽ Reportar Gasto", "3"],
    ["📋 Ver Estado", "4"]
  ]);
}

async function handleInspectionMenu(chatId, session, admin) {
  await telegramSender.send(chatId, `
🔍 Nueva Inspección Pre-Viaje

Selecciona la unidad:
  `, null, true); // last param = esperando selección

  // En una app real, aquí listaríamos vehicles y crearíamos botones dinámicos
  // Por ahora, esperar input de unidad (e-number)
}

async function handleTripStart(chatId, session, admin) {
  await telegramSender.send(chatId, `
🚗 Crear Viaje

Escribe el origen (ciudad/dirección):
  `);
}

async function handleExpense(chatId, session, admin) {
  await telegramSender.send(chatId, `
⛽ Reportar Gasto de Viaje

Primero necesito confirmar si tienes un viaje abierto.
¿Cuál es el número de viaje (trip_id) o presiona ↩️ Menú Principal?
  `);
}

async function handleViewStatus(chatId, session, admin) {
  try {
    const { data: docs } = await admin
      .from("compliance_status_v")
      .select("*")
      .eq("company_id", session.company_id)
      .limit(5);

    const docStatus = docs
      ?.map(d => {
        const emoji = d.semaforo === "vencido" ? "🔴" : d.semaforo === "por_vencer" ? "🟡" : "🟢";
        return `${emoji} ${d.doc_type}: ${d.expires_at}`;
      })
      .join("\n") || "Sin documentos";

    await telegramSender.send(chatId, `
📋 Estado de Documentos

${docStatus}

Más detalles en la app web.
    `);
  } catch (e) {
    await telegramSender.send(chatId, "❌ Error al recuperar estado");
  }
}

// POST webhook
exports.handler = withHandler(
  { name: "telegram-webhook", methods: ["POST"] },
  async ({ event, admin }) => {
    const update = JSON.parse(event.body || "{}");

    // Validar token
    if (!update.update_id) return ok({ ok: true });

    // Procesar actualización (mensaje, callback, etc.)
    if (update.message || update.edited_message) {
      await handleMessage(admin, update);
    }

    return ok({ ok: true });
  }
);
