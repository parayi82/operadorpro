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

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN not set");

async function getUpdates() {
  return new Promise((resolve, reject) => {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?timeout=0`;
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

    if (!session) {
      await telegramSender.send(chatId, "⚠️ No estás autenticado. Usa /start para comenzar.");
      return;
    }

    await admin
      .from("telegram_sessions")
      .update({ last_activity_at: new Date().toISOString() })
      .eq("id", session.id);

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
      await telegramSender.send(chatId, "🔍 Nueva Inspección Pre-Viaje\n\nSelecciona la unidad (ingresa número económico):");
      return;
    }

    if (text === "🚗 Crear Viaje" || text === "2") {
      await telegramSender.send(chatId, "🚗 Crear Viaje\n\nEscribe el origen (ciudad/dirección):");
      return;
    }

    if (text === "⛽ Reportar Gasto" || text === "3") {
      await telegramSender.send(chatId, "⛽ Reportar Gasto de Viaje\n\n¿Cuál es el ID del viaje?");
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

    await telegramSender.send(chatId, `
👤 ${profile?.full_name || "Operador"}
${status} Plan: ${plan === "protegido" ? "Protegido (asesoría legal)" : "Esencial"}

¿Qué deseas hacer?
    `);
  } catch (e) {
    logger.error("telegram.menu_error", { chatId, error: e.message });
  }
}

// Función programada (cron) — ejecutada por Netlify cada minuto
exports.handler = async (event, context) => {
  try {
    const admin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const updates = await getUpdates();

    for (const update of updates) {
      if (update.message) {
        await handleMessage(admin, update.message);
      }
    }

    logger.info("telegram.polling_complete", { updatesProcessed: updates.length });
    return { statusCode: 200, body: JSON.stringify({ ok: true, processed: updates.length }) };
  } catch (error) {
    logger.error("telegram.polling_error", { error: error.message });
    return { statusCode: 200, body: JSON.stringify({ ok: true, error: error.message }) };
  }
};
