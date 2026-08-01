// ============================================================
// telegram-sync-queue.js — Sincroniza cola offline de Telegram.
// El chofer llama cuando tiene internet para subir fotos/datos
// guardados localmente en el bot.
// ============================================================

const { withHandler } = require("./_lib/handler");
const { validate, parseJsonBody, schemas } = require("./_lib/validate");
const { ok } = require("./_lib/response");
const { ForbiddenError } = require("./_lib/errors");
const logger = require("./_lib/logger");

exports.handler = withHandler(
  { name: "telegram-sync-queue", methods: ["POST"] },
  async ({ event, user, admin }) => {
    const input = validate(schemas.telegramSyncQueue, parseJsonBody(event));

    // Verificar que la sesión pertenece al usuario actual
    const { data: session, error: sessionError } = await admin
      .from("telegram_sessions")
      .select("*")
      .eq("id", input.telegram_session_id)
      .eq("user_id", user.id)
      .single();

    if (sessionError || !session) {
      throw new ForbiddenError("Sesión Telegram no encontrada");
    }

    // Obtener items pendientes
    const { data: queueItems, error: queueError } = await admin
      .from("telegram_offline_queue")
      .select("*")
      .eq("telegram_session_id", input.telegram_session_id)
      .is("synced_at", null)
      .order("created_at", { ascending: true });

    if (queueError) throw queueError;

    const results = [];
    const synced = [];

    for (const item of queueItems) {
      try {
        const result = await processQueueItem(item, session, admin);
        synced.push(item.id);
        results.push({ id: item.id, status: "ok", result });
      } catch (e) {
        logger.error("telegram.sync_queue_item_error", {
          itemId: item.id,
          error: e.message
        });

        // Actualizar retry_count y last_error
        await admin
          .from("telegram_offline_queue")
          .update({
            retry_count: item.retry_count + 1,
            last_error: e.message
          })
          .eq("id", item.id);

        results.push({ id: item.id, status: "error", error: e.message });
      }
    }

    // Marcar como sincronizados
    if (synced.length > 0) {
      await admin
        .from("telegram_offline_queue")
        .update({ synced_at: new Date().toISOString() })
        .in("id", synced);
    }

    logger.info("telegram.queue_synced", {
      sessionId: session.id,
      itemsProcessed: results.length,
      itemsSuccessful: synced.length
    });

    return ok({ synced: synced.length, results });
  }
);

async function processQueueItem(item, session, admin) {
  const { message_type, payload } = item;

  switch (message_type) {
    case "inspection_create": {
      // Crear inspección
      const { vehicle_id, driver_id, odometer_km, gps_lat, gps_lng } = payload;
      const { data, error } = await admin
        .from("inspections")
        .insert({
          company_id: session.company_id,
          vehicle_id,
          driver_id,
          odometer_km,
          gps_lat,
          gps_lng,
          status: "pendiente"
        })
        .select()
        .single();

      if (error) throw error;
      return { inspection_id: data.id };
    }

    case "inspection_photo": {
      // Crear foto de inspección
      const { inspection_id, photo_type, url, gps_lat, gps_lng } = payload;
      const { data, error } = await admin
        .from("inspection_photos")
        .insert({
          inspection_id,
          photo_type,
          url,
          gps_lat,
          gps_lng
        })
        .select()
        .single();

      if (error) throw error;
      return { photo_id: data.id };
    }

    case "inspection_checklist": {
      // Agregar items de checklist
      const { inspection_id, items } = payload;
      const { data, error } = await admin
        .from("inspection_checklist_items")
        .insert(items.map(i => ({ inspection_id, ...i })))
        .select();

      if (error) throw error;
      return { checklistItemsCount: data.length };
    }

    case "trip_start": {
      // Crear viaje
      const { vehicle_id, driver_id, origin, destination, budget_amount } = payload;
      const { data, error } = await admin
        .from("trips")
        .insert({
          company_id: session.company_id,
          vehicle_id,
          driver_id,
          origin,
          destination,
          budget_amount,
          status: "abierto",
          started_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return { trip_id: data.id };
    }

    case "trip_close": {
      // Cerrar viaje
      const { trip_id } = payload;
      const { data, error } = await admin
        .from("trips")
        .update({ status: "cerrado", closed_at: new Date().toISOString() })
        .eq("id", trip_id)
        .select()
        .single();

      if (error) throw error;
      return { trip_id: data.id };
    }

    case "expense_submit": {
      // Registrar gasto
      const { trip_id, category, amount, merchant_rfc, receipt_url, expense_date } = payload;
      const { data, error } = await admin
        .from("expenses")
        .insert({
          trip_id,
          category,
          amount,
          merchant_rfc,
          receipt_url,
          expense_date: expense_date || new Date().toISOString().split("T")[0],
          review_status: "pendiente",
          created_by: session.user_id
        })
        .select()
        .single();

      if (error) throw error;
      return { expense_id: data.id };
    }

    case "document_upload": {
      // Subir documento de cumplimiento
      const { vehicle_id, driver_id, doc_type, doc_number, file_url, expires_at } = payload;
      const { data, error } = await admin
        .from("compliance_documents")
        .insert({
          company_id: session.company_id,
          vehicle_id,
          driver_id,
          doc_type,
          doc_number,
          file_url,
          expires_at,
          created_by: session.user_id
        })
        .select()
        .single();

      if (error) throw error;
      return { doc_id: data.id };
    }

    default:
      throw new Error(`Tipo de mensaje desconocido: ${message_type}`);
  }
}
