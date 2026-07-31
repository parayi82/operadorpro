// ============================================================
// fleet-stripe-webhook.js — Sincroniza el estado de la suscripción
// de flota. Endpoint a registrar en Stripe Dashboard > Developers >
// Webhooks (por separado del webhook de certificación):
//   https://TU-SITIO.netlify.app/.netlify/functions/fleet-stripe-webhook
// Eventos: checkout.session.completed, customer.subscription.updated,
//          customer.subscription.deleted, invoice.payment_failed
//
// No pasa por _lib/handler.js (auth de usuario) porque Stripe llama
// este endpoint directamente, sin JWT — la autenticidad se garantiza
// verificando la firma (stripe-signature) con STRIPE_FLEET_WEBHOOK_SECRET,
// igual que el webhook de certificación ya existente.
// ============================================================

const { getStripeAdmin } = require("./_lib/stripeAdmin");
const { getSupabaseAdmin } = require("./_lib/supabaseAdmin");
const logger = require("./_lib/logger");

const STATUS_MAP = {
  active: "active", trialing: "active",
  past_due: "past_due", unpaid: "past_due",
  canceled: "canceled",
  incomplete: "inactive", incomplete_expired: "inactive"
};

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Método no permitido" }) };
  }

  const stripe = getStripeAdmin();
  const admin = getSupabaseAdmin();

  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      event.headers["stripe-signature"],
      process.env.STRIPE_FLEET_WEBHOOK_SECRET
    );
  } catch (e) {
    logger.warn("fleet_stripe_webhook.invalid_signature", { error: e.message });
    return { statusCode: 400, body: "Firma inválida" };
  }

  const setStatus = async (customerId, status, extra = {}) => {
    const { error } = await admin
      .from("companies")
      .update({ subscription_status: status, updated_at: new Date().toISOString(), ...extra })
      .eq("stripe_customer_id", customerId);
    if (error) logger.error("fleet_stripe_webhook.update_failed", { error: error.message });
  };

  try {
    switch (stripeEvent.type) {
      case "checkout.session.completed": {
        const session = stripeEvent.data.object;
        const extra = { stripe_subscription_id: session.subscription || null };
        if (session.client_reference_id) {
          const { error } = await admin
            .from("companies")
            .update({
              stripe_customer_id: session.customer,
              subscription_status: "active",
              updated_at: new Date().toISOString(),
              ...extra
            })
            .eq("id", session.client_reference_id);
          if (error) logger.error("fleet_stripe_webhook.update_failed", { error: error.message });
        } else {
          await setStatus(session.customer, "active", extra);
        }
        break;
      }
      case "customer.subscription.updated": {
        const sub = stripeEvent.data.object;
        await setStatus(sub.customer, STATUS_MAP[sub.status] || "inactive", { stripe_subscription_id: sub.id });
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
    logger.error("fleet_stripe_webhook.error", { error: e.message });
    return { statusCode: 500, body: "Error interno" };
  }
};
