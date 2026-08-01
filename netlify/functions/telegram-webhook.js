// ============================================================
// telegram-webhook.js — Webhook super simple para Telegram Bot.
// Responde OK a todo (validación, mensajes, etc.) sin rechazar.
// ============================================================

exports.handler = async (event) => {
  // Responder OK a CUALQUIER solicitud (GET, POST vacío, POST con datos)
  // Telegram solo necesita saber que la URL es alcanzable
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ok: true })
  };
};
