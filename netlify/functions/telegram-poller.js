// ============================================================
// telegram-poller.js — Función programada (cron) para polling
// de Telegram. Se ejecuta cada minuto (configurable en netlify.toml).
// Sin estado de offsets — Telegram maneja eso automáticamente.
// ============================================================

const https = require("https");
const { createClient } = require("@supabase/supabase-js");
const logger = require("./_lib/logger");
const telegramAuth = require("./telegram-auth");
const telegramSender = require("./telegram-send-message");
const telegramConversation = require("./telegram-conversation");
const telegramPhotoHandler = require("./telegram-photo-handler");

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

async function getLatestUpdateId() {
  return new Promise((resolve, reject) => {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?limit=1&offset=999999999&timeout=0`;
    https.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.ok && parsed.result.length > 0 ? parsed.result[0].update_id : 0);
        } catch (e) {
          resolve(0);
        }
      });
    }).on("error", () => resolve(0));
  });
}

async function getUpdates(offset) {
  return new Promise((resolve, reject) => {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=${offset}&timeout=0`;
    https.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.ok ? parsed.result : []);
        } catch (e) {
          reject(e);
        }
      });
    }).on("error", reject);
  });
}

async function handleMessage(admin, message) {
  const telegramUserId = message.from.id.toString();
  const chatId = message.chat.id.toString();
  const text = (message.text || "").trim();

  // Verificar si es una foto
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

    // Validar /auth ANTES de verificar sesión (no necesita estar autenticado)
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

    if (!session) {
      // Solo responder a comandos explícitos /start, no a mensajes aleatorios
      if (!text.startsWith("/")) {
        // Ignorar mensajes de usuarios no autenticados que no son comandos
        logger.info("telegram.unauthenticated_message_ignored", { telegramUserId, text: text.substring(0, 20) });
        return;
      }
      await telegramSender.send(chatId, "⚠️ No estás autenticado. Usa /start para comenzar.");
      return;
    }

    // Actualizar última actividad
    await admin
      .from("telegram_sessions")
      .update({ last_activity_at: new Date().toISOString() })
      .eq("id", session.id);

    // Verificar si hay una conversación en curso
    const { data: convState } = await admin
      .from("telegram_conversation_state")
      .select("*")
      .eq("telegram_session_id", session.id)
      .single();

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
    const { data: profile } = await admin
      .from("profiles")
      .select("full_name, subscription_status, plan")
      .eq("id", session.user_id)
      .single();

    const status = profile?.subscription_status === "active" ? "✅" : "⚠️";
    const plan = profile?.plan || "esencial";

    const buttons = [
      ["🔍 Inspeccionar", "🚗 Crear Viaje"],
      ["⛽ Reportar Gasto", "📋 Ver Estado"],
      ["↩️ Menu Principal"]
    ];

    await telegramSender.send(
      chatId,
      `👤 ${profile?.full_name || "Operador"}\n${status} Plan: ${plan === "protegido" ? "Protegido (asesoría legal)" : "Esencial"}\n\nQue deseas hacer?`,
      buttons
    );
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

    // Si no hay flujo activo, ignorar la foto
    if (convState.flow_type === "none") {
      await telegramSender.send(chatId, "Usa los botones del menu para enviar fotos.");
      return;
    }

    // Obtener la foto de mayor resolución (última en el array)
    const photo = photos[photos.length - 1];
    const fileId = photo.file_id;

    // Procesar según el flujo
    if (convState.flow_type === "inspection") {
      const photoUrl = await telegramPhotoHandler.processPhotoForInspection(
        fileId,
        chatId,
        session,
        convState,
        "inspeccion",
        admin
      );

      const ctx = convState.context || {};
      ctx.photos = ctx.photos || [];
      ctx.photos.push(photoUrl);

      await telegramConversation.updateConversationState(
        convState.id,
        "inspection",
        convState.current_step,
        ctx,
        admin
      );

      await telegramSender.send(chatId, `Foto registrada. Envía ${5 - ctx.photos.length} más o escribe "listo"`);
    } else if (convState.flow_type === "expense") {
      const photoUrl = await telegramPhotoHandler.processPhotoForExpense(
        fileId,
        chatId,
        session,
        admin
      );

      const ctx = convState.context || {};
      ctx.receipt_url = photoUrl;

      await telegramConversation.updateConversationState(
        convState.id,
        "expense",
        convState.current_step + 1,
        ctx,
        admin
      );

      // Procesar como si hubiera escrito algo para avanzar en el flujo
      await telegramConversation.handleConversationMessage(chatId, "listo", session, admin);
    }
  } catch (e) {
    logger.error("telegram.photo_message_error", { error: e.message });
    await telegramSender.send(chatId, "Error al procesar foto. Intenta de nuevo.");
  }
}

