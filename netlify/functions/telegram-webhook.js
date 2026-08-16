// ============================================================
// telegram-webhook.js — Webhook receiver para Telegram Bot API
// ============================================================

const { createClient } = require("@supabase/supabase-js");
const logger = require("./_lib/logger");
const telegramAuth = require("./telegram-auth");
const telegramSender = require("./telegram-send-message");
const telegramConversation = require("./telegram-conversation");
const telegramPhotoHandler = require("./telegram-photo-handler");
const { analyzeReceiptWithClaude, categoryEmoji } = require("./_lib/vision");

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// ---------- Mensaje de texto ----------
async function handleMessage(admin, message) {
  const telegramUserId = message.from.id.toString();
  const chatId = message.chat.id.toString();
  const text = (message.text || "").trim();

  // Fotos dentro de un caption también llegan como message.photo
  if (message.photo && message.photo.length > 0) {
    await handlePhotoMessage(admin, telegramUserId, chatId, message.photo);
    return;
  }

  // Nota de voz o archivo de audio
  if (message.voice || message.audio) {
    await handleVoiceMessage(admin, telegramUserId, chatId);
    return;
  }

  if (!text) return;

  try {
    let session = await telegramAuth.getSession(telegramUserId, admin);

    // ---------- Comandos sin sesión ----------
    if (text.startsWith("/start")) {
      if (session) {
        await showMenu(chatId, session, admin);
      } else {
        await telegramSender.send(chatId,
          "👋 Bienvenido a OperadorPro.\n\nPara vincular tu cuenta ve a la app web → Perfil → Generar código de Telegram.\nLuego escríbeme:\n\n/auth CODIGO"
        );
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
      if (!text.startsWith("/")) return;
      await telegramSender.send(chatId, "⚠️ No estás autenticado. Usa /start para comenzar.");
      return;
    }

    await admin.from("telegram_sessions")
      .update({ last_activity_at: new Date().toISOString() })
      .eq("id", session.id);

    const convState = await telegramConversation.getOrCreateConversationState(session.id, admin);

    // Confirmación de gasto auto-detectado por IA
    if (convState?.context?.pending_expense) {
      await telegramConversation.handlePendingExpenseReply(chatId, text, session, convState, admin);
      return;
    }

    // Flujo multi-paso activo
    if (convState && convState.flow_type !== "none") {
      await telegramConversation.handleConversationMessage(chatId, text, session, admin);
      return;
    }

    // ---------- Menú principal ----------
    if (text === "🔍 Inspeccionar" || text === "1") {
      await telegramConversation.startFlow(chatId, "inspection", session, admin);
      await telegramSender.send(chatId, "🔍 Nueva Inspección Pre-Viaje\n\nSelecciona la unidad (escribe el número económico):");
      return;
    }
    if (text === "🚗 Crear Viaje" || text === "2") {
      await telegramConversation.startFlow(chatId, "trip", session, admin);
      await telegramSender.send(chatId, "🚗 Crear Viaje\n\nEscribe el origen (ciudad/dirección):");
      return;
    }
    if (text === "⛽ Reportar Gasto" || text === "3") {
      await telegramConversation.startFlow(chatId, "expense", session, admin);
      // Mostrar viajes abiertos de inmediato en vez de pedir ID manualmente
      const { data: trips } = await admin.from("trips")
        .select("id, origin, destination")
        .eq("company_id", session.company_id).eq("status", "abierto")
        .order("created_at", { ascending: false }).limit(4);
      if (!trips || trips.length === 0) {
        await telegramSender.send(chatId, "No hay viajes abiertos. Crea uno primero con 🚗 Crear Viaje.");
        await telegramConversation.resetConversation(
          (await telegramConversation.getOrCreateConversationState(session.id, admin)).id, admin
        );
        return;
      }
      const buttons = trips.map((t) => [`${t.origin} → ${t.destination}`]);
      await telegramSender.send(chatId, "⛽ Reportar Gasto\n\nSelecciona el viaje:", buttons);
      return;
    }
    if (text === "📋 Ver Estado" || text === "4") {
      try {
        const { data: docs } = await admin.from("compliance_status_v")
          .select("*").eq("company_id", session.company_id).limit(5);
        const docStatus = docs?.map((d) => {
          const emoji = d.semaforo === "vencido" ? "🔴" : d.semaforo === "por_vencer" ? "🟡" : "🟢";
          return `${emoji} ${d.doc_type}: ${d.expires_at}`;
        }).join("\n") || "Sin documentos registrados.";
        await telegramSender.send(chatId, `📋 Estado de Documentos\n\n${docStatus}\n\nMás detalles en la app web.`);
      } catch (e) {
        await telegramSender.send(chatId, "❌ Error al recuperar estado.");
      }
      return;
    }
    if (text === "↩️ Menú Principal" || text === "↩️ Menu Principal") {
      await showMenu(chatId, session, admin);
      return;
    }

    // Texto no reconocido: mostrar menú con hint
    await telegramSender.send(chatId,
      "No entendí ese mensaje. Puedes enviar la <b>foto de un ticket</b> directo y lo registro automáticamente, o usa el menú:"
    );
    await showMenu(chatId, session, admin);
  } catch (e) {
    logger.error("telegram.message_error", { telegramUserId, error: e.message });
    await telegramSender.send(chatId, "❌ Error inesperado: " + e.message);
  }
}

// ---------- Foto ----------
async function handlePhotoMessage(admin, telegramUserId, chatId, photos) {
  try {
    const session = await telegramAuth.getSession(telegramUserId, admin);
    if (!session) {
      await telegramSender.send(chatId, "⚠️ Primero autentícate con /start");
      return;
    }

    const convState = await telegramConversation.getOrCreateConversationState(session.id, admin);

    // Dentro de un flujo activo: comportamiento original
    if (convState.flow_type !== "none") {
      const photo = photos[photos.length - 1];
      const fileId = photo.file_id;

      if (convState.flow_type === "inspection") {
        const photoUrl = await telegramPhotoHandler.processPhotoForInspection(
          fileId, chatId, session, convState, "inspeccion", admin
        );
        const ctx = convState.context || {};
        ctx.photos = ctx.photos || [];
        ctx.photos.push(photoUrl);
        await telegramConversation.updateConversationState(convState.id, "inspection", convState.current_step, ctx, admin);
        const remaining = Math.max(0, 5 - ctx.photos.length);
        const buttons = [["✅ Listo"], ["⏭️ Sin fotos"]];
        await telegramSender.send(chatId,
          `Foto registrada (${ctx.photos.length}/5).\n\n${remaining > 0 ? `Envía ${remaining} más o` : "¡Completas!"} continúa:`,
          buttons
        );
      } else if (convState.flow_type === "expense") {
        const photoUrl = await telegramPhotoHandler.processPhotoForExpense(fileId, chatId, session, admin);
        const ctx = convState.context || {};
        ctx.receipt_url = photoUrl;
        await telegramConversation.updateConversationState(convState.id, "expense", convState.current_step + 1, ctx, admin);
        await telegramConversation.handleConversationMessage(chatId, "listo", session, admin);
      }
      return;
    }

    // Fuera de flujo: DETECCIÓN INTELIGENTE
    await telegramSender.send(chatId, "🔍 Analizando tu foto…");

    const photo = photos[photos.length - 1];
    let photoUrl;
    try {
      photoUrl = await telegramPhotoHandler.processPhotoForExpense(photo.file_id, chatId, session, admin);
    } catch (e) {
      logger.error("telegram.smart_photo_upload_error", { error: e.message });
      await telegramSender.send(chatId, "❌ No pude subir la foto. Intenta de nuevo.");
      return;
    }

    const analysis = await analyzeReceiptWithClaude(photoUrl);

    if (analysis?.is_receipt && analysis?.amount > 0) {
      // Ticket detectado — buscar viaje abierto más reciente
      const { data: trips } = await admin.from("trips")
        .select("id, origin, destination")
        .eq("company_id", session.company_id).eq("status", "abierto")
        .order("created_at", { ascending: false }).limit(4);

      const cat = analysis.category || "otro";
      const amount = analysis.amount;
      const vendorNote = analysis.vendor ? ` (${analysis.vendor})` : "";

      const pending = { amount, category: cat, receipt_url: photoUrl, trip_id: trips?.[0]?.id || null };
      const newCtx = { pending_expense: pending };
      await telegramConversation.updateConversationState(convState.id, "none", 0, newCtx, admin);

      if (!trips || trips.length === 0) {
        const buttons = [["🚗 Crear Viaje", "❌ Cancelar"]];
        await telegramSender.send(chatId,
          `Detecté un ticket${vendorNote}:\n${categoryEmoji(cat)} ${cat.toUpperCase()} — $${amount} MXN\n\n⚠️ No hay viajes abiertos. Crea uno primero.`,
          buttons
        );
        return;
      }

      const defaultTrip = trips[0];
      const tripButtons = trips.length === 1
        ? [["✅ Confirmar", "❌ Cancelar"]]
        : [...trips.map((t) => [`${t.origin} → ${t.destination}`]), ["✅ Confirmar", "❌ Cancelar"]];

      await telegramSender.send(chatId,
        `Detecté un ticket${vendorNote}:\n${categoryEmoji(cat)} ${cat.toUpperCase()} — <b>$${amount} MXN</b>\n\nViaje: <b>${defaultTrip.origin} → ${defaultTrip.destination}</b>\n\n¿Lo registro?`,
        tripButtons
      );
      return;
    }

    // No es ticket — ofrecer opciones
    const buttons = [["⛽ Reportar Gasto", "🔍 Inspeccionar"], ["↩️ Menú Principal"]];
    await telegramSender.send(chatId,
      "No reconocí un ticket en esa foto.\n\n💡 Para gastos, fotografía el ticket o recibo completo. ¿Qué deseas hacer?",
      buttons
    );
  } catch (e) {
    logger.error("telegram.photo_message_error", { error: e.message });
    await telegramSender.send(chatId, "Error al procesar foto. Intenta de nuevo.");
  }
}

// ---------- Nota de voz ----------
async function handleVoiceMessage(admin, telegramUserId, chatId) {
  try {
    const session = await telegramAuth.getSession(telegramUserId, admin);
    if (!session) {
      await telegramSender.send(chatId, "⚠️ Primero autentícate con /start");
      return;
    }

    // Por ahora: guiar al usuario a enviar la foto del ticket
    // (transcripción de audio en desarrollo)
    const buttons = [["⛽ Reportar Gasto", "🔍 Inspeccionar"], ["↩️ Menú Principal"]];
    await telegramSender.send(chatId,
      "🎤 Recibí tu nota de voz.\n\nPor el momento el registro más rápido es con la <b>foto del ticket</b> — solo envíala y la proceso automáticamente.\n\n¿O prefieres usar el menú?",
      buttons
    );
  } catch (e) {
    logger.error("telegram.voice_message_error", { error: e.message });
  }
}

// ---------- Menú principal ----------
async function showMenu(chatId, session, admin) {
  try {
    const { data: profile } = await admin.from("profiles")
      .select("full_name, subscription_status, plan").eq("id", session.user_id).single();
    const status = profile?.subscription_status === "active" ? "✅" : "⚠️";
    const plan = profile?.plan === "protegido" ? "Protegido" : "Esencial";
    const buttons = [
      ["🔍 Inspeccionar", "🚗 Crear Viaje"],
      ["⛽ Reportar Gasto", "📋 Ver Estado"],
      ["↩️ Menú Principal"]
    ];
    await telegramSender.send(chatId,
      `👤 ${profile?.full_name || "Operador"}\n${status} Plan: ${plan}\n\n📸 <b>Consejo:</b> manda la foto de un ticket y lo registro automáticamente.\n\n¿Qué deseas hacer?`,
      buttons
    );
  } catch (e) {
    logger.error("telegram.menu_error", { chatId, error: e.message });
  }
}

// ---------- Handler Netlify ----------
exports.handler = async (event) => {
  if (!BOT_TOKEN) {
    console.error("TELEGRAM_BOT_TOKEN no está configurado");
    return { statusCode: 500, body: JSON.stringify({ error: "Bot no configurado" }) };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }
  try {
    const body = JSON.parse(event.body || "{}");
    const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    if (body.message) {
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
