// ============================================================
// ocr.js — Adaptador plegable de lectura de tickets (OCR).
// Proveedor primario: Claude Vision (ANTHROPIC_API_KEY).
// Fallback: Google Vision (GOOGLE_VISION_API_KEY).
// Sin credenciales: el gasto se guarda igual, marcado para revisión
// manual — el flujo de captura nunca depende de la disponibilidad
// de un proveedor externo.
// ============================================================

const logger = require("./logger");
const { analyzeReceiptWithClaude } = require("./vision");

async function extractWithClaude(imageUrl) {
  const result = await analyzeReceiptWithClaude(imageUrl);
  if (!result || !result.is_receipt) return null;
  return {
    raw_text: null,
    amount: result.amount || null,
    category: result.category || null,
    rfc: null,
    confidence: result.amount ? 0.9 : 0.5
  };
}

async function extractWithGoogleVision(imageUrl) {
  const apiKey = process.env.GOOGLE_VISION_API_KEY;
  const res = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requests: [{ image: { source: { imageUri: imageUrl } }, features: [{ type: "TEXT_DETECTION" }] }]
    })
  });
  if (!res.ok) throw new Error(`Google Vision error: ${res.status}`);
  const data = await res.json();
  const text = data.responses?.[0]?.fullTextAnnotation?.text || "";

  const amountMatch = text.match(/\$?\s?(\d{1,6}(?:[.,]\d{2})?)/);
  const rfcMatch = text.match(/\b([A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3})\b/i);

  return {
    raw_text: text,
    amount: amountMatch ? Number(amountMatch[1].replace(",", "")) : null,
    rfc: rfcMatch ? rfcMatch[1].toUpperCase() : null,
    confidence: text ? 0.7 : 0
  };
}

/**
 * @returns {{raw: object|null, confidence: number|null, needsManualReview: boolean}}
 */
async function extractReceipt(imageUrl) {
  // 1. Claude Vision (mejor en tickets mexicanos)
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const result = await extractWithClaude(imageUrl);
      if (result) return { raw: result, confidence: result.confidence, needsManualReview: false };
    } catch (e) {
      logger.error("ocr.claude_failed", { error: e.message });
    }
  }

  // 2. Google Vision fallback
  if (process.env.GOOGLE_VISION_API_KEY) {
    try {
      const result = await extractWithGoogleVision(imageUrl);
      return { raw: result, confidence: result.confidence, needsManualReview: result.confidence < 0.5 };
    } catch (e) {
      logger.error("ocr.google_failed", { error: e.message });
    }
  }

  logger.info("ocr.noop_no_provider", { imageUrl });
  return { raw: null, confidence: null, needsManualReview: true };
}

module.exports = { extractReceipt };
