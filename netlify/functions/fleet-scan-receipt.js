// ============================================================
// fleet-scan-receipt.js — OCR best-effort de ticket para el cliente web.
// Recibe una URL ya subida a Storage y devuelve los datos extraídos
// (amount, category, vendor, is_receipt) sin guardar nada en BD.
// ============================================================

const { withHandler } = require("./_lib/handler");
const { parseJsonBody } = require("./_lib/validate");
const { ok } = require("./_lib/response");
const { analyzeReceiptWithClaude } = require("./_lib/vision");

exports.handler = withHandler(
  { name: "fleet-scan-receipt", methods: ["POST"], rateLimit: { limit: 40, windowMs: 60_000 } },
  async ({ event }) => {
    const { receipt_url } = parseJsonBody(event);
    if (!receipt_url || typeof receipt_url !== "string") {
      return ok({ is_receipt: false });
    }
    const result = await analyzeReceiptWithClaude(receipt_url);
    return ok(result || { is_receipt: false });
  }
);
