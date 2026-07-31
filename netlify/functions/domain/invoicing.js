// ============================================================
// domain/invoicing.js — Vigencia/mora de facturas de flete.
// ============================================================

/** @returns {'pendiente'|'vencida'|'pagada'|'cancelada'} */
function computeStatus(invoice, today = new Date()) {
  if (invoice.status === "pagada" || invoice.status === "cancelada") return invoice.status;
  const due = new Date(`${invoice.due_date}T00:00:00Z`);
  return due < today ? "vencida" : "pendiente";
}

function reminderMessage({ folio, amount, dueDate, daysOverdue }) {
  if (daysOverdue > 0) {
    return `📄 OperadorPro: tu factura del viaje #${folio} por $${amount} MXN tiene ${daysOverdue} día(s) de retraso. Vencimiento: ${dueDate}.`;
  }
  return `📄 OperadorPro: tu factura del viaje #${folio} por $${amount} MXN vence el ${dueDate}.`;
}

// Nombres exactos de las plantillas aprobadas en Meta WhatsApp Manager.
// Cuerpos sugeridos (variables en el mismo orden que templateParams):
// pago_proximo: "OperadorPro: tu factura del viaje {{1}} por ${{2}} MXN
//   vence el {{3}}."
// pago_vencido: "OperadorPro: tu factura del viaje {{1}} por ${{2}} MXN
//   tiene {{3}} día(s) de retraso. Vencimiento: {{4}}."
const PAYMENT_REMINDER_TEMPLATE = "operadorpro_pago_proximo";
const PAYMENT_OVERDUE_TEMPLATE = "operadorpro_pago_vencido";

function reminderTemplate({ folio, amount, dueDate, daysOverdue }) {
  if (daysOverdue > 0) {
    return { templateName: PAYMENT_OVERDUE_TEMPLATE, templateParams: [folio, amount, daysOverdue, dueDate] };
  }
  return { templateName: PAYMENT_REMINDER_TEMPLATE, templateParams: [folio, amount, dueDate] };
}

module.exports = {
  computeStatus, reminderMessage, reminderTemplate,
  PAYMENT_REMINDER_TEMPLATE, PAYMENT_OVERDUE_TEMPLATE
};
