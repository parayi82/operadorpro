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

  // Paso 1: Seleccionar unidad con botones o typing
  if (step === 0) {
    // Parse button format "T-001 (ABC-1234)" or just typed "T-001"
    let economicNumber = text.trim().toUpperCase();
    const match = economicNumber.match(/^([^\s]+)\s*\(/);
    if (match) {
      economicNumber = match[1]; // Extract economic number from button format
    }

    // Buscar la unidad exacta
    const { data: vehicle, error } = await admin
      .from("vehicles")
      .select("id, economic_number, plate")
      .eq("company_id", session.company_id)
      .eq("economic_number", economicNumber)
      .single();

    if (error || !vehicle) {
      // Si falla, mostrar vehículos disponibles como buttons
      if (!ctx.showedVehiclesOnce) {
        const { data: vehicles } = await admin
          .from("vehicles")
          .select("economic_number, plate")
          .eq("company_id", session.company_id)
          .limit(6);

        if (vehicles && vehicles.length > 0) {
          ctx.showedVehiclesOnce = true;
          await updateConversationState(state.id, "inspection", 0, ctx, admin);
          const buttons = vehicles.map(v => [`${v.economic_number} (${v.plate})`]);
          await telegramSender.send(
            chatId,
            "Selecciona una unidad o escribe el numero economico:",
            buttons
          );
          return;
        }
      }

      await telegramSender.send(
        chatId,
        "No hay unidades disponibles. Configura una en la app web."
      );
      await resetConversation(state.id, admin);
      return;
    }

    ctx.vehicle_id = vehicle.id;
    ctx.vehicle_economic_number = vehicle.economic_number;
    ctx.photos = [];

    await updateConversationState(state.id, "inspection", 1, ctx, admin);

    const buttons = [["📸 Foto"], ["✅ Listo"], ["⏭️ Sin fotos"]];
    await telegramSender.send(
      chatId,
      `Unidad ${vehicle.economic_number} seleccionada.\n\nEnvia fotos: Frente, Llantas, Motor, Caja trasera, Odometro\n\n(Cuando termines: Listo)`
    );
    return;
  }

  // Paso 2: Esperar fotos (hasta 5) con botones
  if (step === 1) {
    const buttons = [["✅ Listo"], ["⏭️ Sin fotos"]];

    if (text === "✅ Listo") {
      if (!ctx.photos || ctx.photos.length === 0) {
        await telegramSender.send(
          chatId,
          "Necesitas al menos una foto. Envia las fotos o usa 'Sin fotos':",
          buttons
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

    if (text === "⏭️ Sin fotos") {
      ctx.photos_collected = true;
      await updateConversationState(state.id, "inspection", 2, ctx, admin);
      await telegramSender.send(
        chatId,
        "Ingresa el kilometraje actual (numero):"
      );
      return;
    }

    // Si es texto pero no botón, es mensaje de foto
    if (!text.startsWith("✅") && !text.startsWith("⏭️")) {
      await telegramSender.send(
        chatId,
        `Fotos recibidas: ${ctx.photos.length || 0}\n\nEnvia mas fotos o usa los botones:`,
        buttons
      );
      return;
    }

    await telegramSender.send(
      chatId,
      `Fotos recibidas: ${ctx.photos.length || 0}\n\nEnvia mas fotos o usa los botones:`,
      buttons
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

    const buttons = [["✅ Sí", "❌ No"]];
    await telegramSender.send(
      chatId,
      "Ahora responde el checklist. 10 items con botones Sí/No:\n\n1/10: Frenos",
      buttons
    );
    return;
  }

  // Paso 4: Recopilar respuestas del checklist (10 items) — usa botones
  if (step === 3) {
    const buttons = [["✅ Sí", "❌ No"]];

    if (!ctx.checklist_answers) {
      ctx.checklist_answers = [];
      ctx.checklist_item_index = 0;
    }

    const itemIndex = ctx.checklist_item_index || 0;
    const checklist = [
      "Frenos", "Luces", "Llantas (desgaste)", "Niveles de fluidos", "Fugas",
      "Espejos", "Claxon", "Extintor", "Triangulos de seguridad", "Cinturon de seguridad"
    ];

    // Procesar respuesta anterior (si no es primer item)
    if (itemIndex > 0) {
      if (text === "✅ Sí") {
        ctx.checklist_answers.push("S");
      } else if (text === "❌ No") {
        ctx.checklist_answers.push("N");
      } else {
        await telegramSender.send(chatId, `${itemIndex}/${checklist.length}: Usa los botones Sí/No`, buttons);
        return;
      }
    }

    // Si completamos todos los items
    if (ctx.checklist_answers.length === 10) {
      const answers = ctx.checklist_answers;

      // Crear inspección en la BD
      try {
        // Obtener el driver_id del usuario
        const { data: driver, error: driverError } = await admin
          .from("drivers")
          .select("id")
          .eq("company_id", session.company_id)
          .eq("user_id", session.user_id)
          .single();

        if (driverError || !driver) {
          await telegramSender.send(
            chatId,
            "No encontramos tu perfil de chofer. Configura en la app web."
          );
          await resetConversation(state.id, admin);
          return;
        }

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
            driver_id: driver.id,
            odometer_km: ctx.odometer_km,
            status: "pendiente"
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

    // Mostrar siguiente item del checklist
    const nextItemIndex = ctx.checklist_answers.length;
    ctx.checklist_item_index = nextItemIndex + 1;
    await updateConversationState(state.id, "inspection", 3, ctx, admin);

    await telegramSender.send(
      chatId,
      `${nextItemIndex + 1}/${checklist.length}: ${checklist[nextItemIndex]}`,
      buttons
    );
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
          vehicle_id: vehicle.id,
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

  // Paso 1: Seleccionar viaje con botones o typing
  if (step === 0) {
    const buttonText = text.trim();

    // First try to find by trip ID (if typed)
    let tripQuery = admin
      .from("trips")
      .select("id, origin, destination, status")
      .eq("company_id", session.company_id);

    const { data: trips, error } = await tripQuery;

    let trip = null;
    if (trips && trips.length > 0) {
      // Try exact ID match first
      trip = trips.find(t => t.id === buttonText);

      // If not found, try button format match "Origin → Destination"
      if (!trip && buttonText.includes("→")) {
        trip = trips.find(t => `${t.origin} → ${t.destination}` === buttonText);
      }
    }

    if (!trip) {
      // Si falla, mostrar viajes recientes como buttons
      if (!ctx.showedTripsOnce) {
        const { data: recentTrips } = await admin
          .from("trips")
          .select("id, origin, destination")
          .eq("company_id", session.company_id)
          .eq("status", "abierto")
          .order("started_at", { ascending: false })
          .limit(4);

        if (recentTrips && recentTrips.length > 0) {
          ctx.showedTripsOnce = true;
          await updateConversationState(state.id, "expense", 0, ctx, admin);
          const buttons = recentTrips.map(t => [`${t.origin} → ${t.destination}`]);
          await telegramSender.send(
            chatId,
            "Selecciona un viaje abierto o escribe el ID:",
            buttons
          );
          return;
        }
      }

      await telegramSender.send(
        chatId,
        "No hay viajes abiertos. Crea uno desde /start"
      );
      await resetConversation(state.id, admin);
      return;
    }

    if (trip.status !== "abierto") {
      await telegramSender.send(chatId, "Este viaje ya esta cerrado.");
      await resetConversation(state.id, admin);
      return;
    }

    ctx.trip_id = trip.id;
    await updateConversationState(state.id, "expense", 1, ctx, admin);

    const buttons = [
      ["⛽ Diesel", "🛣️ Caseta"],
      ["🍔 Comida", "🔧 Taller"],
      ["📦 Otro"]
    ];
    await telegramSender.send(chatId, "Elige la categoria del gasto:", buttons);
    return;
  }

  // Paso 2: Categoría con botones
  if (step === 1) {
    const categoryMap = {
      "⛽ Diesel": "diesel",
      "🛣️ Caseta": "caseta",
      "🍔 Comida": "comida",
      "🔧 Taller": "taller",
      "📦 Otro": "otro",
      // Support direct text input too
      "diesel": "diesel",
      "caseta": "caseta",
      "comida": "comida",
      "taller": "taller",
      "otro": "otro"
    };

    const inputText = text.trim();
    const category = categoryMap[inputText] || categoryMap[inputText.toLowerCase()];

    const validCategories = ["diesel", "caseta", "comida", "taller", "otro"];
    if (!validCategories.includes(category)) {
      const buttons = [
        ["⛽ Diesel", "🛣️ Caseta"],
        ["🍔 Comida", "🔧 Taller"],
        ["📦 Otro"]
      ];
      await telegramSender.send(chatId, "Elige la categoria del gasto:", buttons);
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

// ---------- CONFIRMACIÓN DE GASTO DETECTADO POR IA ----------
// Se activa cuando el usuario mandó una foto fuera de un flujo,
// la IA detectó un ticket y está esperando confirmación.
async function handlePendingExpenseReply(chatId, text, session, state, admin) {
  const pending = state.context.pending_expense;
  const normalized = text.toLowerCase().trim()
    .normalize("NFD").replace(/[̀-ͯ]/g, ""); // quita acentos

  const isYes = ["si", "sí", "yes", "confirmar", "✅ confirmar", "ok", "va"].includes(normalized);
  const isNo = ["no", "cancelar", "❌ cancelar", "cancel"].includes(normalized);

  if (isYes) {
    if (!pending.trip_id) {
      // Sin viaje: pedir que abra uno primero
      await updateConversationState(state.id, "none", 0, {}, admin);
      const buttons = [["🚗 Crear Viaje", "↩️ Menú Principal"]];
      await telegramSender.send(chatId, "No hay viajes abiertos. Crea uno para poder registrar el gasto.", buttons);
      return;
    }
    try {
      await admin.from("expenses").insert({
        trip_id: pending.trip_id,
        category: pending.category || "otro",
        amount: pending.amount,
        receipt_url: pending.receipt_url || null,
        expense_date: new Date().toISOString().split("T")[0],
        review_status: "ok",
        created_by: session.user_id
      });
      await updateConversationState(state.id, "none", 0, {}, admin);
      await telegramSender.send(chatId,
        `✅ Gasto registrado:\n${getCatEmoji(pending.category)} ${(pending.category || "otro").toUpperCase()} — $${pending.amount} MXN`
      );
    } catch (e) {
      logger.error("telegram.auto_expense_save_error", { error: e.message });
      await updateConversationState(state.id, "none", 0, {}, admin);
      await telegramSender.send(chatId, "❌ Error al guardar. Intenta de nuevo.");
    }
    return;
  }

  if (isNo) {
    await updateConversationState(state.id, "none", 0, {}, admin);
    await telegramSender.send(chatId, "Cancelado. Envía otra foto o usa /start.");
    return;
  }

  // Quizás el usuario seleccionó un viaje diferente del que se mostró
  const { data: trips } = await admin
    .from("trips").select("id, origin, destination")
    .eq("company_id", session.company_id).eq("status", "abierto").limit(5);

  const match = trips?.find((t) => {
    const label = `${t.origin} → ${t.destination}`.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    return label === normalized || label.includes(normalized) || normalized.includes(t.origin.toLowerCase());
  });

  if (match) {
    const newCtx = { ...state.context, pending_expense: { ...pending, trip_id: match.id } };
    await updateConversationState(state.id, "none", 0, newCtx, admin);
    const buttons = [["✅ Confirmar", "❌ Cancelar"]];
    await telegramSender.send(chatId,
      `¿Registro $${pending.amount} ${(pending.category || "otro").toUpperCase()} para <b>${match.origin} → ${match.destination}</b>?`,
      buttons
    );
    return;
  }

  // Respuesta no reconocida
  const buttons = [["✅ Confirmar", "❌ Cancelar"]];
  await telegramSender.send(chatId, `Responde "Confirmar" para guardar o "Cancelar" para descartar.`, buttons);
}

function getCatEmoji(cat) {
  return { diesel: "⛽", caseta: "🛣️", comida: "🍔", taller: "🔧", otro: "📦" }[cat] || "📦";
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
  handlePendingExpenseReply,
  startFlow
};
