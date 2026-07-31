// ============================================================
// fleet-admin-create-account.js — "Alta manual": el administrador da
// de alta una cuenta sin que la persona se registre sola (útil para
// onboarding por venta directa/telefónica, como se describe en
// ARCHITECTURE.md). Crea el usuario con una contraseña temporal (el
// admin se la comparte por su cuenta, ej. WhatsApp) en vez de depender
// de que el correo SMTP de Supabase esté configurado.
//
// La cuenta creada dispara los mismos triggers que un registro normal
// (perfil + empresa automática) — mismo camino de código, cero
// duplicación de lógica de alta.
// ============================================================

const crypto = require("crypto");
const { withHandler } = require("./_lib/handler");
const { requirePlatformAdmin } = require("./_lib/auth");
const { validate, parseJsonBody, schemas } = require("./_lib/validate");
const { created } = require("./_lib/response");
const { ValidationError } = require("./_lib/errors");
const logger = require("./_lib/logger");

function generateTempPassword() {
  return crypto.randomBytes(12).toString("base64url"); // ~16 caracteres, alta entropía
}

exports.handler = withHandler(
  { name: "fleet-admin-create-account", methods: ["POST"], rateLimit: { limit: 20, windowMs: 60_000 } },
  async ({ event, admin, user }) => {
    await requirePlatformAdmin(admin, user.id);
    const input = validate(schemas.adminCreateAccount, parseJsonBody(event));

    const tempPassword = generateTempPassword();
    const { data: created_, error } = await admin.auth.admin.createUser({
      email: input.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: input.full_name }
    });
    if (error) throw new ValidationError(error.message);

    const newUserId = created_.user.id;

    // Los triggers de la BD ya crearon profiles + companies (dueño = newUserId).
    // Tipo de contribuyente va a la empresa recién creada; activar el plan
    // (certificación + Flota incluida, una sola suscripción) va al perfil.
    if (input.entity_type) {
      const { data: company } = await admin
        .from("companies").select("id").eq("owner_user_id", newUserId).maybeSingle();
      if (company) {
        await admin.from("companies").update({ entity_type: input.entity_type }).eq("id", company.id);
      }
    }
    if (input.activate_subscription) {
      await admin
        .from("profiles")
        .update({ subscription_status: "active", plan: input.plan || "esencial" })
        .eq("id", newUserId);
    }

    logger.info("admin.account_created", { adminId: user.id, newUserId, email: input.email });

    return created({
      user: { id: newUserId, email: input.email, full_name: input.full_name },
      temp_password: tempPassword
    });
  }
);
