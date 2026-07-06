// ============================================================
// stripe-webhook.js — Sincroniza el estado de la suscripción
// Endpoint a registrar en Stripe Dashboard > Developers > Webhooks:
//   https://TU-SITIO.netlify.app/.netlify/functions/stripe-webhook
// Eventos: checkout.session.completed, customer.subscription.updated,
//          customer.subscription.deleted, invoice.payment_failed
// ============================================================

const Stripe = require("stripe");
const { createClient } = require("@supabase/supabase-js");

exports.handler = async (event) => {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // 1. Verificar la firma del webhook (obligatorio: nunca confiar en el body sin firma)
  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      event.headers["stripe-signature"],
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (e) {
    console.error("Firma de webhook inválida:", e.message);
    return { statusCode: 400, body: "Firma inválida" };
  }

  const setStatus = async (customerId, status) => {
    const { error } = await admin
      .from("profiles")
      .update({ subscription_status: status, updated_at: new Date().toISOString() })
      .eq("stripe_customer_id", customerId);
    if (error) console.error("Error actualizando perfil:", error.message);
  };

  try {
    switch (stripeEvent.type) {
      case "checkout.session.completed": {
        const session = stripeEvent.data.object;
        // Respaldo por si el customer no quedó ligado al perfil
        if (session.client_reference_id) {
          await admin.from("profiles")
            .update({
              stripe_customer_id: session.customer,
              subscription_status: "active",
              updated_at: new Date().toISOString()
            })
            .eq("id", session.client_reference_id);
        } else {
          await setStatus(session.customer, "active");
        }
        break;
      }
      case "customer.subscription.updated": {
        const sub = stripeEvent.data.object;
        const map = { active: "active", trialing: "active", past_due: "past_due", canceled: "canceled", unpaid: "past_due", incomplete: "inactive", incomplete_expired: "inactive" };
        await setStatus(sub.customer, map[sub.status] || "inactive");
        break;
      }
      case "customer.subscription.deleted": {
        await setStatus(stripeEvent.data.object.customer, "canceled");
        break;
      }
      case "invoice.payment_failed": {
        await setStatus(stripeEvent.data.object.customer, "past_due");
        break;
      }
      default:
        break; // Eventos no manejados: responder 200 para que Stripe no reintente
    }
    return { statusCode: 200, body: JSON.stringify({ received: true }) };
  } catch (e) {
    console.error("stripe-webhook error:", e);
    return { statusCode: 500, body: "Error interno" };
  }
};
