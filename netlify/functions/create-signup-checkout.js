// ============================================================
// create-signup-checkout.js — Crea checkout para nuevos usuarios (sin autenticación)
// Flujo: Usuario selecciona plan → Ingresa email → Paga → Cuenta se crea automáticamente
// ============================================================

const Stripe = require("stripe");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Método no permitido" }) };
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    // 1. Parsear datos: email y plan
    const { email, plan: rawPlan } = JSON.parse(event.body || "{}");
    if (!email || !email.includes("@")) {
      return { statusCode: 400, body: JSON.stringify({ error: "Email no válido" }) };
    }

    const plan = rawPlan === "protegido" ? "protegido" : "esencial";
    const priceId = plan === "protegido"
      ? process.env.STRIPE_PRICE_PROTEGIDO
      : process.env.STRIPE_PRICE_ESENCIAL;

    if (!priceId) {
      return { statusCode: 500, body: JSON.stringify({ error: "Plan no configurado" }) };
    }

    const emailLower = email.toLowerCase();

    // 2. Verificar duplicados vía Stripe (fuente de verdad para suscripciones).
    //    profiles no tiene columna email, por lo que la verificación va directo al proveedor.
    const customers = await stripe.customers.list({ email: emailLower, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      const activeSubs = await stripe.subscriptions.list({ customer: customerId, status: "active", limit: 1 });
      if (activeSubs.data.length > 0) {
        return { statusCode: 400, body: JSON.stringify({ error: "Este email ya tiene una suscripción activa. Inicia sesión en tu cuenta." }) };
      }
    }

    // 3. Crear (o reutilizar) el customer de Stripe
    if (!customerId) {
      // Crear nuevo customer
      const customer = await stripe.customers.create({
        email: emailLower,
        metadata: { new_signup: "true" }
      });
      customerId = customer.id;
    }

    // 4. Crear la sesión de Checkout
    const site = process.env.SITE_URL;
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: {
        plan,
        new_signup: "true",
        email: emailLower
      },
      subscription_data: {
        metadata: { plan }
      },
      success_url: `${site}/app.html#/pago-confirmado`,
      cancel_url: `${site}/planes.html`,
      locale: "es",
      allow_promotion_codes: true
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        url: session.url,
        sessionId: session.id
      })
    };
  } catch (e) {
    console.error("create-signup-checkout error:", {
      message: e.message,
      stack: e.stack,
      type: e.type
    });
    const errorMsg = e.message || "No se pudo iniciar el pago";
    return { statusCode: 500, body: JSON.stringify({ error: errorMsg }) };
  }
};
