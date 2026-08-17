// ============================================================
// telegram-send-message.js — Envía mensajes a Telegram.
// Abstracción para facilitar uso desde otras functions.
// ============================================================

const https = require("https");

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// Enviar mensaje solicitando el número de teléfono (botón nativo de Telegram)
async function requestContact(chatId, text = "Para vincular tu cuenta, comparte tu número:") {
  const payload = {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    reply_markup: {
      keyboard: [[{ text: "📱 Compartir mi número", request_contact: true }]],
      resize_keyboard: true,
      one_time_keyboard: true
    }
  };
  return post("/sendMessage", payload);
}

// Eliminar teclado de respuesta
async function removeKeyboard(chatId, text) {
  return post("/sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    reply_markup: { remove_keyboard: true }
  });
}

// Enviar mensaje de texto con teclado opcional
async function send(chatId, text, buttons = null, replyMode = false) {
  const payload = {
    chat_id: chatId,
    text: text.trim(),
    parse_mode: "HTML"
  };

  if (buttons) {
    // buttons = [["Botón 1", "Botón 2"], ["Botón 3"]]
    payload.reply_markup = {
      keyboard: buttons.map(row => row.map(label => ({
        text: typeof label === "string" ? label : label[0]
      }))),
      resize_keyboard: true,
      one_time_keyboard: !replyMode,
      selective: false
    };
  }

  return post("/sendMessage", payload);
}

// Enviar foto con caption
async function sendPhoto(chatId, photoUrl, caption = null) {
  const payload = {
    chat_id: chatId,
    photo: photoUrl,
    parse_mode: "HTML"
  };
  if (caption) payload.caption = caption.trim();

  return post("/sendPhoto", payload);
}

// Enviar documento
async function sendDocument(chatId, fileId, caption = null) {
  const payload = {
    chat_id: chatId,
    document: fileId,
    parse_mode: "HTML"
  };
  if (caption) payload.caption = caption.trim();

  return post("/sendDocument", payload);
}

// Helper: POST a Telegram API
function post(endpoint, data) {
  if (!BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN no está configurado");
  const apiUrl = `https://api.telegram.org/bot${BOT_TOKEN}`;
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const req = https.request(
      apiUrl + endpoint,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body)
        }
      },
      (res) => {
        let responseBody = "";
        res.on("data", (chunk) => (responseBody += chunk));
        res.on("end", () => {
          try {
            const parsed = JSON.parse(responseBody);
            if (parsed.ok) {
              resolve(parsed.result);
            } else {
              reject(new Error(parsed.description || "Telegram API error"));
            }
          } catch (e) {
            reject(e);
          }
        });
      }
    );

    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

module.exports = {
  send,
  sendPhoto,
  sendDocument,
  requestContact,
  removeKeyboard,
  post
};