// Función programada (cron) — ejecutada por Netlify cada minuto
exports.handler = async (event, context) => {
  if (!BOT_TOKEN) {
    console.error("TELEGRAM_BOT_TOKEN no está configurado — polling desactivado");
    return { statusCode: 500, body: JSON.stringify({ error: "Bot no configurado" }) };
  }

  let pollState = null;
  let lastUpdateId = 0;

  try {
    const admin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Recuperar el último update_id procesado
    const { data, error: stateError } = await admin
      .from("telegram_poll_state")
      .select("*");

    console.log("DEBUG: telegram_poll_state query result:", { data, error: stateError });

    if (stateError && stateError.code !== "PGRST116") {
      throw stateError;
    }

    if (!data || data.length === 0) {
      console.log("DEBUG: telegram_poll_state está vacía, inicializando");
      // Crear fila inicial si no existe
      const { data: created, error: createErr } = await admin
        .from("telegram_poll_state")
        .insert({ last_update_id: 0, updated_at: new Date().toISOString() })
        .select()
        .single();

      if (createErr) {
        console.error("DEBUG: error creando telegram_poll_state:", createErr);
        throw createErr;
      }

      pollState = created;
      lastUpdateId = 0;
    } else {
      pollState = data[0];
      lastUpdateId = pollState.last_update_id || 0;
    }

    // SAFETY: Detectar loop infinito (offset no cambia en 2 ciclos)
    if (pollState && pollState.updated_at) {
      const lastUpdateTime = new Date(pollState.updated_at).getTime();
      const now = new Date().getTime();
      const minutesWithoutChange = (now - lastUpdateTime) / (1000 * 60);

      if (minutesWithoutChange > 2 && lastUpdateId > 0) {
        console.warn("WARN: Posible loop infinito detectado. Offset sin cambios por >2 min. Reseteando...");
        const latestId = await getLatestUpdateId();
        console.log("INFO: Latest update ID de Telegram:", latestId);
        if (latestId > 0 && latestId > lastUpdateId) {
          console.log("INFO: Saltando a latest update:", { from: lastUpdateId, to: latestId });
          lastUpdateId = latestId;
        }
      }
    }

    console.log("DEBUG: Iniciando polling", { lastUpdateId, offset: lastUpdateId + 1 });
    const updates = await getUpdates(lastUpdateId + 1);
    console.log("DEBUG: getUpdates retornó", { count: updates.length, updateIds: updates.map(u => u.update_id) });

    let maxUpdateId = lastUpdateId;
    for (const update of updates) {
      maxUpdateId = Math.max(maxUpdateId, update.update_id);
      if (update.message) {
        console.log("DEBUG: Procesando mensaje", { updateId: update.update_id, userId: update.message.from.id });
        await handleMessage(admin, update.message);
      }
    }

    console.log("DEBUG: Antes de actualizar", { lastUpdateId, maxUpdateId, pollStateId: pollState.id });

    // Guardar el nuevo offset (SIEMPRE, aunque no haya nuevos mensajes)
    if (pollState && pollState.id) {
      const { data: updateResult, error: updateError } = await admin
        .from("telegram_poll_state")
        .update({ last_update_id: maxUpdateId, updated_at: new Date().toISOString() })
        .eq("id", pollState.id)
        .select();

      console.log("DEBUG: Resultado de actualización", { updateResult, updateError });

      if (updateError) {
        console.error("ERROR: No se pudo actualizar telegram_poll_state", { error: updateError });
      }
    } else {
      console.error("ERROR: pollState sin id válido", { pollState });
    }

    logger.info("telegram.polling_complete", { updatesProcessed: updates.length, lastUpdateId, maxUpdateId });
    return { statusCode: 200, body: JSON.stringify({ ok: true, processed: updates.length, maxUpdateId }) };
  } catch (error) {
    console.error("CRITICAL ERROR en telegram-poller:", error);
    logger.error("telegram.polling_error", { error: error.message, stack: error.stack });
    return { statusCode: 200, body: JSON.stringify({ ok: false, error: error.message }) };
  }
};
