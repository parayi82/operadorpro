// ============================================================
// fleet-create-invoice.js — Registra el flete facturado (con foto de
// remisión/POD firmada) y programa recordatorios de cobro en una
// sola transacción (fn_create_invoice_with_reminders): -3 días,
// +1 día y +7 días respecto al vencimiento.
// ============================================================

const { withHandler } = require("./_lib/handler");
const { requireCompanyRole, requireActiveSubscription } = require("./_lib/auth");
const { validate, parseJsonBody, schemas } = require("./_lib/validate");
const { created } = require("./_lib/response");

exports.handler = withHandler(
  { name: "fleet-create-invoice", methods: ["POST"] },
  async ({ event, admin, user }) => {
    const input = validate(schemas.createInvoice, parseJsonBody(event));
    await requireActiveSubscription(admin, user.id);
    await requireCompanyRole(admin, user.id, input.company_id, ["owner", "admin"]);

    const { data, error } = await admin.rpc("fn_create_invoice_with_reminders", {
      p_actor_user_id: user.id,
      p_company_id: input.company_id,
      p_client_id: input.client_id,
      p_trip_id: input.trip_id || null,
      p_folio: input.folio,
      p_amount: input.amount,
      p_pod_url: input.pod_url || null,
      p_issued_at: input.issued_at || null,
      p_due_date: input.due_date
    });

    if (error) throw error;
    return created({ invoice: data });
  }
);
