// ============================================================
// whisper.js — Transcripción de audio con OpenAI Whisper API.
// Procesa notas de voz de Telegram (OGG/MP4) y retorna texto
// en español, optimizado para modismos de choferes mexicanos.
// Sin OPENAI_API_KEY devuelve null sin romper el flujo.
// ============================================================

const logger = require("./logger");

async function transcribeAudio(audioBuffer) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    logger.info("whisper.noop_no_key");
    return null;
  }

  try {
    const boundary = `----WhisperBoundary${Date.now()}`;

    // Construir multipart/form-data manualmente (compatible Node 18)
    const fieldModel = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\nwhisper-1\r\n`
    );
    const fieldLang = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="language"\r\n\r\nes\r\n`
    );
    const fieldPrompt = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="prompt"\r\n\r\n` +
      `Transcripción de chofer mexicano: kilómetros, diésel, caseta, viaje, Pemex, CDMX, GDL, MTY\r\n`
    );
    const fileHeader = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="audio.ogg"\r\nContent-Type: audio/ogg\r\n\r\n`
    );
    const footer = Buffer.from(`\r\n--${boundary}--\r\n`);

    const body = Buffer.concat([fieldModel, fieldLang, fieldPrompt, fileHeader, audioBuffer, footer]);

    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": `multipart/form-data; boundary=${boundary}`
      },
      body
    });

    if (!res.ok) {
      const errText = await res.text();
      logger.error("whisper.api_error", { status: res.status, error: errText.slice(0, 200) });
      return null;
    }

    const data = await res.json();
    const text = (data.text || "").trim();
    logger.info("whisper.transcribed", { chars: text.length });
    return text || null;
  } catch (e) {
    logger.error("whisper.transcription_error", { error: e.message });
    return null;
  }
}

module.exports = { transcribeAudio };
