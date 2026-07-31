// ============================================================
// fleet-send-payment-reminders.js — Función programada (cron) que
// envía los recordatorios de cobro pendientes al cliente final por
// WhatsApp (o Email si así se configura), igual patrón que
// fleet-send-compliance-reminders.js.
// ============================================================

const { getSupabaseAdmin } = require("./_lib/supabaseAdmin");
const { sendReminder } = require("./_lib/notify");
const { reminderMessage, reminderTemplate } = require("./domain/invoicing");
const logger = require("./_lib/logger");

exports.handler = async () => {
  const admin = getSupabaseAdmin();
  const today = new Date().toISOString().slice(0, 10);

  const { data: pending, error } = await admin
    .from("payment_reminders")
    .select(`
      id, scheduled_for,
      freight_invoices:invoice_id (
        folio, amount, due_date, status,
        clients:client_id (contact_phone)
      )
    `)
    .eq("status", "pendiente")
    .lte("scheduled_for", today)
    .limit(200);

  if (error) {
    logger.error("payment_reminders.query_failed", { error: error.message });
    return { statusCode: 500 };
  }

  let sent = 0;
  for (const reminder of pending || []) {
    const invoice = reminder.freight_invoices;
    if (!invoice || invoice.status === "pagada" || invoice.status === "cancelada") {
      await admin.from("payment_reminders").update({ status: "cancelado" }).eq("id", reminder.id);
      continue;
    }

    const daysOverdue = Math.max(0, Math.floor((new Date(today) - new Date(invoice.due_date)) / 86_400_000));
    const freeformText = reminderMessage({
      folio: invoice.folio, amount: invoice.amount, dueDate: invoice.due_date, daysOverdue
    });
    const { templateName, templateParams } = reminderTemplate({
      folio: invoice.folio, amount: invoice.amount, dueDate: invoice.due_date, daysOverdue
    });

    const phone = invoice.clients?.contact_phone;
    const result = phone
      ? await sendReminder(phone, { freeformText, templateName, templateParams })
      : { sent: false, reason: "no_recipient" };

    await admin
      .from("payment_reminders")
      .update({ status: result.sent ? "enviado" : "fallido", sent_at: result.sent ? new Date().toISOString() : null })
      .eq("id", reminder.id);

    if (result.sent) sent++;
  }

  logger.info("payment_reminders.batch_done", { total: (pending || []).length, sent });
  return { statusCode: 200, body: JSON.stringify({ processed: (pending || []).length, sent }) };
};
