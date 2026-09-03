// ============================================================
// fleet-setup-owner-operator.js — Alta express del hombre-camión.
// "Manejo mi propio camión": en un solo paso registra la unidad y al
// propio dueño como chofer de su empresa (la empresa ya existe: se
// crea sola al registrarse). Sin esto, el hombre-camión tenía que
// pasar por 3 formularios pensados para una flota antes de poder
// abrir su primer viaje.
// ============================================================

const { withHandler } = require("./_lib/handler");
const { requireCompanyRole, requireActiveSubscription } = require("./_lib/auth");
const { validate, parseJsonBody, schemas } = require("./_lib/validate");
const { created } = require("./_lib/response");
const { invalidate } = require("./_lib/cache");

exports.handler = withHandler(
  { name: "fleet-setup-owner-operator", methods: ["POST"], rateLimit: { limit: 10, windowMs: 60_000 } },
  async ({ event, admin, user }) => {
    const input = validate(schemas.setupOwnerOperator, parseJsonBody(event));
    await requireActiveSubscription(admin, user.id, input.company_id);
    await requireCompanyRole(admin, user.id, input.company_id, ["owner", "admin"]);

    const { data, error } = await admin.rpc("fn_setup_owner_operator", {
      p_actor_user_id: user.id,
      p_company_id: input.company_id,
      p_economic_number: input.economic_number,
      p_plate: input.plate.toUpperCase(),
      p_full_name: input.full_name,
      p_phone: input.phone,
      p_odometer_km: input.odometer_km ?? null
    });
    if (error) throw error;

    // El teléfono del perfil se usa para vincular avisos: se sincroniza
    // sin bloquear el alta si falla.
    await admin.from("profiles").update({ phone: input.phone, full_name: input.full_name })
      .eq("id", user.id).then(() => {}, () => {});

    await invalidate(`fleet:${input.company_id}:dashboard`);
    return created({ driver: data });
  }
);
