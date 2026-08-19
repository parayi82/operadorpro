// ============================================================
// mutar-datos-cliente.js — Actualiza el nombre de un cliente
// ya existente en la cartera del usuario autenticado.
// Body: { client_rfc, client_nombre }
// ============================================================

const { withHandler } = require("./_lib/handler");
const { validate, parseJsonBody, z } = require("./_lib/validate");
const { ok } = require("./_lib/response");
const { NotFoundError } = require("./_lib/errors");

const schema = z.object({
  client_rfc: z.string().trim().min(3).max(13),
  client_nombre: z.string().trim().min(2).max(150)
});

exports.handler = withHandler(
  { name: "mutar-datos-cliente", methods: ["POST"] },
  async ({ event, admin, user }) => {
    const input = validate(schema, parseJsonBody(event));
    const rfc = input.client_rfc.toUpperCase();

    const { data, error } = await admin
      .from("despacho_cartera")
      .update({ client_nombre: input.client_nombre })
      .eq("despacho_user_id", user.id)
      .eq("client_rfc", rfc)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new NotFoundError("Cliente no encontrado en tu cartera");
    return ok({ cliente: data });
  }
);
