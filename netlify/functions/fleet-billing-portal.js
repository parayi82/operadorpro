// ============================================================
// fleet-billing-portal.js — Sesión del Billing Portal de Stripe para
// que el owner cambie método de pago, vea facturas o cancele.
// ============================================================

const { withHandler } = require("./_lib/handler");
const { requireCompanyRole } = require("./_lib/auth");
const { getStripeAdmin } = require("./_lib/stripeAdmin");
const { validate, parseJsonBody, z } = require("./_lib/validate");
const { ok } = require("./_lib/response");
const { ValidationError } = require("./_lib/errors");

const schema = z.object({ company_id: z.string().uuid() });

exports.handler = withHandler(
  { name: "fleet-billing-portal", methods: ["POST"], rateLimit: { limit: 10, windowMs: 60_000 } },
  async ({ event, admin, user }) => {
    const { company_id } = validate(schema, parseJsonBody(event));
    await requireCompanyRole(admin, user.id, company_id, ["owner"]);

    const { data: company, error } = await admin
      .from("companies")
      .select("stripe_customer_id")
      .eq("id", company_id)
      .single();
    if (error) throw error;
    if (!company.stripe_customer_id) {
      throw new ValidationError("Esta empresa aún no tiene una suscripción — actívala primero");
    }

    const stripe = getStripeAdmin();
    const site = process.env.SITE_URL;
    const session = await stripe.billingPortal.sessions.create({
      customer: company.stripe_customer_id,
      return_url: `${site}/fleet.html#/flota`
    });

    return ok({ url: session.url });
  }
);
