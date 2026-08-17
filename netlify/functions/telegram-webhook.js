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

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// ---------- Auth guard ----------
// Verifica sesión y devuelve el objeto, o envía instrucciones si no existe.
async function requireSession(telegramUserId, chatId, admin) {
  const session = await telegramAuth.getSession(telegramUserId, admin);
  if (session) return session;
  await telegramSender.send(chatId,
    "⚠️ Tu cuenta no está vinculada.\n\n" +
    "1️⃣ Abre la app web → Perfil → <b>Generar código de Telegram</b>\n" +
    "2️⃣ Escríbeme: <code>/auth CODIGO</code>\n\n" +
    "O comparte tu número y te ayudo a buscarte:"
  );
  await telegramSender.requestContact(chatId);
  return null;
}

// ---------- Guard: perfil de operador requerido ----------
// Devuelve el registro de driver o envía mensaje bloqueante y retorna null.
async function requireDriverProfile(chatId, session, admin) {
  const { data: driver } = await admin.from("drivers")
    .select("id, full_name, status")
    .eq("company_id", session.company_id)
    .eq("user_id", session.user_id)
    .maybeSingle();

  if (!driver) {
    await telegramSender.send(chatId,
      "⚠️ <b>No estás dado de alta como operador.</b>\n\n" +
      "Para usar esta función necesitas tener perfil registrado en el sistema.\n\n" +
      "Pide a tu despachador que en la app web:\n" +
      "1️⃣ Vaya a <b>Operadores → Agregar operador</b>\n" +
      "2️⃣ Registre tu nombre y teléfono\n" +
      "3️⃣ Vincule tu cuenta de usuario\n\n" +
      "Cuando te hayan dado de alta, regresa y prueba de nuevo.",
      [["↩️ Menú Principal"]]
    );
    return null;
  }

  if (driver.status !== "activo") {
    await telegramSender.send(chatId,
      "⚠️ Tu perfil de operador está <b>inactivo</b>.\n\n" +
      "Pide a tu despachador que lo reactive en la app web → Operadores.",
      [["↩️ Menú Principal"]]
    );
    return null;
  }

  return driver;
}

