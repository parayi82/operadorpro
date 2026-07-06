// ============================================================
// create-checkout.js — Crea la sesión de Stripe Checkout (suscripción)
// Requiere variables de entorno en Netlify:
//   STRIPE_SECRET_KEY, STRIPE_PRICE_ID, SITE_URL,
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
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

    // 1. Validar al usuario con su token de Supabase
    const token = (event.headers.authorization || "").replace("Bearer ", "");
    if (!token) return { statusCode: 401, body: JSON.stringify({ error: "Sesión no válida" }) };

    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) {
      return { statusCode: 401, body: JSON.stringify({ error: "Sesión no válida" }) };
    }
    const user = userData.user;

    // 2. Reutilizar el customer de Stripe si ya existe
    const { data: profile } = await admin
      .from("profiles").select("stripe_customer_id, subscription_status")
      .eq("id", user.id).single();

    if (profile?.subscription_status === "active") {
      return { statusCode: 400, body: JSON.stringify({ error: "Tu suscripción ya está activa" }) };
    }

    let customerId = profile?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id }
      });
      customerId = customer.id;
      await admin.from("profiles").update({ stripe_customer_id: customerId }).eq("id", user.id);
    }

    // 3. Crear la sesión de Checkout
    const site = process.env.SITE_URL;
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      client_reference_id: user.id,
      success_url: `${site}/app.html#/suscripcion-exito`,
      cancel_url: `${site}/app.html#/dashboard`,
      locale: "es",
      allow_promotion_codes: true
    });

    return { statusCode: 200, body: JSON.stringify({ url: session.url }) };
  } catch (e) {
    console.error("create-checkout error:", e);
    return { statusCode: 500, body: JSON.stringify({ error: "No se pudo iniciar el pago" }) };
  }
};
