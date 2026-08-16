// ============================================================
// voice-parser.js — Extrae entidades estructuradas de texto
// transcrito de notas de voz (choferes mexicanos).
// Usa Claude Haiku para parseo semántico rápido.
// ============================================================

const logger = require("./logger");

const PROMPTS = {
  trip: `Eres un extractor de datos de viajes de camión en México.
El chofer dejó una nota de voz. Extrae origen, destino y presupuesto.
Responde SOLO con JSON válido, sin texto extra:
{"origin":"ciudad","destination":"ciudad","budget":número_o_null}

Normaliza nombres: CDMX→"Ciudad de México", GDL→"Guadalajara", MTY→"Monterrey", etc.
Si falta info: pon null en ese campo.
Texto: `,

  expense: `Eres un extractor de gastos de camión en México.
El chofer dejó una nota de voz sobre un gasto. Extrae categoría, monto y comercio.
Categorías válidas: diesel, caseta, comida, taller, otro
Responde SOLO con JSON válido, sin texto extra:
{"category":"diesel|caseta|comida|taller|otro","amount":número_o_null,"merchant":"nombre_o_null"}

Ejemplos:
- "gasté ochocientos en diésel en la pemex" → {"category":"diesel","amount":800,"merchant":"Pemex"}
- "pagué trescientos de caseta" → {"category":"caseta","amount":300,"merchant":null}
Si no hay datos suficientes devuelve: {"category":null,"amount":null,"merchant":null}
Texto: `,

  odometer: `Eres un extractor de lecturas de odómetro.
El chofer mencionó el kilometraje de su unidad.
Responde SOLO con JSON válido, sin texto extra:
{"km":número_o_null}

Ejemplo: "voy en ciento veinte mil quinientos kilómetros" → {"km":120500}
Texto: `
};

async function parseVoice(transcription, type = "expense") {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || !transcription) return null;

  const prompt = PROMPTS[type];
  if (!prompt) return null;

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
        max_tokens: 150,
        messages: [{ role: "user", content: prompt + transcription }]
      })
    });

    if (!res.ok) return null;
    const data = await res.json();
    const text = (data.content?.[0]?.text || "").trim();
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    logger.info("voice_parser.parsed", { type, result: parsed });
    return parsed;
  } catch (e) {
    logger.error("voice_parser.error", { type, error: e.message });
    return null;
  }
}

module.exports = { parseVoice };
