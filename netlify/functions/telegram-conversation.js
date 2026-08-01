// ============================================================
// telegram-conversation.js — Maneja flujos conversacionales
// multi-paso para inspecciones, viajes, gastos. Cada flujo
// guarda estado en BD para mantener contexto entre mensajes.
// ============================================================

const logger = require("./_lib/logger");
const telegramSender = require("./telegram-send-message");

// Obtener o crear estado de conversación
async function getOrCreateConversationState(telegramSessionId, admin) {
  const { data, error } = await admin
    .from("telegram_conversation_state")
    .select("*")
    .eq("telegram_session_id", telegramSessionId)
    .single();

  if (error && error.code !== "PGRST116") throw error;

  if (!data) {
    const { data: newState } = await admin
      .from("telegram_conversation_state")
      .insert({
        telegram_session_id: telegramSessionId,
        flow_type: "none",
        current_step: 0,
        context: {}
      })
      .select()
      .single();
    return newState;
  }
  return data;
}

// Actualizar estado de conversación
async function updateConversationState(stateId, flowType, step, context, admin) {
  const { data } = await admin
    .from("telegram_conversation_state")
    .update({
      flow_type: flowType,
      current_step: step,
      context,
      updated_at: new Date().toISOString()
    })
    .eq("id", stateId)
    .select()
    .single();
  return data;
}

// Resetear conversación
async function resetConversation(stateId, admin) {
  return updateConversationState(stateId, "none", 0, {}, admin);
}

// ---------- FLUJO: INSPECCIÓN ----------
async function handleInspectionFlow(chatId, text, session, state, admin) {
  const step = state.current_step;
  const ctx = state.context || {};

  // Paso 1: Seleccionar unidad (número económico)
  if (step === 0) {
    const economicNumber = text.trim().toUpperCase();

    // Buscar la unidad
    const { data: vehicle, error } = await admin
      .from("vehicles")
      .select("id, economic_number, plate")
      .eq("company_id", session.company_id)
      .eq("economic_number", economicNumber)
      .single();

    if (error || !vehicle) {
      await telegramSender.send(
        chatId,
        "No encontre una unidad con ese numero. Ingresa el numero economico de nuevo:"
      );
      return;
    }

    ctx.vehicle_id = vehicle.id;
    ctx.vehicle_economic_number = vehicle.economic_number;
    ctx.photos = [];

    await updateConversationState(state.id, "inspection", 1, ctx, admin);
    await telegramSender.send(
      chatId,
      `Unidad ${vehicle.economic_number} seleccionada.\n\nEnvia 5 fotos: Frente, Llantas, Motor, Caja trasera, Odometro\n\n(Cuando termines escribe: listo)`
    );
    return;
  }

  // Paso 2: Esperar fotos (hasta 5) - texto "listo" avanza
  if (step === 1) {
    if (text.toLowerCase() === "listo") {
      if (!ctx.photos || ctx.photos.length === 0) {
        await telegramSender.send(
          chatId,
          "Necesitas al menos una foto. Envia las fotos o escribe 'sin fotos' si no puedes:"
        );
        return;
      }

      ctx.photos_collected = true;
      await updateConversationState(state.id, "inspection", 2, ctx, admin);
      await telegramSender.send(
        chatId,
        "Gracias. Ahora ingresa el kilometraje actual (numero):"
      );
      return;
    }

    if (text.toLowerCase() === "sin fotos") {
      ctx.photos_collected = true;
      await updateConversationState(state.id, "inspection", 2, ctx, admin);
      await telegramSender.send(
        chatId,
        "Ingresa el kilometraje actual (numero):"
      );
      return;
    }

    // Si no es "listo", esperar fotos via handlePhotoMessage
    await telegramSender.send(
      chatId,
      `Fotos recibidas: ${ctx.photos.length}\n\nEnvia mas fotos o escribe 'listo':`
    );
    return;
  }

  // Paso 3: Obtener kilometraje
  if (step === 2) {
    const odometer = parseInt(text.trim(), 10);
    if (isNaN(odometer) || odometer < 0) {
      await telegramSender.send(chatId, "Ingresa un numero valido:");
      return;
    }

    ctx.odometer_km = odometer;
    await updateConversationState(state.id, "inspection", 3, ctx, admin);

    const checklist = [
      "1. Frenos",
      "2. Luces",
      "3. Llantas (desgaste)",
      "4. Niveles de fluidos",
      "5. Fugas",
      "6. Espejos",
      "7. Claxon",
      "8. Extintor",
      "9. Triangulos de seguridad",
      "10. Cinturon de seguridad"
    ];

    await telegramSender.send(
      chatId,
      `Ahora responde el checklist. Por cada item escribe S (si) o N (no):\n\n${checklist.join("\n")}\n\nEscribe: SSSSSNSSSSS (ejemplo)`
    );
    return;
  }

  // Paso 4: Recopilar respuestas del checklist (10 items)
  if (step === 3) {
    const answers = text.trim().toUpperCase().split("").slice(0, 10);
    if (answers.length < 10 || !answers.every(a => ["S", "N"].includes(a))) {
      await telegramSender.send(
        chatId,
        "Escribe exactamente 10 caracteres (S o N). Intenta de nuevo:"
      );
      return;
    }

    ctx.checklist_answers = answers;

    // Crear inspección en la BD
    try {
      const checklist_items = [
        "frenos", "luces", "llantas_desgaste", "niveles_fluidos", "fugas",
        "espejos", "claxon", "extintor", "triangulos", "cinturon"
      ].map((key, idx) => ({
        item_key: key,
        ok: answers[idx] === "S",
        notes: ""
      }));

      const { data: inspection, error } = await admin
        .from("inspections")
        .insert({
          company_id: session.company_id,
          vehicle_id: ctx.vehicle_id,
          driver_id: session.user_id,
          odometer_km: ctx.odometer_km,
          status: "completada"
        })
        .select()
        .single();

      if (error) throw error;

      // Insertar items de checklist
      await admin
        .from("inspection_checklist_items")
        .insert(checklist_items.map(i => ({ inspection_id: inspection.id, ...i })));

      // Insertar fotos si existen
      if (ctx.photos && ctx.photos.length > 0) {
        const photoTypes = ["frente", "llantas", "motor", "caja_trasera", "odometro"];
        const photos = ctx.photos.map((url, idx) => ({
          inspection_id: inspection.id,
          photo_type: photoTypes[idx] || "otro",
          url
        }));

        await admin
          .from("inspection_photos")
          .insert(photos);
      }

      await telegramSender.send(
        chatId,
        `Inspeccion completada (${ctx.photos.length} fotos).\n\nInspecciona otra unidad? Escribe /start para volver al menu.`
      );

      await resetConversation(state.id, admin);
    } catch (e) {
      logger.error("telegram.inspection_create_error", { error: e.message });
      await telegramSender.send(chatId, "Error al guardar inspeccion. Intenta de nuevo.");
      await resetConversation(state.id, admin);
    }
    return;
  }
}

