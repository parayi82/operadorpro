// ============================================================
// create-portal.js — Crea Stripe Customer Portal link
// Permite que el usuario administre su suscripción:
// - Ver facturas
// - Cambiar de plan
// - Actualizar método de pago
// - Cancelar suscripción
// ============================================================

const Stripe = require("stripe");
const { createClient } = require("@supabase/supabase-js");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Método no permitido" }) };
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    // 1. Validar al usuario
    const token = (event.headers.authorization || "").replace("Bearer ", "");
    if (!token) {
      return { statusCode: 401, body: JSON.stringify({ error: "No autenticado" }) };
    }

    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) {
      return { statusCode: 401, body: JSON.stringify({ error: "Token inválido" }) };
    }

    const user = userData.user;

    // 2. Obtener el customer_id de Stripe desde el perfil
    const { data: profile, error: profileErr } = await admin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    if (profileErr || !profile?.stripe_customer_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "No tienes una suscripción asociada" })
      };
    }

    // 3. Crear Stripe Customer Portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${process.env.SITE_URL}/app.html#/perfil`
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ url: session.url })
    };
  } catch (e) {
    console.error("create-portal error:", e);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Error creando portal: " + e.message })
    };
  }
};
