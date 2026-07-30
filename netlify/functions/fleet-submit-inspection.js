// ============================================================
// fleet-submit-inspection.js — Módulo 3: inspección pre-viaje
// NOM-068. Exige 5 fotos + 10 puntos de checklist (validado por zod
// y de nuevo por domain/inspections.js). Si hay falla crítica, se
// rechaza la salida y se registra para que el jefe de taller actúe.
//
// Transacción manual (no RPC) porque las 3 tablas (inspección, fotos,
// checklist) se escriben con el mismo admin client secuencialmente;
// si el paso 2 o 3 fallara se documenta el TODO de moverlo a una
// función Postgres cuando el volumen lo justifique.
// ============================================================

const { withHandler } = require("./_lib/handler");
const { validate, parseJsonBody, schemas } = require("./_lib/validate");
const { requireCompanyRole } = require("./_lib/auth");
const { created } = require("./_lib/response");
const { evaluate, missingRequirements } = require("./domain/inspections");
const { ValidationError } = require("./_lib/errors");
const logger = require("./_lib/logger");

exports.handler = withHandler(
  { name: "fleet-submit-inspection", methods: ["POST"], rateLimit: { limit: 15, windowMs: 60_000 } },
  async ({ event, admin, user }) => {
    const input = validate(schemas.createInspection, parseJsonBody(event));
    await requireCompanyRole(admin, user.id, input.company_id, null); // cualquier miembro (chofer incluido)

    const missing = missingRequirements(input.photos, input.checklist);
    if (missing.missingPhotos.length || missing.missingItems.length) {
      throw new ValidationError("Faltan elementos obligatorios de la inspección", missing);
    }

    const status = evaluate(input.checklist);

    const { data: inspection, error: insErr } = await admin
      .from("inspections")
      .insert({
        company_id: input.company_id,
        vehicle_id: input.vehicle_id,
        driver_id: input.driver_id,
        trip_id: input.trip_id || null,
        odometer_km: input.odometer_km,
        gps_lat: input.gps_lat,
        gps_lng: input.gps_lng,
        status
      })
      .select()
      .single();
    if (insErr) throw insErr;

    const { error: photoErr } = await admin
      .from("inspection_photos")
      .insert(input.photos.map((p) => ({ ...p, inspection_id: inspection.id })));
    if (photoErr) throw photoErr;

    const { error: checklistErr } = await admin
      .from("inspection_checklist_items")
      .insert(input.checklist.map((c) => ({ ...c, inspection_id: inspection.id })));
    if (checklistErr) throw checklistErr;

    if (status === "rechazada") {
      logger.warn("inspection.rejected", { inspectionId: inspection.id, vehicleId: input.vehicle_id });
      // TODO integración: alertar al jefe de taller vía WhatsApp (sendWhatsApp)
      // cuando exista un campo de teléfono de contacto del taller en companies.
    }

    return created({ inspection: { ...inspection, status } });
  }
);
