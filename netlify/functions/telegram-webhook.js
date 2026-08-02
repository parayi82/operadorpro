// ============================================================
// telegram-webhook.js — Webhook receiver para Telegram Bot API
// Reemplaza polling por webhook instantáneo
// Se ejecuta cuando Telegram envía updates (casi instantáneo)
// ============================================================

const { createClient } = require("@supabase/supabase-js");
const logger = require("./_lib/logger");
const telegramAuth = require("./telegram-auth");
const telegramSender = require("./telegram-send-message");
const telegramConversation = require("./telegram-conversation");
const telegramPhotoHandler = require("./telegram-photo-handler");

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN not set");

async function handleMessage(admin, message) {
  const telegramUserId = message.from.id.toString();
  const chatId = message.chat.id.toString();
  const text = (message.text || "").trim();

  if (message.photo && message.photo.length > 0) {
    await handlePhotoMessage(admin, telegramUserId, chatId, message.photo);
    return;
  }

  if (!text) return;

  try {
    let session = await telegramAuth.getSession(telegramUserId, admin);

    if (text.startsWith("/start")) {
      if (session) {
        await showMenu(chatId, session, admin);
      } else {
        await telegramSender.send(chatId, "👋 Bienvenido a OperadorPro Telegram.\n\nPara vincular tu cuenta, necesitas un codigo de autenticacion.\n\nAbre la app web en tu dispositivo en la seccion de configuracion y solicita un codigo. Luego escribe aqui:\n\n/auth CODIGO");
      }
      return;
    }

    if (text.startsWith("/auth ")) {
      const code = text.substring(6).trim();
      try {
        const newSession = await telegramAuth.validateAndCreateSession(code, telegramUserId, chatId, admin);
        session = newSession;
        await telegramSender.send(chatId, "✅ ¡Cuenta vinculada! Ahora puedes usar el bot.");
        await showMenu(chatId, session, admin);
      } catch (e) {
        await telegramSender.send(chatId, `❌ ${e.message}`);
      }
      return;
    }

    if (!session) {
      if (!text.startsWith("/")) {
        logger.info("telegram.unauthenticated_message_ignored", { telegramUserId });
        return;
      }
      await telegramSender.send(chatId, "⚠️ No estás autenticado. Usa /start para comenzar.");
      return;
    }

    await admin.from("telegram_sessions").update({ last_activity_at: new Date().toISOString() }).eq("id", session.id);

    const convState = await telegramConversation.getOrCreateConversationState(session.id, admin);

    if (convState && convState.flow_type !== "none") {
      await telegramConversation.handleConversationMessage(chatId, text, session, admin);
      return;
    }

    if (text === "🔍 Inspeccionar" || text === "1") {
      await telegramConversation.startFlow(chatId, "inspection", session, admin);
      await telegramSender.send(chatId, "🔍 Nueva Inspeccion Pre-Viaje\n\nSelecciona la unidad (ingresa numero economico):");
      return;
    }

    if (text === "🚗 Crear Viaje" || text === "2") {
      await telegramConversation.startFlow(chatId, "trip", session, admin);
      await telegramSender.send(chatId, "🚗 Crear Viaje\n\nEscribe el origen (ciudad/direccion):");
      return;
    }

    if (text === "⛽ Reportar Gasto" || text === "3") {
      await telegramConversation.startFlow(chatId, "expense", session, admin);
      await telegramSender.send(chatId, "⛽ Reportar Gasto de Viaje\n\nCual es el ID del viaje?");
      return;
    }

    if (text === "📋 Ver Estado" || text === "4") {
      try {
        const { data: docs } = await admin.from("compliance_status_v").select("*").eq("company_id", session.company_id).limit(5);
        const docStatus = docs?.map(d => {
          const emoji = d.semaforo === "vencido" ? "🔴" : d.semaforo === "por_vencer" ? "🟡" : "🟢";
          return `${emoji} ${d.doc_type}: ${d.expires_at}`;
        }).join("\n") || "Sin documentos";
        await telegramSender.send(chatId, `📋 Estado de Documentos\n\n${docStatus}\n\nMás detalles en la app web.`);
      } catch (e) {
        await telegramSender.send(chatId, "❌ Error al recuperar estado");
      }
      return;
    }

    if (text === "↩️ Menú Principal") {
      await showMenu(chatId, session, admin);
      return;
    }

    await telegramSender.send(chatId, "No entiendo ese comando. Usa los botones del menú.");
  } catch (e) {
    logger.error("telegram.message_error", { telegramUserId, error: e.message });
    await telegramSender.send(chatId, "❌ Error: " + e.message);
  }
}

