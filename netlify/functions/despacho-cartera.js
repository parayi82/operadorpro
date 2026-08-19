// ============================================================
// despacho-cartera.js — Cartera de clientes del panel despacho.
//   GET  → lista los clientes de la cartera del usuario autenticado
//   POST → agrega un cliente a la cartera (body: {client_nombre, client_rfc})
//   DELETE → elimina un cliente (body: {client_rfc})
// ============================================================

const { withHandler } = require("./_lib/handler");
const { validate, parseJsonBody, z } = require("./_lib/validate");
const { ok, created } = require("./_lib/response");
const { NotFoundError } = require("./_lib/errors");

const addSchema = z.object({
  client_nombre: z.string().trim().min(2).max(150),
  client_rfc: z.string().trim().min(3).max(13)
});

const removeSchema = z.object({
  client_rfc: z.string().trim().min(3).max(13)
});

exports.handler = withHandler(
  { name: "despacho-cartera", methods: ["GET", "POST", "DELETE"] },
  async ({ event, admin, user }) => {
    if (event.httpMethod === "GET") {
      const { data, error } = await admin
        .from("despacho_cartera")
        .select("id, client_nombre, client_rfc, created_at")
        .eq("despacho_user_id", user.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return ok({ clientes: data || [] });
    }

    if (event.httpMethod === "POST") {
      const input = validate(addSchema, parseJsonBody(event));

      const { data, error } = await admin
        .from("despacho_cartera")
        .upsert(
          {
            despacho_user_id: user.id,
            client_nombre: input.client_nombre,
            client_rfc: input.client_rfc.toUpperCase()
          },
          { onConflict: "despacho_user_id,client_rfc", ignoreDuplicates: false }
        )
        .select()
        .single();

      if (error) throw error;
      return created({ cliente: data });
    }

    // DELETE
    const input = validate(removeSchema, parseJsonBody(event));

    const { data, error } = await admin
      .from("despacho_cartera")
      .delete()
      .eq("despacho_user_id", user.id)
      .eq("client_rfc", input.client_rfc.toUpperCase())
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new NotFoundError("Cliente no encontrado en tu cartera");
    return ok({ removed: data });
  }
);
