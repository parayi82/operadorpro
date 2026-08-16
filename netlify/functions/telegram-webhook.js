// ============================================================
// telegram-webhook.js — Webhook receiver para Telegram Bot API
// ============================================================

const { createClient } = require("@supabase/supabase-js");
const logger = require("./_lib/logger");
const telegramAuth = require("./telegram-auth");
const telegramSender = require("./telegram-send-message");
const telegramConversation = require("./telegram-conversation");
const telegramPhotoHandler = require("./telegram-photo-handler");
const { analyzeReceiptWithClaude, readOdometerWithClaude, categoryEmoji } = require("./_lib/vision");
const { transcribeAudio } = require("./_lib/whisper");
const { parseVoice } = require("./_lib/voice-parser");
const telegramPhotoHandlerLib = require("./telegram-photo-handler");

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
    await handleVoiceMessage(admin, telegramUserId, chatId, message.voice || message.audio);
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

    // Botones del menú principal tienen prioridad sobre cualquier estado pendiente
    const isMenuButton = [
      "🔍 Inspeccionar", "1",
      "🚗 Crear Viaje", "2",
      "⛽ Reportar Gasto", "3",
      "📋 Ver Estado", "4",
      "↩️ Menú Principal", "↩️ Menu Principal"
    ].includes(text);

    // Confirmación de viaje detectado por voz
    if (convState?.context?.pending_voice_trip && !isMenuButton) {
      const vt = convState.context.pending_voice_trip;
      const normalized = text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
      const isYes = ["si", "yes", "ok", "va", "✅ sí, crear viaje"].includes(normalized);
      const isNo = ["no", "cancelar", "❌ cancelar"].includes(normalized);
      if (isYes) {
        await telegramConversation.updateConversationState(convState.id, "none", 0, {}, admin);
        // Pre-llenar contexto del flujo de viaje con datos de voz
        await telegramConversation.startFlow(chatId, "trip", session, admin);
        const prefilled = { origin: vt.origin, destination: vt.destination };
        if (vt.budget) prefilled.budget_amount = vt.budget;
        await telegramConversation.updateConversationState(convState.id, "trip", vt.budget ? 3 : 2, prefilled, admin);
        if (!vt.budget) {
          await telegramSender.send(chatId, `Origen: ${vt.origin} ✅\nDestino: ${vt.destination} ✅\n\nPresupuesto para gastos (número en pesos):`);
        } else {
          // Todos los datos disponibles — crear viaje directamente
          await telegramConversation.handleConversationMessage(chatId, String(vt.budget), session, admin);
        }
      } else if (isNo) {
        await telegramConversation.updateConversationState(convState.id, "none", 0, {}, admin);
        await telegramSender.send(chatId, "Cancelado. /start para el menú.");
      } else {
        const buttons = [["✅ Sí, crear viaje", "❌ Cancelar"]];
        await telegramSender.send(chatId, `¿Confirmas viaje ${vt.origin} → ${vt.destination}?`, buttons);
      }
      return;
    }

    // Confirmación de gasto auto-detectado por IA
    if (convState?.context?.pending_expense && !isMenuButton) {
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
        .order("started_at", { ascending: false }).limit(4);
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
        // Paso 2 (kilometraje): intentar leer odómetro de la foto con Vision
        if (convState.current_step === 2) {
          const photoUrl = await telegramPhotoHandler.processPhotoForInspection(
            fileId, chatId, session, convState, "odometro", admin
          );
          const reading = await readOdometerWithClaude(photoUrl);
          if (reading?.km) {
            const buttons = [["✅ Confirmar", "❌ Otro número"]];
            const ctx = convState.context || {};
            ctx._odometer_url = photoUrl;
            await telegramConversation.updateConversationState(convState.id, "inspection", convState.current_step, ctx, admin);
            await telegramSender.send(chatId,
              `📷 Leo <b>${reading.km.toLocaleString()} km</b> en el odómetro.\n¿Es correcto?`,
              buttons
            );
          } else {
            await telegramSender.send(chatId, "No pude leer el odómetro claramente. Escribe el número de kilómetros:");
          }
          return;
        }

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
        .order("started_at", { ascending: false }).limit(4);

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
async function handleVoiceMessage(admin, telegramUserId, chatId, voiceOrAudio) {
  try {
    const session = await telegramAuth.getSession(telegramUserId, admin);
    if (!session) {
      await telegramSender.send(chatId, "⚠️ Primero autentícate con /start");
      return;
    }

    const convState = await telegramConversation.getOrCreateConversationState(session.id, admin);
    const fileId = voiceOrAudio?.file_id;

    // Sin Whisper: fallback a menú
    if (!process.env.OPENAI_API_KEY || !fileId) {
      const buttons = [["⛽ Reportar Gasto", "🔍 Inspeccionar"], ["↩️ Menú Principal"]];
      await telegramSender.send(chatId,
        "🎤 Recibí tu nota de voz.\n\n📸 Envía la <b>foto del ticket</b> y la registro automáticamente, o usa el menú:",
        buttons
      );
      return;
    }

    await telegramSender.send(chatId, "🎤 Procesando tu nota de voz…");

    // Descargar audio de Telegram
    let audioBuffer;
    try {
      const fileInfo = await telegramPhotoHandlerLib.downloadFromTelegram(fileId);
      audioBuffer = await telegramPhotoHandlerLib.downloadFile(fileInfo.file_path);
    } catch (e) {
      logger.error("telegram.voice_download_error", { error: e.message });
      await telegramSender.send(chatId, "❌ No pude descargar el audio. Intenta de nuevo.");
      return;
    }

    // Transcribir con Whisper
    const transcription = await transcribeAudio(audioBuffer);
    if (!transcription) {
      const buttons = [["⛽ Reportar Gasto", "🚗 Crear Viaje"], ["↩️ Menú Principal"]];
      await telegramSender.send(chatId, "No entendí el audio. ¿Qué deseas hacer?", buttons);
      return;
    }

    logger.info("telegram.voice_transcribed", { chatId, chars: transcription.length });

    // Si hay flujo activo, pasar transcripción como texto al flujo
    if (convState?.flow_type && convState.flow_type !== "none") {
      await telegramConversation.handleConversationMessage(chatId, transcription, session, admin);
      return;
    }

    // Sin flujo activo: detectar intención (viaje o gasto)
    // Palabras clave de viaje
    const tripKeywords = ["voy a", "salgo", "saliendo", "viajar", "viaje", "destino", "rumbo", "saldremos"];
    const isTripIntent = tripKeywords.some(k => transcription.toLowerCase().includes(k));

    if (isTripIntent) {
      const tripData = await parseVoice(transcription, "trip");
      if (tripData?.origin && tripData?.destination) {
        // Preguntar confirmación antes de crear
        const ctx = { voice_trip: tripData };
        await telegramConversation.updateConversationState(
          convState.id, "none", 0, { pending_voice_trip: tripData }, admin
        );
        const buttons = [["✅ Sí, crear viaje", "❌ Cancelar"]];
        await telegramSender.send(chatId,
          `🎤 Entendí:\n🚗 <b>${tripData.origin} → ${tripData.destination}</b>` +
          (tripData.budget ? `\n💰 Presupuesto: $${tripData.budget} MXN` : "") +
          `\n\n¿Creo el viaje?`,
          buttons
        );
        return;
      }
    }

    // Asumir que es un gasto (caso más común en campo)
    const expenseData = await parseVoice(transcription, "expense");
    if (expenseData?.amount && expenseData?.category) {
      const { data: trips } = await admin.from("trips")
        .select("id, origin, destination")
        .eq("company_id", session.company_id).eq("status", "abierto")
        .order("started_at", { ascending: false }).limit(1);

      const pending = {
        amount: expenseData.amount,
        category: expenseData.category,
        receipt_url: null,
        trip_id: trips?.[0]?.id || null,
        vendor: expenseData.merchant
      };
      await telegramConversation.updateConversationState(convState.id, "none", 0, { pending_expense: pending }, admin);

      const vendorNote = expenseData.merchant ? ` (${expenseData.merchant})` : "";
      const tripNote = trips?.[0] ? `\nViaje: <b>${trips[0].origin} → ${trips[0].destination}</b>` : "\n⚠️ Sin viaje abierto";
      const buttons = trips?.length ? [["✅ Confirmar", "❌ Cancelar"]] : [["🚗 Crear Viaje", "❌ Cancelar"]];

      await telegramSender.send(chatId,
        `🎤 Entendí un gasto${vendorNote}:\n${categoryEmoji(expenseData.category)} ${expenseData.category.toUpperCase()} — <b>$${expenseData.amount} MXN</b>${tripNote}\n\n¿Lo registro?`,
        buttons
      );
      return;
    }

    // Transcripción ambigua — mostrar texto y opciones
    const buttons = [["⛽ Reportar Gasto", "🚗 Crear Viaje"], ["↩️ Menú Principal"]];
    await telegramSender.send(chatId,
      `🎤 Escuché: "<i>${transcription}</i>"\n\nNo identifiqué datos claros. ¿Qué deseas hacer?`,
      buttons
    );
  } catch (e) {
    logger.error("telegram.voice_message_error", { error: e.message });
    const buttons = [["↩️ Menú Principal"]];
    await telegramSender.send(chatId, "Error al procesar la nota de voz.", buttons);
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
