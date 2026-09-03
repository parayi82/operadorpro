// ============================================================
// fleet-save-maintenance.js — "Mi camión": crea, actualiza o borra un
// rubro de mantenimiento de la unidad (aceite cada N km, llantas,
// frenos, verificación…). Cualquier miembro puede registrarlo: el
// chofer es quien está en el taller cuando se hace el servicio.
// ============================================================

const { withHandler } = require("./_lib/handler");
const { requireCompanyRole, requireActiveSubscription } = require("./_lib/auth");
const { assertBelongsToCompany } = require("./_lib/tenant");
const { validate, parseJsonBody, schemas } = require("./_lib/validate");
const { ok } = require("./_lib/response");
const { NotFoundError } = require("./_lib/errors");

exports.handler = withHandler(
  { name: "fleet-save-maintenance", methods: ["POST"] },
  async ({ event, admin, user }) => {
    const input = validate(schemas.saveMaintenance, parseJsonBody(event));
    await requireActiveSubscription(admin, user.id, input.company_id);
    await requireCompanyRole(admin, user.id, input.company_id, null);
    await assertBelongsToCompany(admin, "vehicles", input.vehicle_id, input.company_id, "La unidad");

    if (input.id) {
      const { data: existing } = await admin.from("maintenance_items")
        .select("id").eq("id", input.id).eq("company_id", input.company_id).maybeSingle();
      if (!existing) throw new NotFoundError("Rubro de mantenimiento no encontrado");

      if (input.delete) {
        const { error } = await admin.from("maintenance_items").delete().eq("id", input.id);
        if (error) throw error;
        return ok({ deleted: true });
      }
    }

    const row = {
      company_id: input.company_id,
      vehicle_id: input.vehicle_id,
      kind: input.kind,
      label: input.label,
      every_km: input.every_km ?? null,
      last_km: input.last_km ?? null,
      last_date: input.last_date ?? null,
      due_date: input.due_date ?? null,
      notes: input.notes ?? null,
      updated_at: new Date().toISOString()
    };

    const query = input.id
      ? admin.from("maintenance_items").update(row).eq("id", input.id)
      : admin.from("maintenance_items").insert({ ...row, created_by: user.id });

    const { data, error } = await query.select().single();
    if (error) throw error;

    // Un servicio recién hecho con km capturado también actualiza el
    // odómetro de la unidad si es el dato más reciente.
    if (input.last_km != null) {
      await admin.from("vehicles")
        .update({ odometer_km: input.last_km })
        .eq("id", input.vehicle_id)
        .or(`odometer_km.is.null,odometer_km.lt.${input.last_km}`);
    }

    return ok({ item: data });
  }
);
