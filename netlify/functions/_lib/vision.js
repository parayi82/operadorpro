// ============================================================
// vision.js — Análisis de imágenes con Claude Vision.
// Detecta si una foto es un ticket/recibo y extrae datos.
// Sin ANTHROPIC_API_KEY: retorna null (flujo manual).
// ============================================================

const logger = require("./logger");

const PROMPT = `Analiza si esta imagen es un ticket, recibo o comprobante de pago de México.
Si ES un ticket, responde SOLO con este JSON (sin texto adicional):
{"is_receipt":true,"amount":850.00,"category":"diesel","vendor":"Pemex Reforma"}
Categorías válidas: diesel, caseta, comida, taller, otro
Si NO es un ticket (es foto de vehículo, documento oficial, etc.):
{"is_receipt":false}`;

/**
 * Analiza una imagen con Claude Vision.
 * @param {string} imageUrl URL pública de la imagen (signed URL de Supabase)
 * @returns {Promise<{is_receipt: boolean, amount?: number, category?: string, vendor?: string}|null>}
 */
async function analyzeReceiptWithClaude(imageUrl) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    logger.info("vision.noop_no_key");
    return null;
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 200,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "url", url: imageUrl } },
            { type: "text", text: PROMPT }
          ]
        }]
      })
    });

    if (!res.ok) {
      logger.error("vision.claude_api_error", { status: res.status });
      return null;
    }

    const data = await res.json();
    const text = (data.content?.[0]?.text || "").trim();
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;

    const parsed = JSON.parse(match[0]);
    logger.info("vision.analysis_done", { is_receipt: parsed.is_receipt, amount: parsed.amount });
    return parsed;
  } catch (e) {
    logger.error("vision.analysis_failed", { error: e.message });
    return null;
  }
}

const ODOMETER_PROMPT = `Esta es una foto del tablero/odómetro de un camión.
Lee el número de kilómetros que muestra el odómetro.
Responde SOLO con JSON, sin texto extra:
{"km": 125450}
Si no puedes leer el número con certeza: {"km": null}`;

/**
 * Lee el kilometraje de una foto de odómetro.
 * @param {string} imageUrl URL pública de la imagen
 * @returns {Promise<{km: number|null}|null>}
 */
async function readOdometerWithClaude(imageUrl) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 100,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "url", url: imageUrl } },
            { type: "text", text: ODOMETER_PROMPT }
          ]
        }]
      })
    });

    if (!res.ok) return null;
    const data = await res.json();
    const text = (data.content?.[0]?.text || "").trim();
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    logger.info("vision.odometer_read", { km: parsed.km });
    return parsed;
  } catch (e) {
    logger.error("vision.odometer_failed", { error: e.message });
    return null;
  }
}

const CATEGORY_EMOJI = { diesel: "⛽", caseta: "🛣️", comida: "🍔", taller: "🔧", otro: "📦" };
const categoryEmoji = (cat) => CATEGORY_EMOJI[cat] || "📦";

module.exports = { analyzeReceiptWithClaude, readOdometerWithClaude, categoryEmoji };