// ---------- Recuperación de estado tras error ----------
async function recoverFromError(chatId, session, admin, e, context = "") {
  logger.error(`telegram.error${context ? "." + context : ""}`, {
    chatId, error: e.message, stack: e.stack
  });
  try {
    const menuButtons = [["↩️ Menú Principal"]];
    await telegramSender.send(chatId,
      `❌ Ocurrió un error al procesar tu solicitud.\n\n<i>${e.message}</i>\n\nToca el botón para continuar:`,
      menuButtons
    );
    // Resetear estado de conversación para evitar que quede en limbo
    if (session) {
      const state = await telegramConversation.getOrCreateConversationState(session.id, admin);
      await telegramConversation.resetConversation(state.id, admin);
    }
  } catch (_) { /* no hay nada más que hacer */ }
}

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

  let session = null;
  try {
    // ---------- Comandos sin sesión ----------
    if (text.startsWith("/start")) {
      session = await telegramAuth.getSession(telegramUserId, admin);
      if (session) {
        await showMenu(chatId, session, admin);
      } else {
        await telegramSender.send(chatId,
          "👋 Bienvenido a OperadorPro.\n\nPara vincular tu cuenta ve a la app web → Perfil → <b>Generar código de Telegram</b>.\nLuego escríbeme:\n\n<code>/auth CODIGO</code>"
        );
        await telegramSender.requestContact(chatId);
      }
      return;
    }

    if (text.startsWith("/auth ")) {
      const code = text.substring(6).trim();
      try {
        session = await telegramAuth.validateAndCreateSession(code, telegramUserId, chatId, admin);
        await telegramSender.send(chatId, "✅ ¡Cuenta vinculada! Ahora puedes usar el bot.");
        await showMenu(chatId, session, admin);
      } catch (e) {
        await telegramSender.send(chatId, `❌ ${e.message}`);
      }
      return;
    }

    // Todo lo demás requiere sesión autenticada
    session = await requireSession(telegramUserId, chatId, admin);
    if (!session) return;

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

    // Resolución de conflicto de viaje duplicado
    if (convState?.context?.trip_conflict && !isMenuButton) {
      const conflictTrip = convState.context.trip_conflict;
      const normalized = text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
      if (text === "✅ Continuar con viaje actual" || normalized === "continuar") {
        await telegramConversation.updateConversationState(convState.id, "none", 0, {}, admin);
        await showMenu(chatId, session, admin);
      } else if (text === "🔄 Cerrar actual y crear nuevo" || normalized === "cerrar y crear") {
        // Cerrar el viaje existente
        await admin.from("trips").update({ status: "cerrado" }).eq("id", conflictTrip.id);
        await telegramConversation.updateConversationState(convState.id, "none", 0, {}, admin);
        await telegramConversation.startFlow(chatId, "trip", session, admin);
        const { data: ro } = await admin.from("trips").select("origin")
          .eq("company_id", session.company_id).order("started_at", { ascending: false }).limit(12);
        const uOrigins = [...new Set((ro || []).map(t => t.origin))].slice(0, 4);
        const oButtons = uOrigins.length > 0 ? [...uOrigins.map(o => [o]), ["✏️ Escribir ciudad"]] : null;
        await telegramSender.send(chatId, "🚗 Crear Viaje\n\nOrigen del viaje:", oButtons);
      } else if (text === "🗑️ Eliminar actual y crear nuevo" || normalized === "eliminar y crear") {
        // Eliminar el viaje existente (sin gastos = seguro eliminar)
        const { data: tripExpenses } = await admin.from("expenses")
          .select("id").eq("trip_id", conflictTrip.id).limit(1);
        if (tripExpenses && tripExpenses.length > 0) {
          await admin.from("trips").update({ status: "cerrado" }).eq("id", conflictTrip.id);
          await telegramSender.send(chatId, "⚠️ El viaje tiene gastos registrados, se cerró en lugar de eliminarlo.");
        } else {
          await admin.from("trips").delete().eq("id", conflictTrip.id);
        }
        await telegramConversation.updateConversationState(convState.id, "none", 0, {}, admin);
        await telegramConversation.startFlow(chatId, "trip", session, admin);
        await telegramSender.send(chatId, "🚗 Crear Viaje\n\nEscribe el origen (ciudad/dirección):");
      } else {
        // Reenviar opciones si respuesta no reconocida
        const tc = convState.context.trip_conflict;
        const buttons = [["✅ Continuar con viaje actual"], ["🔄 Cerrar actual y crear nuevo"], ["🗑️ Eliminar actual y crear nuevo"], ["↩️ Menú Principal"]];
        await telegramSender.send(chatId, `Ya tienes un viaje abierto:\n🚗 ${tc.origin} → ${tc.destination}\n\n¿Qué deseas hacer?`, buttons);
      }
      return;
    }

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
      const driver = await requireDriverProfile(chatId, session, admin);
      if (!driver) return;

      const { data: vehicles } = await admin.from("vehicles")
        .select("economic_number, plate").eq("company_id", session.company_id).limit(6);

      if (!vehicles || vehicles.length === 0) {
        await telegramSender.send(chatId,
          "⚠️ <b>No hay unidades registradas en tu empresa.</b>\n\n" +
          "Pide a tu despachador que en la app web vaya a <b>Flotilla → Agregar unidad</b> " +
          "y registre los vehículos antes de hacer una inspección.",
          [["↩️ Menú Principal"]]
        );
        return;
      }

      await telegramConversation.startFlow(chatId, "inspection", session, admin);
      const vButtons = vehicles.map(v => [`${v.economic_number} (${v.plate})`]);
      await telegramSender.send(chatId,
        "🔍 Inspección Pre-Viaje\n\nSelecciona la unidad a inspeccionar:",
        vButtons
      );
      return;
    }
    if (text === "🚗 Crear Viaje" || text === "2") {
      const driver = await requireDriverProfile(chatId, session, admin);
      if (!driver) return;

      // Verificar si ya existe un viaje abierto
      const { data: openTrips } = await admin.from("trips")
        .select("id, origin, destination")
        .eq("company_id", session.company_id).eq("status", "abierto")
        .order("started_at", { ascending: false }).limit(1);
      if (openTrips && openTrips.length > 0) {
        const existing = openTrips[0];
        // Guardar referencia del viaje en conflicto y pedir decisión
        const currentState = await telegramConversation.getOrCreateConversationState(session.id, admin);
        await telegramConversation.updateConversationState(
          currentState.id, "none", 0,
          { trip_conflict: { id: existing.id, origin: existing.origin, destination: existing.destination } },
          admin
        );
        const buttons = [["✅ Continuar con viaje actual"], ["🔄 Cerrar actual y crear nuevo"], ["🗑️ Eliminar actual y crear nuevo"], ["↩️ Menú Principal"]];
        await telegramSender.send(chatId,
          `Ya tienes un viaje abierto:\n🚗 ${existing.origin} → ${existing.destination}\n\n¿Qué deseas hacer?`,
          buttons
        );
        return;
      }
      await telegramConversation.startFlow(chatId, "trip", session, admin);
      // Sugerir orígenes usados recientemente
      const { data: recentOrigins } = await admin.from("trips")
        .select("origin").eq("company_id", session.company_id)
        .order("started_at", { ascending: false }).limit(12);
      const uniqueOrigins = [...new Set((recentOrigins || []).map(t => t.origin))].slice(0, 4);
      const originButtons = uniqueOrigins.length > 0
        ? [...uniqueOrigins.map(o => [o]), ["✏️ Escribir ciudad"]]
        : null;
      await telegramSender.send(chatId,
        "🚗 Crear Viaje\n\nOrigen del viaje:",
        originButtons
      );
      return;
    }
    if (text === "⛽ Reportar Gasto" || text === "3") {
      const driver = await requireDriverProfile(chatId, session, admin);
      if (!driver) return;

      const { data: trips } = await admin.from("trips")
        .select("id, origin, destination")
        .eq("company_id", session.company_id).eq("status", "abierto")
        .order("started_at", { ascending: false }).limit(4);
      if (!trips || trips.length === 0) {
        await telegramSender.send(chatId,
          "⚠️ <b>No hay viaje abierto.</b>\n\n" +
          "Para registrar un gasto primero debes iniciar un viaje.\n\n" +
          "Usa 🚗 Crear Viaje para comenzar.",
          [["🚗 Crear Viaje", "↩️ Menú Principal"]]
        );
        return;
      }
      await telegramConversation.startFlow(chatId, "expense", session, admin);
      if (trips.length === 1) {
        // Auto-seleccionar el único viaje abierto
        await telegramConversation.handleConversationMessage(
          chatId, `${trips[0].origin} → ${trips[0].destination}`, session, admin
        );
        return;
      }
      // Más de un viaje: mostrar lista para elegir
      const buttons = trips.map((t) => [`${t.origin} → ${t.destination}`]);
      await telegramSender.send(chatId, "⛽ Reportar Gasto\n\nSelecciona el viaje:", buttons);
      return;
    }
    if (text === "📋 Ver Estado" || text === "4") {
      try {
        const { data: docs } = await admin.from("compliance_status_v")
          .select("*").eq("company_id", session.company_id).limit(5);
        let docStatus;
        if (docs && docs.length > 0) {
          docStatus = docs.map((d) => {
            const emoji = d.semaforo === "vencido" ? "🔴" : d.semaforo === "por_vencer" ? "🟡" : "🟢";
            const label = d.doc_type.replace(/_/g, " ");
            return `${emoji} ${label}: ${d.expires_at}`;
          }).join("\n");
        } else {
          docStatus = "Sin documentos registrados.\n\n💡 Sube licencias, seguros y permisos desde la app web para monitorear aquí sus fechas de vencimiento.";
        }
        const stateButtons = [["↩️ Menú Principal"]];
        await telegramSender.send(chatId, `📋 Estado de Documentos\n\n${docStatus}`, stateButtons);
      } catch (e) {
        await telegramSender.send(chatId, "❌ Error al recuperar estado.", [["↩️ Menú Principal"]]);
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
    await recoverFromError(chatId, session, admin, e, "message");
  }
}

