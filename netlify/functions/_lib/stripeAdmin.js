// ============================================================
// stripeAdmin.js — Único punto de creación del cliente de Stripe
// para el módulo de flota. Mismo patrón que supabaseAdmin.js.
// ============================================================

const Stripe = require("stripe");

let cached = null;

function getStripeAdmin() {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Falta la variable de entorno STRIPE_SECRET_KEY");
  cached = new Stripe(key);
  return cached;
}

module.exports = { getStripeAdmin };
