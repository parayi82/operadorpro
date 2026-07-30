// ============================================================
// fleet-vehicle-qr.js — Verificación pública por QR (sin auth):
// el chofer muestra este enlace a la autoridad en un retén y se ve
// el estatus de cumplimiento de la unidad en tiempo real, sin
// exponer datos sensibles de la empresa ni del chofer.
//
// Igual que verify-certificate.js: formato estricto anti-enumeración
// + rate limit agresivo por ser endpoint público.
// ============================================================

const { withHandler } = require("./_lib/handler");
const { ok } = require("./_lib/response");
const { ValidationError } = require("./_lib/errors");

exports.handler = withHandler(
  {
    name: "fleet-vehicle-qr",
    methods: ["GET"],
    auth: false,
    rateLimit: { limit: 20, windowMs: 60_000 }
  },
  async ({ event, admin }) => {
    const vehicleId = (event.queryStringParameters?.id || "").trim();
    if (!/^[0-9a-f-]{36}$/i.test(vehicleId)) {
      throw new ValidationError("Identificador de unidad inválido");
    }

    const { data: vehicle } = await admin
      .from("vehicles")
      .select("economic_number, plate, status")
      .eq("id", vehicleId)
      .maybeSingle();
    if (!vehicle) return ok({ found: false });

    const { data: docs } = await admin
      .from("compliance_status_v")
      .select("doc_type, semaforo, expires_at")
      .eq("vehicle_id", vehicleId);

    return ok(
      {
        found: true,
        vehicle: { economic_number: vehicle.economic_number, plate: vehicle.plate, status: vehicle.status },
        documents: docs || []
      },
      { "Cache-Control": "public, max-age=60" }
    );
  }
);
