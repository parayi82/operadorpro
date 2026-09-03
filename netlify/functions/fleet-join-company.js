// ============================================================
// fleet-join-company.js — "Soy chofer de un patrón": el chofer teclea
// el código de patrón (que el dueño obtiene en fleet-invite-code y
// comparte por WhatsApp) y su teléfono. La RPC vincula su cuenta al
// registro de chofer de esa empresa y lo hace miembro con rol
// 'driver' — sin que el patrón tenga que hacer nada más.
//
// No requiere suscripción: unirse es gratis; el acceso a las
// funciones lo da el plan del patrón (ver requireActiveSubscription).
// ============================================================

const { withHandler } = require("./_lib/handler");
const { validate, parseJsonBody, schemas } = require("./_lib/validate");
const { created } = require("./_lib/response");
const { NotFoundError, ForbiddenError } = require("./_lib/errors");

exports.handler = withHandler(
  { name: "fleet-join-company", methods: ["POST"], rateLimit: { limit: 5, windowMs: 60_000 } },
  async ({ event, admin, user }) => {
    const input = validate(schemas.joinCompany, parseJsonBody(event));

    const { data, error } = await admin.rpc("fn_join_company_as_driver", {
      p_user_id: user.id,
      p_invite_code: input.invite_code.toUpperCase(),
      p_phone: input.phone,
      p_full_name: input.full_name
    });

    if (error) {
      if (error.code === "P0002") throw new NotFoundError("Ese código de patrón no existe. Pídeselo de nuevo a tu jefe.");
      if (error.code === "23505") throw new ForbiddenError("Ese teléfono ya está ligado a otra cuenta en esa empresa.");
      throw error;
    }

    await admin.from("profiles").update({ phone: input.phone })
      .eq("id", user.id).then(() => {}, () => {});

    return created({ driver: data });
  }
);
