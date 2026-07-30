// ============================================================
// stripeSync.js — Mantiene la cantidad (quantity) del ítem de
// suscripción de Stripe igual al número de unidades activas de la
// empresa. Se llama después de crear/dar de baja una unidad.
//
// Best-effort: si Stripe falla o la empresa no tiene suscripción
// activa, se loggea y no se lanza — nunca debe romper el flujo de
// alta de una unidad por un problema de facturación.
// ============================================================

const logger = require("./logger");

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {import('stripe')} stripe
 * @param {string} companyId
 */
async function syncFleetSubscriptionQuantity(admin, stripe, companyId) {
  try {
    const { data: company } = await admin
      .from("companies")
      .select("stripe_subscription_id, subscription_status")
      .eq("id", companyId)
      .maybeSingle();

    if (!company?.stripe_subscription_id || company.subscription_status !== "active") {
      return { synced: false, reason: "no_active_subscription" };
    }

    const { count } = await admin
      .from("vehicles")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("status", "activa");

    const quantity = Math.max(count || 0, 1);

    const subscription = await stripe.subscriptions.retrieve(company.stripe_subscription_id);
    const item = subscription.items.data[0];
    if (!item) return { synced: false, reason: "no_subscription_item" };

    if (item.quantity === quantity) return { synced: true, quantity, changed: false };

    await stripe.subscriptionItems.update(item.id, {
      quantity,
      proration_behavior: "create_prorations"
    });

    logger.info("stripe.quantity_synced", { companyId, quantity });
    return { synced: true, quantity, changed: true };
  } catch (e) {
    logger.error("stripe.sync_failed", { companyId, error: e.message });
    return { synced: false, reason: "stripe_error" };
  }
}

module.exports = { syncFleetSubscriptionQuantity };
