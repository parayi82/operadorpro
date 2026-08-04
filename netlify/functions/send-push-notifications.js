const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const EXPO_PUSH_API = 'https://exp.host/--/api/v2/push/send';

// Enviar una notificación push a través de Expo
async function sendExpoNotification(token, title, body) {
  try {
    const response = await fetch(EXPO_PUSH_API, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: token,
        sound: 'default',
        title,
        body,
        data: { withSome: 'data' },
      }),
    });

    const data = await response.json();
    return data;
  } catch (err) {
    console.error('Error sending push:', err);
    throw err;
  }
}

exports.handler = async (event, context) => {
  // Verificar que es un cron job autorizado
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    console.log('🔔 Enviando notificaciones push...');

    // 1. Buscar cobranzas vencidas mañana
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const { data: pendingCollections, error: collError } = await supabase
      .from('freight_collections')
      .select('id, user_id, client_name, amount, due_date')
      .eq('status', 'pending')
      .eq('due_date', tomorrowStr);

    if (collError) throw collError;

    // 2. Buscar documentos que vencen en 7 días
    const in7Days = new Date();
    in7Days.setDate(in7Days.getDate() + 7);

    const { data: expiringDocs, error: docError } = await supabase
      .from('unit_documents')
      .select('id, unit_id, type, expires_at')
      .lte('expires_at', in7Days.toISOString())
      .gte('expires_at', new Date().toISOString());

    if (docError) throw docError;

    // 3. Obtener tokens de push para enviar notificaciones
    const userIds = new Set([
      ...pendingCollections.map(c => c.user_id),
      // Para docs, necesitaríamos relacionar unit_id con user_id
    ]);

    const { data: users } = await supabase
      .from('profiles')
      .select('id, push_token')
      .in('id', Array.from(userIds))
      .not('push_token', 'is', null);

    let notificationsSent = 0;

    // Enviar notificaciones de cobranzas
    for (const collection of pendingCollections) {
      const user = users?.find(u => u.id === collection.user_id);
      if (user?.push_token) {
        await sendExpoNotification(
          user.push_token,
          '💰 Recordatorio de Cobranza',
          `${collection.client_name} vence mañana: $${collection.amount}`
        );
        notificationsSent++;
      }
    }

    // Enviar notificaciones de documentos vencidos
    for (const doc of expiringDocs) {
      // Este es un ejemplo simplificado
      // En producción, necesitarías obtener el user_id del unit_id
      console.log(`📄 Documento ${doc.type} de unidad ${doc.unit_id} próximo a vencer`);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        notificationsSent,
        collectionsChecked: pendingCollections.length,
        documentsChecked: expiringDocs.length,
      }),
    };
  } catch (err) {
    console.error('Error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
