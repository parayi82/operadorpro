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
const { requireCompanyRole, requireActiveSubscription } = require("./_lib/auth");
const { assertBelongsToCompany } = require("./_lib/tenant");
const { created } = require("./_lib/response");
const { evaluate, missingRequirements } = require("./domain/inspections");
const { ValidationError } = require("./_lib/errors");
const { sendWhatsApp } = require("./_lib/notify");
const logger = require("./_lib/logger");

exports.handler = withHandler(
  { name: "fleet-submit-inspection", methods: ["POST"], rateLimit: { limit: 15, windowMs: 60_000 } },
  async ({ event, admin, user }) => {
    const input = validate(schemas.createInspection, parseJsonBody(event));
    await requireActiveSubscription(admin, user.id, input.company_id);
    await requireCompanyRole(admin, user.id, input.company_id, null); // cualquier miembro (chofer incluido)
    await assertBelongsToCompany(admin, "vehicles", input.vehicle_id, input.company_id, "La unidad");
    await assertBelongsToCompany(admin, "drivers", input.driver_id, input.company_id, "El chofer");
    if (input.trip_id) await assertBelongsToCompany(admin, "trips", input.trip_id, input.company_id, "El viaje");

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

      // Alertar al dueño de la empresa vía WhatsApp (best-effort, nunca bloquea la respuesta)
      (async () => {
        try {
          const { data: ownerMember } = await admin
            .from("company_members")
            .select("user_id")
            .eq("company_id", input.company_id)
            .eq("role", "owner")
            .single();

          if (!ownerMember?.user_id) return;

          const { data: ownerProfile } = await admin
            .from("profiles")
            .select("phone")
            .eq("id", ownerMember.user_id)
            .single();

          if (!ownerProfile?.phone) return;

          await sendWhatsApp(
            ownerProfile.phone,
            `⚠️ Inspección RECHAZADA en OperadorPro\n\nLa unidad no pasó la revisión pre-viaje (NOM-068). Hay elementos críticos que requieren atención antes de salir. Revisa los detalles en tu panel: ${process.env.SITE_URL || "https://operadorpro.netlify.app"}/app.html#/inspecciones`
          );
        } catch (alertErr) {
          logger.warn("inspection.alert_failed", { inspectionId: inspection.id, error: alertErr.message });
        }
      })();
    }

    return created({ inspection: { ...inspection, status } });
  }
);
