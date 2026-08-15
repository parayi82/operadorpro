// ============================================================
// send-push-notifications.js — Función programada (cron, 09:00 UTC)
// Envía notificaciones push vía Expo a dueños de empresa cuando:
//   - Una factura de flete vence mañana (freight_invoices)
//   - Un documento de cumplimiento vence en los próximos 7 días (compliance_documents)
// Usa Node 18+ fetch nativo (sin node-fetch).
// ============================================================

const { createClient } = require("@supabase/supabase-js");

const EXPO_PUSH_API = "https://exp.host/--/api/v2/push/send";

async function sendExpoNotification(token, title, body) {
  try {
    const response = await fetch(EXPO_PUSH_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: token, sound: "default", title, body }),
    });
    return await response.json();
  } catch (err) {
    console.error("Error sending push notification:", err.message);
  }
}

exports.handler = async () => {
  const admin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    console.log("🔔 Iniciando envío de notificaciones push...");

    const today = new Date().toISOString().split("T")[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];
    const in7Days = new Date();
    in7Days.setDate(in7Days.getDate() + 7);
    const in7DaysStr = in7Days.toISOString().split("T")[0];

    // 1. Facturas de flete con vencimiento mañana
    const { data: pendingInvoices, error: invError } = await admin
      .from("freight_invoices")
      .select("id, company_id, folio, amount, due_date")
      .eq("status", "pendiente")
      .eq("due_date", tomorrowStr);

    if (invError) console.error("Error consultando facturas:", invError.message);

    // 2. Documentos de cumplimiento que vencen en los próximos 7 días
    const { data: expiringDocs, error: docError } = await admin
      .from("compliance_documents")
      .select("id, company_id, doc_type, expires_at")
      .lte("expires_at", in7DaysStr)
      .gte("expires_at", today);

    if (docError) console.error("Error consultando documentos:", docError.message);

    // 3. Recopilar company_ids únicos que necesitan notificación
    const companyIds = new Set([
      ...(pendingInvoices || []).map((i) => i.company_id),
      ...(expiringDocs || []).map((d) => d.company_id),
    ]);

    if (companyIds.size === 0) {
      console.log("Sin notificaciones pendientes.");
      return { statusCode: 200, body: JSON.stringify({ success: true, notificationsSent: 0 }) };
    }

    // 4. Obtener el user_id del dueño de cada empresa
    const { data: members } = await admin
      .from("company_members")
      .select("company_id, user_id")
      .in("company_id", Array.from(companyIds))
      .eq("role", "owner")
      .eq("status", "active");

    const ownerByCompany = {};
    (members || []).forEach((m) => { ownerByCompany[m.company_id] = m.user_id; });

    // 5. Obtener push tokens de los dueños
    const userIds = [...new Set(Object.values(ownerByCompany))];
    if (userIds.length === 0) {
      return { statusCode: 200, body: JSON.stringify({ success: true, notificationsSent: 0 }) };
    }

    const { data: profiles } = await admin
      .from("profiles")
      .select("id, push_token")
      .in("id", userIds)
      .not("push_token", "is", null);

    const tokenByUser = {};
    (profiles || []).forEach((p) => { if (p.push_token) tokenByUser[p.id] = p.push_token; });

    let notificationsSent = 0;

    // 6. Notificaciones de facturas próximas a vencer
    for (const invoice of (pendingInvoices || [])) {
      const userId = ownerByCompany[invoice.company_id];
      const token = userId && tokenByUser[userId];
      if (!token) continue;
      await sendExpoNotification(
        token,
        "💰 Recordatorio de Cobranza",
        `Flete ${invoice.folio} vence mañana: $${invoice.amount} MXN`
      );
      notificationsSent++;
    }

    // 7. Notificaciones de documentos próximos a vencer
    for (const doc of (expiringDocs || [])) {
      const userId = ownerByCompany[doc.company_id];
      const token = userId && tokenByUser[userId];
      if (!token) continue;
      const days = Math.max(0, Math.ceil((new Date(doc.expires_at) - new Date()) / 86400000));
      await sendExpoNotification(
        token,
        "📄 Documento por Vencer",
        `${doc.doc_type}: vence en ${days} día${days !== 1 ? "s" : ""}`
      );
      notificationsSent++;
    }

    console.log(`✅ Notificaciones enviadas: ${notificationsSent}`);
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        notificationsSent,
        invoicesChecked: (pendingInvoices || []).length,
        documentsChecked: (expiringDocs || []).length,
      }),
    };
  } catch (err) {
    console.error("send-push-notifications error:", err.message);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