// ---------- Foto ----------
async function handlePhotoMessage(admin, telegramUserId, chatId, photos) {
  let session = null;
  try {
    session = await requireSession(telegramUserId, chatId, admin);
    if (!session) return;

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
            ctx.odometer_km = reading.km; // guardar km para cuando el usuario confirme
            await telegramConversation.updateConversationState(convState.id, "inspection", convState.current_step, ctx, admin);
            await telegramSender.send(chatId,
              `📷 Leo <b>${reading.km.toLocaleString()} km</b> en el odómetro.\n¿Es correcto?`,
              buttons
            );
          } else {
            await telegramSender.send(chatId, "No pude leer el odómetro. Escribe el número de kilómetros:");
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
    await recoverFromError(chatId, session, admin, e, "photo");
  }
}

// ---------- Nota de voz ----------
async function handleVoiceMessage(admin, telegramUserId, chatId, voiceOrAudio) {
  let session = null;
  try {
    session = await requireSession(telegramUserId, chatId, admin);
    if (!session) return;

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
      const fileInfo = await telegramPhotoHandler.downloadFromTelegram(fileId);
      audioBuffer = await telegramPhotoHandler.downloadFile(fileInfo.file_path);
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
    await recoverFromError(chatId, session, admin, e, "voice");
  }
}

