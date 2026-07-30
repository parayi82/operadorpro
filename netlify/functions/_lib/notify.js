// ============================================================
// notify.js — Adaptador plegable de notificaciones (WhatsApp/Email).
// El proveedor se elige por variable de entorno. Sin credenciales:
// no-op con log (el flujo nunca se rompe por falta de integración externa).
//
// IMPORTANTE (WhatsApp Business Platform): un mensaje que la EMPRESA
// inicia (como estos recordatorios) NO puede ir como texto libre salvo
// que exista una sesión de servicio al cliente abierta (el usuario te
// escribió en las últimas 24h). Fuera de eso, Meta exige una plantilla
// ("message template") pre-aprobada. Por eso el proveedor "meta" siempre
// envía por plantilla (sendWhatsAppTemplate); el texto libre
// (sendViaMetaCloudApi) solo aplica dentro de una sesión de 24h y no se
// usa en los recordatorios automáticos.
// ============================================================

const logger = require("./logger");

async function sendFreeTextViaMeta(toPhone, message) {
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
  if (!res.ok) throw new Error(`WhatsApp Meta API error: ${res.status} ${await res.text()}`);
}

async function sendTemplateViaMeta(toPhone, templateName, params) {
  const token = process.env.WHATSAPP_META_TOKEN;
  const phoneId = process.env.WHATSAPP_META_PHONE_ID;
  const languageCode = process.env.WHATSAPP_META_TEMPLATE_LANG || "es_MX";

  const res = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: toPhone,
      type: "template",
      template: {
        name: templateName,
        language: { code: languageCode },
        components: [{
          type: "body",
          parameters: params.map((p) => ({ type: "text", text: String(p) }))
        }]
      }
    })
  });
  if (!res.ok) throw new Error(`WhatsApp Meta API error: ${res.status} ${await res.text()}`);
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
  if (!res.ok) throw new Error(`Twilio API error: ${res.status} ${await res.text()}`);
}

function isValidPhone(toPhone) {
  return Boolean(toPhone) && /^\+?[0-9]{10,15}$/.test(toPhone);
}

/**
 * Envía un recordatorio por WhatsApp. Devuelve { sent: boolean } — nunca
 * lanza por falta de configuración o de plantilla: eso se loggea y se
 * reporta como "sent: false" para que el llamador marque el recordatorio
 * como pendiente de reintento, no como error fatal del flujo del cron.
 *
 * @param {string} toPhone
 * @param {object} opts
 * @param {string} opts.freeformText texto libre — usado con Twilio (sandbox
 *   o número aprobado con plantillas de contenido) o con Meta si se llama
 *   sendWhatsAppFreeform directamente dentro de una sesión de 24h.
 * @param {string} opts.templateName nombre exacto de la plantilla aprobada
 *   en Meta WhatsApp Manager (solo se usa si WHATSAPP_PROVIDER=meta).
 * @param {Array<string|number>} opts.templateParams valores en el mismo
 *   orden que las variables {{1}}, {{2}}, ... del cuerpo de la plantilla.
 */
async function sendReminder(toPhone, { freeformText, templateName, templateParams }) {
  const provider = process.env.WHATSAPP_PROVIDER;
  if (!isValidPhone(toPhone)) {
    logger.warn("notify.invalid_phone", { toPhone });
    return { sent: false, reason: "invalid_phone" };
  }

  try {
    if (provider === "meta") {
      if (!templateName) throw new Error("Falta templateName para envío vía Meta Cloud API");
      await sendTemplateViaMeta(toPhone, templateName, templateParams || []);
    } else if (provider === "twilio") {
      await sendViaTwilio(toPhone, freeformText);
    } else {
      logger.info("notify.noop_no_provider", { toPhone, freeformText });
      return { sent: false, reason: "no_provider_configured" };
    }
    return { sent: true };
  } catch (e) {
    logger.error("notify.send_failed", { provider, templateName, error: e.message });
    return { sent: false, reason: "provider_error" };
  }
}

/** Envío de texto libre (solo válido dentro de una sesión de 24h con Meta, o siempre con Twilio). */
async function sendWhatsApp(toPhone, message) {
  const provider = process.env.WHATSAPP_PROVIDER;
  if (!isValidPhone(toPhone)) {
    logger.warn("notify.invalid_phone", { toPhone });
    return { sent: false, reason: "invalid_phone" };
  }
  try {
    if (provider === "meta") await sendFreeTextViaMeta(toPhone, message);
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

module.exports = { sendReminder, sendWhatsApp };