// ---------- FLUJO: VIAJE ----------
async function handleTripFlow(chatId, text, session, state, admin) {
  const step = state.current_step;
  const ctx = state.context || {};

  // Paso 1: Origen
  if (step === 0) {
    ctx.origin = text.trim();
    await updateConversationState(state.id, "trip", 1, ctx, admin);
    await telegramSender.send(chatId, "Escribe el destino:");
    return;
  }

  // Paso 2: Destino
  if (step === 1) {
    ctx.destination = text.trim();
    await updateConversationState(state.id, "trip", 2, ctx, admin);
    await telegramSender.send(chatId, "Presupuesto para gastos (numero en pesos):");
    return;
  }

  // Paso 3: Presupuesto
  if (step === 2) {
    const budget = parseFloat(text.trim());
    if (isNaN(budget) || budget <= 0) {
      await telegramSender.send(chatId, "Ingresa un numero valido:");
      return;
    }

    ctx.budget_amount = budget;

    // Crear viaje
    try {
      // Buscar primer chofer y unidad de la empresa
      const { data: drivers } = await admin
        .from("drivers")
        .select("id")
        .eq("company_id", session.company_id)
        .limit(1);

      const { data: vehicles } = await admin
        .from("vehicles")
        .select("id")
        .eq("company_id", session.company_id)
        .limit(1);

      if (!drivers || drivers.length === 0 || !vehicles || vehicles.length === 0) {
        await telegramSender.send(
          chatId,
          "Configura choferes y unidades en la app web para crear viajes."
        );
        await resetConversation(state.id, admin);
        return;
      }

      const driver = drivers[0];
      const vehicle = vehicles[0];

      const { data: trip, error } = await admin
        .from("trips")
        .insert({
          company_id: session.company_id,
          vehicle_id: vehicles.id,
          driver_id: driver.id,
          origin: ctx.origin,
          destination: ctx.destination,
          budget_amount: ctx.budget_amount,
          status: "abierto",
          started_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      ctx.trip_id = trip.id;

      await telegramSender.send(
        chatId,
        `Viaje iniciado: ${ctx.origin} -> ${ctx.destination}\n\nPresupuesto: $${ctx.budget_amount} MXN\n\nAhora puedes reportar gastos. /start para menu.`
      );

      await resetConversation(state.id, admin);
    } catch (e) {
      logger.error("telegram.trip_create_error", { error: e.message });
      await telegramSender.send(chatId, "Error al crear viaje. Intenta de nuevo.");
      await resetConversation(state.id, admin);
    }
    return;
  }
}

// ---------- FLUJO: GASTO ----------
async function handleExpenseFlow(chatId, text, session, state, admin) {
  const step = state.current_step;
  const ctx = state.context || {};

  // Paso 1: ID del viaje
  if (step === 0) {
    const tripId = text.trim();

    // Verificar que el viaje existe y pertenece a la empresa
    const { data: trip, error } = await admin
      .from("trips")
      .select("id, origin, destination, status")
      .eq("id", tripId)
      .eq("company_id", session.company_id)
      .single();

    if (error || !trip) {
      await telegramSender.send(
        chatId,
        "ID de viaje no encontrado. Intenta de nuevo:"
      );
      return;
    }

    if (trip.status !== "abierto") {
      await telegramSender.send(chatId, "Este viaje ya esta cerrado.");
      await resetConversation(state.id, admin);
      return;
    }

    ctx.trip_id = tripId;
    await updateConversationState(state.id, "expense", 1, ctx, admin);
    await telegramSender.send(chatId, "Selecciona categoria: diesel, caseta, comida, taller, otro");
    return;
  }

  // Paso 2: Categoría
  if (step === 1) {
    const category = text.trim().toLowerCase();
    const validCategories = ["diesel", "caseta", "comida", "taller", "otro"];

    if (!validCategories.includes(category)) {
      await telegramSender.send(
        chatId,
        `Categoria invalida. Elige una: ${validCategories.join(", ")}`
      );
      return;
    }

    ctx.category = category;
    await updateConversationState(state.id, "expense", 2, ctx, admin);
    await telegramSender.send(chatId, "Monto del gasto (numero en pesos):");
    return;
  }

  // Paso 3: Monto
  if (step === 2) {
    const amount = parseFloat(text.trim());
    if (isNaN(amount) || amount <= 0) {
      await telegramSender.send(chatId, "Ingresa un numero valido:");
      return;
    }

    ctx.amount = amount;
    await updateConversationState(state.id, "expense", 3, ctx, admin);
    await telegramSender.send(
      chatId,
      "Sube una foto del recibo (o escribe 'sin foto' para omitir):"
    );
    return;
  }

  // Paso 4: Foto del recibo (opcional)
  if (step === 3) {
    // Esperar foto o "sin foto" para avanzar
    // Las fotos se procesan via handlePhotoMessage en telegram-poller.js
    // que auto-avanza el flujo cuando se recibe una foto

    if (text.toLowerCase() === "sin foto") {
      // Crear gasto sin foto
      try {
        const { data: expense, error } = await admin
          .from("expenses")
          .insert({
            trip_id: ctx.trip_id,
            category: ctx.category,
            amount: ctx.amount,
            expense_date: new Date().toISOString().split("T")[0],
            review_status: "pendiente",
            created_by: session.user_id
          })
          .select()
          .single();

        if (error) throw error;

        await telegramSender.send(
          chatId,
          `Gasto registrado: ${ctx.category.toUpperCase()} $${ctx.amount} MXN\n\nReporta otro gasto? /start para menu.`
        );

        await resetConversation(state.id, admin);
      } catch (e) {
        logger.error("telegram.expense_create_error", { error: e.message });
        await telegramSender.send(chatId, "Error al guardar gasto. Intenta de nuevo.");
        await resetConversation(state.id, admin);
      }
      return;
    }

    // Esperando foto
    await telegramSender.send(
      chatId,
      `Envia una foto del recibo o escribe 'sin foto':`
    );
    return;
  }

  // Paso 5: Crear gasto con foto (llamado después de foto cargada)
  if (step === 4) {
    try {
      const { data: expense, error } = await admin
        .from("expenses")
        .insert({
          trip_id: ctx.trip_id,
          category: ctx.category,
          amount: ctx.amount,
          receipt_url: ctx.receipt_url || null,
          expense_date: new Date().toISOString().split("T")[0],
          review_status: "pendiente",
          created_by: session.user_id
        })
        .select()
        .single();

      if (error) throw error;

      await telegramSender.send(
        chatId,
        `Gasto registrado: ${ctx.category.toUpperCase()} $${ctx.amount} MXN\n\nReporta otro gasto? /start para menu.`
      );

      await resetConversation(state.id, admin);
    } catch (e) {
      logger.error("telegram.expense_create_error", { error: e.message });
      await telegramSender.send(chatId, "Error al guardar gasto. Intenta de nuevo.");
      await resetConversation(state.id, admin);
    }
    return;
  }
}

// ---------- Router principal ----------
async function handleConversationMessage(chatId, text, session, admin) {
  const state = await getOrCreateConversationState(session.id, admin);

  if (state.flow_type === "inspection") {
    return handleInspectionFlow(chatId, text, session, state, admin);
  }

  if (state.flow_type === "trip") {
    return handleTripFlow(chatId, text, session, state, admin);
  }

  if (state.flow_type === "expense") {
    return handleExpenseFlow(chatId, text, session, state, admin);
  }
}

// Iniciar un flujo
async function startFlow(chatId, flowType, session, admin) {
  const state = await getOrCreateConversationState(session.id, admin);
  await updateConversationState(state.id, flowType, 0, {}, admin);
  return state;
}

module.exports = {
  getOrCreateConversationState,
  updateConversationState,
  resetConversation,
  handleConversationMessage,
  startFlow
};
