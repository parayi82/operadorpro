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

module.exports = { computeStatus, reminderMessage };
