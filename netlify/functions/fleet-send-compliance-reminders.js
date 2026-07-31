// ============================================================
// fleet-send-compliance-reminders.js — Función programada (cron,
// ver netlify.toml) que envía por WhatsApp los recordatorios de
// vencimiento pendientes cuyo scheduled_for ya llegó.
//
// No se ejecuta en la petición del usuario (evita bloquear al dueño
// mientras se mandan N mensajes): corre en background por Netlify
// Scheduled Functions.
// ============================================================

const { getSupabaseAdmin } = require("./_lib/supabaseAdmin");
const { sendReminder } = require("./_lib/notify");
const { reminderMessage, reminderTemplate } = require("./domain/compliance");
const logger = require("./_lib/logger");

exports.handler = async () => {
  const admin = getSupabaseAdmin();

  const { data: pending, error } = await admin
    .from("compliance_alerts")
    .select(`
      id, days_before, document_id,
      compliance_documents:document_id (
        doc_type, expires_at,
        vehicles:vehicle_id (economic_number),
        drivers:driver_id (phone, full_name),
        companies:company_id (owner_user_id)
      )
    `)
    .eq("status", "pendiente")
    .lte("scheduled_for", new Date().toISOString().slice(0, 10))
    .limit(200);

  if (error) {
    logger.error("reminders.query_failed", { error: error.message });
    return { statusCode: 500 };
  }

  let sent = 0;
  for (const alert of pending || []) {
    const doc = alert.compliance_documents;
    if (!doc) continue;

    const unitLabel = doc.vehicles?.economic_number
      ? `la unidad ${doc.vehicles.economic_number}`
      : (doc.drivers?.full_name || "tu operador");

    const freeformText = reminderMessage({ docType: doc.doc_type, expiresAt: doc.expires_at, unitLabel });
    const { templateName, templateParams } = reminderTemplate({ docType: doc.doc_type, expiresAt: doc.expires_at, unitLabel });

    // Se notifica al chofer si el documento es suyo, y siempre se
    // recomienda notificar también al dueño (fuera del alcance de
    // este MVP: requiere tabla de teléfono de contacto del dueño).
    const targetPhone = doc.drivers?.phone;
    const result = targetPhone
      ? await sendReminder(targetPhone, { freeformText, templateName, templateParams })
      : { sent: false, reason: "no_recipient" };

    await admin
      .from("compliance_alerts")
      .update({
        status: result.sent ? "enviado" : "fallido",
        sent_at: result.sent ? new Date().toISOString() : null
      })
      .eq("id", alert.id);

    if (result.sent) sent++;
  }

  logger.info("reminders.batch_done", { total: (pending || []).length, sent });
  return { statusCode: 200, body: JSON.stringify({ processed: (pending || []).length, sent }) };
};