// ---------- Contacto compartido (vincular por número) ----------
async function handleContactMessage(admin, message) {
  const telegramUserId = message.from.id.toString();
  const chatId = message.chat.id.toString();
  const contact = message.contact;

  try {
    const existing = await telegramAuth.getSession(telegramUserId, admin);
    if (existing) {
      await telegramSender.removeKeyboard(chatId, "✅ Ya tienes cuenta vinculada.");
      await showMenu(chatId, existing, admin);
      return;
    }

    if (!contact?.phone_number) {
      await telegramSender.send(chatId, "No pude leer el número. Intenta con /auth CODIGO.");
      return;
    }

    // Normalizar: quitar +, espacios, guiones
    const rawPhone = contact.phone_number.replace(/[\s\-\(\)\+]/g, "");

    const { data: drivers } = await admin.from("drivers")
      .select("user_id, company_id, full_name")
      .ilike("phone", `%${rawPhone}%`)
      .limit(5);

    if (!drivers || drivers.length === 0) {
      await telegramSender.removeKeyboard(chatId,
        "⚠️ No encontré ninguna cuenta con ese número.\n\n" +
        "Pide a tu administrador que te registre en la app web, o usa <code>/auth CODIGO</code>."
      );
      return;
    }

    const driver = drivers[0];
    if (!driver.user_id) {
      await telegramSender.removeKeyboard(chatId,
        "⚠️ Tu perfil de chofer no tiene usuario vinculado.\n\nPide a tu administrador que lo vincule en la app web."
      );
      return;
    }

    const { data: sessionData, error: sessionError } = await admin
      .from("telegram_sessions")
      .upsert({
        telegram_user_id: telegramUserId,
        telegram_chat_id: chatId,
        user_id: driver.user_id,
        company_id: driver.company_id,
        authenticated_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString()
      }, { onConflict: "telegram_user_id" })
      .select().single();

    if (sessionError) throw sessionError;

    await telegramSender.removeKeyboard(chatId, `✅ ¡Bienvenido, ${driver.full_name}! Cuenta vinculada.`);
    await showMenu(chatId, sessionData, admin);
  } catch (e) {
    logger.error("telegram.contact_error", { chatId, error: e.message });
    await telegramSender.send(chatId, "❌ Error al vincular por teléfono. Usa <code>/auth CODIGO</code>.");
  }
}

// ---------- Menú principal ----------
async function showMenu(chatId, session, admin) {
  try {
    const [{ data: profile }, { data: driver }, { data: openTrips }] = await Promise.all([
      admin.from("profiles").select("full_name, subscription_status, plan").eq("id", session.user_id).single(),
      admin.from("drivers").select("id, full_name").eq("company_id", session.company_id).eq("user_id", session.user_id).maybeSingle(),
      admin.from("trips").select("origin, destination").eq("company_id", session.company_id).eq("status", "abierto").order("started_at", { ascending: false }).limit(1)
    ]);

    const planStatus = profile?.subscription_status === "active" ? "✅" : "⚠️";
    const planName = profile?.plan === "protegido" ? "Protegido" : "Esencial";
    const displayName = profile?.full_name || driver?.full_name || "Operador";

    const lines = [`👤 ${displayName}\n${planStatus} Plan: ${planName}`];

    if (!driver) {
      lines.push("⚠️ <b>Sin perfil de operador</b> — pide a tu despachador que te dé de alta");
    } else if (openTrips && openTrips.length > 0) {
      lines.push(`🚗 Viaje activo: <b>${openTrips[0].origin} → ${openTrips[0].destination}</b>`);
    }

    lines.push("📸 <b>Consejo:</b> manda la foto de un ticket y lo registro automáticamente.\n\n¿Qué deseas hacer?");

    const buttons = [
      ["🔍 Inspeccionar", "🚗 Crear Viaje"],
      ["⛽ Reportar Gasto", "📋 Ver Estado"],
    ];

    await telegramSender.send(chatId, lines.join("\n\n"), buttons);
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
      if (body.message.contact) {
        await handleContactMessage(admin, body.message);
      } else {
        await handleMessage(admin, body.message);
      }
    }
    logger.info("telegram.webhook_processed", { update_id: body.update_id });
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (error) {
    console.error("CRITICAL ERROR en telegram-webhook:", error);
    logger.error("telegram.webhook_error", { error: error.message });
    return { statusCode: 200, body: JSON.stringify({ ok: false, error: error.message }) };
  }
};
