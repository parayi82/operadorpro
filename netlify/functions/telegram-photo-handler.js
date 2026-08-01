// ============================================================
// telegram-photo-handler.js — Descarga fotos de Telegram
// y las sube a Supabase Storage. Integra con flujos de
// inspeccion y gastos.
// ============================================================

const https = require("https");
const { createClient } = require("@supabase/supabase-js");
const logger = require("./_lib/logger");

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!BOT_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Telegram o Supabase env vars not set");
}

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Descargar archivo de Telegram
async function downloadFromTelegram(fileId) {
  return new Promise((resolve, reject) => {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`;

    https.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.ok) {
            resolve(parsed.result);
          } else {
            reject(new Error(parsed.description || "Telegram API error"));
          }
        } catch (e) {
          reject(e);
        }
      });
    }).on("error", reject);
  });
}

// Descargar el contenido del archivo
async function downloadFile(filePath) {
  return new Promise((resolve, reject) => {
    const url = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;

    https.get(url, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        resolve(Buffer.concat(chunks));
      });
    }).on("error", reject);
  });
}

// Subir foto a Supabase Storage
async function uploadPhotoToStorage(buffer, bucket, fileName) {
  const { data, error } = await sb.storage
    .from(bucket)
    .upload(fileName, buffer, {
      contentType: "image/jpeg",
      upsert: false
    });

  if (error) throw error;

  // Generar URL firmado (válido por 1 año)
  const { data: signedUrl, error: signError } = await sb.storage
    .from(bucket)
    .createSignedUrl(fileName, 60 * 60 * 24 * 365);

  if (signError) throw signError;

  return signedUrl.signedUrl;
}

// Procesar foto para inspeccion
async function processPhotoForInspection(
  fileId,
  chatId,
  session,
  convState,
  photoType,
  admin
) {
  try {
    // Descargar archivo
    const fileInfo = await downloadFromTelegram(fileId);
    const buffer = await downloadFile(fileInfo.file_path);

    // Subir a Supabase Storage
    const timestamp = Date.now();
    const fileName = `telegram/${session.company_id}/inspections/${timestamp}-${photoType}.jpg`;
    const photoUrl = await uploadPhotoToStorage(buffer, "evidence", fileName);

    logger.info("telegram.photo_uploaded", {
      chatId,
      photoType,
      fileName,
      bucket: "evidence"
    });

    return photoUrl;
  } catch (e) {
    logger.error("telegram.photo_upload_error", {
      chatId,
      fileId,
      error: e.message
    });
    throw e;
  }
}

// Procesar foto para gasto
async function processPhotoForExpense(fileId, chatId, session, admin) {
  try {
    const fileInfo = await downloadFromTelegram(fileId);
    const buffer = await downloadFile(fileInfo.file_path);

    const timestamp = Date.now();
    const fileName = `telegram/${session.company_id}/receipts/${timestamp}-receipt.jpg`;
    const photoUrl = await uploadPhotoToStorage(buffer, "evidence", fileName);

    logger.info("telegram.receipt_uploaded", {
      chatId,
      fileName,
      bucket: "evidence"
    });

    return photoUrl;
  } catch (e) {
    logger.error("telegram.receipt_upload_error", {
      chatId,
      fileId,
      error: e.message
    });
    throw e;
  }
}

module.exports = {
  downloadFromTelegram,
  downloadFile,
  uploadPhotoToStorage,
  processPhotoForInspection,
  processPhotoForExpense
};
