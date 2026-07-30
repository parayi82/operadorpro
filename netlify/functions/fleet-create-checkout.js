// ============================================================
// fleet-create-checkout.js — Crea la sesión de Stripe Checkout para
// la suscripción de flota (cobro por unidad activa/mes). Solo el
// owner puede iniciar o cambiar la facturación de su empresa.
//
// El precio (STRIPE_FLEET_PRICE_ID) debe crearse UNA vez en Stripe
// como un precio recurrente mensual; si se configura con
// "billing_scheme: tiered" (graduated/volume), Stripe aplica el
// descuento por tamaño de flota automáticamente según la cantidad —
// no hace falta lógica de tiers en este código.
// ============================================================

const { withHandler } = require("./_lib/handler");
const { requireCompanyRole } = require("./_lib/auth");
const { getStripeAdmin } = require("./_lib/stripeAdmin");
const { validate, parseJsonBody, z } = require("./_lib/validate");
const { ok } = require("./_lib/response");
const { ForbiddenError } = require("./_lib/errors");

const schema = z.object({ company_id: z.string().uuid() });

exports.handler = withHandler(
  { name: "fleet-create-checkout", methods: ["POST"], rateLimit: { limit: 10, windowMs: 60_000 } },
  async ({ event, admin, user }) => {
    const { company_id } = validate(schema, parseJsonBody(event));
    await requireCompanyRole(admin, user.id, company_id, ["owner"]);

    const { data: company, error } = await admin
      .from("companies")
      .select("name, stripe_customer_id, subscription_status")
      .eq("id", company_id)
      .single();
    if (error) throw error;
    if (company.subscription_status === "active") {
      throw new ForbiddenError("Esta empresa ya tiene una suscripción activa");
    }

    const stripe = getStripeAdmin();

    let customerId = company.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: company.name,
        metadata: { fleet_company_id: company_id }
      });
      customerId = customer.id;
      await admin.from("companies").update({ stripe_customer_id: customerId }).eq("id", company_id);
    }

    const { count } = await admin
      .from("vehicles")
      .select("id", { count: "exact", head: true })
      .eq("company_id", company_id)
      .eq("status", "activa");
    const quantity = Math.max(count || 0, 1);

    const site = process.env.SITE_URL;
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: process.env.STRIPE_FLEET_PRICE_ID, quantity }],
      client_reference_id: company_id,
      success_url: `${site}/fleet.html#/flota?suscripcion=exito`,
      cancel_url: `${site}/fleet.html#/flota`,
      locale: "es",
      allow_promotion_codes: true
    });

    return ok({ url: session.url });
  }
);