async function showMenu(chatId, session, admin) {
  try {
    const { data: profile } = await admin.from("profiles").select("full_name, subscription_status, plan").eq("id", session.user_id).single();
    const status = profile?.subscription_status === "active" ? "✅" : "⚠️";
    const plan = profile?.plan || "esencial";
    const buttons = [["🔍 Inspeccionar", "🚗 Crear Viaje"], ["⛽ Reportar Gasto", "📋 Ver Estado"], ["↩️ Menu Principal"]];
    await telegramSender.send(chatId, `👤 ${profile?.full_name || "Operador"}\n${status} Plan: ${plan === "protegido" ? "Protegido (asesoría legal)" : "Esencial"}\n\nQue deseas hacer?`, buttons);
  } catch (e) {
    logger.error("telegram.menu_error", { chatId, error: e.message });
  }
}

async function handlePhotoMessage(admin, telegramUserId, chatId, photos) {
  try {
    const session = await telegramAuth.getSession(telegramUserId, admin);
    if (!session) {
      await telegramSender.send(chatId, "⚠️ Primero autenticate con /start");
      return;
    }
    const convState = await telegramConversation.getOrCreateConversationState(session.id, admin);
    if (convState.flow_type === "none") {
      await telegramSender.send(chatId, "Usa los botones del menu para enviar fotos.");
      return;
    }
    const photo = photos[photos.length - 1];
    const fileId = photo.file_id;
    if (convState.flow_type === "inspection") {
      const photoUrl = await telegramPhotoHandler.processPhotoForInspection(fileId, chatId, session, convState, "inspeccion", admin);
      const ctx = convState.context || {};
      ctx.photos = ctx.photos || [];
      ctx.photos.push(photoUrl);
      await telegramConversation.updateConversationState(convState.id, "inspection", convState.current_step, ctx, admin);
      const remaining = Math.max(0, 5 - ctx.photos.length);
      const buttons = [["✅ Listo"], ["⏭️ Sin fotos"]];
      await telegramSender.send(chatId, `Foto registrada (${ctx.photos.length}/5).\n\n${remaining > 0 ? `Envía ${remaining} más:` : "¡Listo! Continúa:"}`, buttons);
    } else if (convState.flow_type === "expense") {
      const photoUrl = await telegramPhotoHandler.processPhotoForExpense(fileId, chatId, session, admin);
      const ctx = convState.context || {};
      ctx.receipt_url = photoUrl;
      await telegramConversation.updateConversationState(convState.id, "expense", convState.current_step + 1, ctx, admin);
      await telegramConversation.handleConversationMessage(chatId, "listo", session, admin);
    }
  } catch (e) {
    logger.error("telegram.photo_message_error", { error: e.message });
    await telegramSender.send(chatId, "Error al procesar foto. Intenta de nuevo.");
  }
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }
  try {
    const body = JSON.parse(event.body || "{}");
    console.log("DEBUG: Webhook received", { update_id: body.update_id });
    const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    if (body.message) {
      console.log("DEBUG: Processing message", { update_id: body.update_id, user_id: body.message.from.id });
      await handleMessage(admin, body.message);
    }
    logger.info("telegram.webhook_processed", { update_id: body.update_id });
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (error) {
    console.error("CRITICAL ERROR en telegram-webhook:", error);
    logger.error("telegram.webhook_error", { error: error.message });
    return { statusCode: 200, body: JSON.stringify({ ok: false, error: error.message }) };
  }
};
