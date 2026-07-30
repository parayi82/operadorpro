// ============================================================
// notify.js — Adaptador plegable de notificaciones (WhatsApp/Email).
// Interfaz única `send()`; el proveedor se elige por variable de
// entorno. Sin credenciales: no-op con log (el flujo nunca se rompe
// por falta de integración externa).
// ============================================================

const logger = require("./logger");

async function sendViaMetaCloudApi(toPhone, message) {
  const token = process.env.WHATSAPP_META_TOKEN;
  const phoneId = process.env.WHATSAPP_META_PHONE_ID;
  const res = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: toPhone,
      type: "text",
      text: { body: message }
    })
  });
  if (!res.ok) throw new Error(`WhatsApp Meta API error: ${res.status}`);
}

async function sendViaTwilio(toPhone, message) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM; // ej. "whatsapp:+14155238886"
  const body = new URLSearchParams({ From: from, To: `whatsapp:${toPhone}`, Body: message });

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${authToken}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });
  if (!res.ok) throw new Error(`Twilio API error: ${res.status}`);
}

/**
 * Envía una notificación por WhatsApp. Devuelve { sent: boolean } —
 * nunca lanza por falta de configuración: eso se loggea y se reporta
 * como "sent: false" para que el llamador marque el recordatorio como
 * pendiente de reintento, no como error fatal del flujo.
 */
async function sendWhatsApp(toPhone, message) {
  const provider = process.env.WHATSAPP_PROVIDER;
  if (!toPhone || !/^\+?[0-9]{10,15}$/.test(toPhone)) {
    logger.warn("notify.invalid_phone", { toPhone });
    return { sent: false, reason: "invalid_phone" };
  }

  try {
    if (provider === "meta") await sendViaMetaCloudApi(toPhone, message);
    else if (provider === "twilio") await sendViaTwilio(toPhone, message);
    else {
      logger.info("notify.noop_no_provider", { toPhone, message });
      return { sent: false, reason: "no_provider_configured" };
    }
    return { sent: true };
  } catch (e) {
    logger.error("notify.send_failed", { provider, error: e.message });
    return { sent: false, reason: "provider_error" };
  }
}

module.exports = { sendWhatsApp };
