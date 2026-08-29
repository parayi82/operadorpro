// ============================================================
// operador-ui.js — Interfaz nativa para operadores en campo.
// Mínimo texto manual; todo en botones, listas, cámara y voz.
// Depende de: state, callFn, uploadToBucket, loadCompanyData, sb, esc
// (globals de panel.js que se carga antes)
// ============================================================

(function () {
  // ── Constantes ───────────────────────────────────────────────
  const CATEGORIES = [
    { key: "diesel",  label: "Diesel",  icon: "⛽" },
    { key: "caseta",  label: "Caseta",  icon: "🛣️" },
    { key: "comida",  label: "Comida",  icon: "🍽️" },
    { key: "taller",  label: "Taller",  icon: "🔧" },
    { key: "otro",    label: "Otro",    icon: "📦" }
  ];

  const CHECKLIST = [
    { key: "frenos",           label: "Frenos",            icon: "🛑" },
    { key: "luces",            label: "Luces",             icon: "💡" },
    { key: "llantas_desgaste", label: "Llantas",           icon: "🛞" },
    { key: "niveles_fluidos",  label: "Niveles de fluidos", icon: "🫧" },
    { key: "fugas",            label: "Sin fugas",         icon: "💧" },
    { key: "espejos",          label: "Espejos",           icon: "🪞" },
    { key: "claxon",           label: "Claxon",            icon: "📯" },
    { key: "extintor",         label: "Extintor",          icon: "🧯" },
    { key: "triangulos",       label: "Triángulos",        icon: "⚠️" },
    { key: "cinturon",         label: "Cinturón",          icon: "🪢" }
  ];

  const PHOTO_TYPES = [
    { key: "frente",       label: "Frente",        icon: "🚛" },
    { key: "llantas",      label: "Llantas",       icon: "🛞" },
    { key: "motor",        label: "Motor",         icon: "⚙️" },
    { key: "caja_trasera", label: "Parte trasera", icon: "📦" },
    { key: "odometro",     label: "Odómetro",      icon: "🔢" }
  ];

  const $el = () => document.getElementById("app");
  const fmtMXN = (n) =>
    `$${Number(n || 0).toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  // ── Modo operador (oculta topbar desktop) ────────────────────
  function setOpMode()   { document.body.classList.add("op-mode"); }
  function clearOpMode() { document.body.classList.remove("op-mode"); }

  // ── Bottom tabs ──────────────────────────────────────────────
  function tabs(active) {
    const TABS = [
      ["#/operador",            "🏠", "Inicio"],
      ["#/operador/viaje",      "🚗", "Viaje"],
      ["#/operador/gasto",      "💵", "Gasto"],
      ["#/operador/inspeccion", "🔍", "Insp."],
      ["#/operador/estado",     "📄", "Docs"],
    ];
    return `<nav class="op-tabs">${TABS.map(([href, icon, label]) =>
      `<a href="${href}" class="op-tab${active === href ? " active" : ""}">
        <span class="op-tab-icon">${icon}</span><span>${label}</span>
      </a>`).join("")}</nav>`;
  }

  // ── Cabecera de wizard ───────────────────────────────────────
  function wzHdr(title, stepN, total) {
    const pct = total > 1 ? Math.round((stepN / (total - 1)) * 100) : 100;
    return `
      <div class="op-wizard-header">
        <button class="op-back-btn" id="wz-back">←</button>
        <span class="op-wizard-title">${title}</span>
        <span class="op-wizard-counter">${stepN + 1}/${total}</span>
      </div>
      <div class="op-progress-track"><div class="op-progress-fill" style="width:${pct}%"></div></div>`;
  }

  // ── Pantalla wrapper ─────────────────────────────────────────
  function screen(header, body, tabActive) {
    return `<div class="op-screen">${header}<div class="op-wizard-body">${body}</div>${tabs(tabActive)}</div>`;
  }

  // ── Voz (fallback a prompt si no disponible) ─────────────────
  function dictate(prompt, cb) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { const t = window.prompt(prompt); if (t) cb(t); return; }
    const rec = new SR();
    rec.lang = "es-MX"; rec.interimResults = false; rec.maxAlternatives = 1;
    rec.onresult = (e) => cb(e.results[0][0].transcript);
    rec.onerror  = () => { const t = window.prompt(`${prompt}\n(Escribe aquí:)`); if (t) cb(t); };
    rec.start();
  }

  // ── GPS (best-effort) ────────────────────────────────────────
  function getGPS() {
    return new Promise((res) => {
      if (!navigator.geolocation) return res(null);
      navigator.geolocation.getCurrentPosition(
        (p) => res({ lat: p.coords.latitude, lng: p.coords.longitude }),
        ()  => res(null),
        { timeout: 5000 }
      );
    });
  }

  // ── Ciudades recientes (de viajes cargados) ──────────────────
  function recentCities() {
    const seen = new Set(); const out = [];
    for (const t of (state.trips || [])) {
      if (t.origin && !seen.has(t.origin))           { seen.add(t.origin);      out.push(t.origin); }
      if (t.destination && !seen.has(t.destination)) { seen.add(t.destination); out.push(t.destination); }
      if (out.length >= 8) break;
    }
    return out;
  }

  // ── Selector de ciudad con sugerencias + voz ─────────────────
  function cityPicker(fieldId, voiceLabel, currentVal) {
    const cities = recentCities();
    return `
      ${cities.length ? `<div class="op-city-suggestions">${cities.map((c) =>
        `<button class="op-city-btn" data-city="${esc(c)}">${esc(c)}</button>`).join("")}</div>` : ""}
      <div class="op-city-input-row">
        <input id="${fieldId}" class="op-city-input" type="text"
               placeholder="Escribe la ciudad" value="${esc(currentVal)}">
        <button class="op-voice-btn" id="voice-${fieldId}" title="Dictar">🎤</button>
      </div>
      <button class="op-btn-primary" id="next-${fieldId}" style="margin-top:16px">Continuar →</button>`;
  }

  function wireCityPicker(fieldId, voiceLabel, onNext) {
    const el = $el();
    el.querySelectorAll(".op-city-btn").forEach((b) => {
      b.onclick = () => { document.getElementById(fieldId).value = b.dataset.city; };
    });
    document.getElementById(`voice-${fieldId}`).onclick = () =>
      dictate(voiceLabel, (t) => { document.getElementById(fieldId).value = t; });
    document.getElementById(`next-${fieldId}`).onclick = () => {
      const v = document.getElementById(fieldId).value.trim();
      if (!v) { alert("Ingresa la ciudad"); return; }
      onNext(v);
    };
  }

  // ── Datos del operador actual ────────────────────────────────
  async function myDriver() {
    if (!state.session || !state.companyId) return null;
    const { data } = await sb.from("drivers")
      .select("id, full_name, status")
      .eq("company_id", state.companyId)
      .eq("user_id", state.session.user.id)
      .maybeSingle();
    return data?.status === "activo" ? data : null;
  }

  // ── Viaje abierto del operador ───────────────────────────────
  async function openTrip(driverId) {
    const { data } = await sb.from("trips")
      .select("id, origin, destination, budget_amount, started_at")
      .eq("company_id", state.companyId)
      .eq("driver_id", driverId)
      .eq("status", "abierto")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data;
  }

  // ── Total gastado en un viaje ────────────────────────────────
  async function tripSpent(tripId) {
    const { data } = await sb.from("expenses").select("amount").eq("trip_id", tripId);
    return (data || []).reduce((s, r) => s + Number(r.amount), 0);
  }

  // ── Pantalla de bloqueo informativa ─────────────────────────
  function blockScreen(msg, backHref, tabActive) {
    return `
      <div class="op-screen">
        <div class="op-wizard-header">
          <a href="${backHref}" class="op-back-btn">←</a>
          <span class="op-wizard-title">Aviso</span>
        </div>
        <div class="op-wizard-body">
          <div class="op-alert-box">${msg}</div>
        </div>
        ${tabs(tabActive)}
      </div>`;
  }

  // ═══════════════════════════════════════════════════════════
  //  HOME
  // ═══════════════════════════════════════════════════════════
  async function renderHome() {
    setOpMode();
    const el = $el();
    el.innerHTML = `<div class="op-screen"><div class="op-wizard-body" style="color:var(--gris-texto)">Cargando…</div>${tabs("#/operador")}</div>`;

    await loadCompanyData();
    const driver = await myDriver();
    const trip   = driver ? await openTrip(driver.id) : null;

    let tripBanner = "";
    if (trip) {
      const spent  = await tripSpent(trip.id);
      const budget = Number(trip.budget_amount || 0);
      const pct    = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
      const fill   = pct >= 90 ? "danger" : pct >= 70 ? "warning" : "";
      tripBanner = `
        <div class="op-active-trip" onclick="location.hash='#/operador/viaje'">
          <div class="op-active-trip-badge">VIAJE ACTIVO</div>
          <div class="op-active-trip-route">${esc(trip.origin)} → ${esc(trip.destination)}</div>
          <div class="op-budget-labels">
            <span>Gastado: ${fmtMXN(spent)}</span><span>Presupuesto: ${fmtMXN(budget)}</span>
          </div>
          <div class="op-budget-track">
            <div class="op-budget-fill ${fill}" style="width:${pct}%"></div>
          </div>
          <button class="op-add-expense-btn"
            onclick="event.stopPropagation();location.hash='#/operador/gasto'">
            + Reportar Gasto
          </button>
        </div>`;
    }

    const noDriver = !driver
      ? `<div class="op-alert-box">
           ⚠️ No estás dado de alta como operador activo.<br>
           Pide a tu despachador que te registre en <strong>Flota → Operadores</strong>.
         </div>`
      : "";

    const nombre = driver ? driver.full_name.split(" ")[0] : "Operador";

    el.innerHTML = `
      <div class="op-screen">
        <div class="op-home-header">
          <div class="op-home-name">Hola, ${esc(nombre)}</div>
          <div class="op-home-plan">${esc(state.company?.name || "OperadorPro")}</div>
        </div>
        ${noDriver}
        ${tripBanner}
        <div class="op-action-grid">
          <button class="op-action-card" data-go="#/operador/viaje">
            <span class="op-action-emoji">${trip ? "🚗" : "🚦"}</span>
            <span class="op-action-label">${trip ? "Mi Viaje" : "Crear Viaje"}</span>
          </button>
          <button class="op-action-card${!trip || !driver ? " op-action-card--muted" : ""}"
                  data-go="#/operador/gasto">
            <span class="op-action-emoji">💵</span>
            <span class="op-action-label">Reportar Gasto</span>
          </button>
          <button class="op-action-card${!driver ? " op-action-card--muted" : ""}"
                  data-go="#/operador/inspeccion">
            <span class="op-action-emoji">🔍</span>
            <span class="op-action-label">Inspección</span>
          </button>
          <button class="op-action-card" data-go="#/operador/estado">
            <span class="op-action-emoji">📄</span>
            <span class="op-action-label">Mis Docs</span>
          </button>
          <button class="op-action-card" data-go="#/operador/cursos">
            <span class="op-action-emoji">📚</span>
            <span class="op-action-label">Mis Cursos</span>
          </button>
          <button class="op-action-card" data-go="#/operador/perfil">
            <span class="op-action-emoji">👤</span>
            <span class="op-action-label">Mi Perfil</span>
          </button>
        </div>
        ${tabs("#/operador")}
      </div>`;

    el.querySelectorAll("[data-go]").forEach((btn) => {
      if (btn.classList.contains("op-action-card--muted")) return;
      btn.onclick = () => { location.hash = btn.dataset.go; };
    });
  }

  // ═══════════════════════════════════════════════════════════
  //  VIAJE
  // ═══════════════════════════════════════════════════════════
  async function renderViaje() {
    setOpMode();
    const el = $el();
    el.innerHTML = `<div class="op-screen"><div class="op-wizard-body" style="color:var(--gris-texto)">Cargando…</div>${tabs("#/operador/viaje")}</div>`;

    await loadCompanyData();
    const driver = await myDriver();

    if (!driver) {
      el.innerHTML = blockScreen(
        "No estás dado de alta como operador activo. Pide a tu despachador que te registre.",
        "#/operador", "#/operador/viaje"
      );
      return;
    }

    const trip = await openTrip(driver.id);

    // ── Viaje activo: mostrar opciones ───────────────────────
    if (trip) {
      const spent  = await tripSpent(trip.id);
      const budget = Number(trip.budget_amount || 0);
      const pct    = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
      const fill   = pct >= 90 ? "danger" : pct >= 70 ? "warning" : "";

      el.innerHTML = `
        <div class="op-screen">
          <div class="op-wizard-header">
            <a href="#/operador" class="op-back-btn">←</a>
            <span class="op-wizard-title">Viaje Activo</span>
          </div>
          <div class="op-wizard-body">
            <div class="op-confirm-card">
              <div class="op-confirm-row">
                <span class="op-confirm-label">Origen</span>
                <span class="op-confirm-value">${esc(trip.origin)}</span>
              </div>
              <div class="op-confirm-row">
                <span class="op-confirm-label">Destino</span>
                <span class="op-confirm-value">${esc(trip.destination)}</span>
              </div>
              <div class="op-confirm-row">
                <span class="op-confirm-label">Presupuesto</span>
                <span class="op-confirm-value">${fmtMXN(budget)}</span>
              </div>
              <div class="op-confirm-row">
                <span class="op-confirm-label">Gastado</span>
                <span class="op-confirm-value">${fmtMXN(spent)} (${pct}%)</span>
              </div>
            </div>
            <div class="op-budget-track" style="margin:0 0 20px">
              <div class="op-budget-fill ${fill}" style="width:${pct}%"></div>
            </div>
            <button class="op-btn-primary op-gap" id="btn-gasto">💵 Reportar Gasto</button>
            <button class="op-btn-danger" id="btn-close">🏁 Cerrar Viaje</button>
            <div class="form-msg" id="trip-msg"></div>
          </div>
          ${tabs("#/operador/viaje")}
        </div>`;

      document.getElementById("btn-gasto").onclick = () => { location.hash = "#/operador/gasto"; };
      document.getElementById("btn-close").onclick = async () => {
        if (!confirm("¿Cerrar este viaje?")) return;
        const msg = document.getElementById("trip-msg");
        msg.textContent = "Cerrando…"; msg.className = "form-msg";
        try {
          await callFn("fleet-close-trip", { method: "POST", body: { trip_id: trip.id } });
          location.hash = "#/operador";
        } catch (e) { msg.textContent = e.message; msg.className = "form-msg error"; }
      };
      return;
    }

    // ── Sin viaje: wizard para crear uno ────────────────────
    const actives = state.vehicles.filter((v) => v.status === "activa");
    if (!actives.length) {
      el.innerHTML = blockScreen(
        "No hay unidades activas. Pide a tu despachador que registre la unidad en <strong>Flota</strong>.",
        "#/operador", "#/operador/viaje"
      );
      return;
    }

    const TOTAL = 5;
    const wz = { vehicle_id: null, origin: "", destination: "", budget: 0 };

    function wzScreen(stepN, title, body) {
      const pct = Math.round((stepN / (TOTAL - 1)) * 100);
      return `
        <div class="op-screen">
          ${wzHdr(title, stepN, TOTAL)}
          <div class="op-wizard-body">${body}</div>
          ${tabs("#/operador/viaje")}
        </div>`;
    }

    function showVehicle() {
      el.innerHTML = wzScreen(0, "¿Qué unidad?",
        `<div class="op-selector-list">${actives.map((v) =>
          `<button class="op-selector-item${wz.vehicle_id === v.id ? " selected" : ""}" data-vid="${v.id}">
            <div class="op-selector-text">
              <div>${esc(v.economic_number)}</div>
              <div class="op-selector-sub">Placa: ${esc(v.plate)}</div>
            </div>
            <span class="op-selector-arrow">›</span>
          </button>`).join("")}</div>`
      );
      document.getElementById("wz-back").onclick = () => { location.hash = "#/operador"; };
      el.querySelectorAll("[data-vid]").forEach((btn) => {
        btn.onclick = () => { wz.vehicle_id = btn.dataset.vid; showOrigin(); };
      });
    }

    function showOrigin() {
      el.innerHTML = wzScreen(1, "¿De dónde sales?", cityPicker("origin", "Di el origen", wz.origin));
      document.getElementById("wz-back").onclick = showVehicle;
      wireCityPicker("origin", "Di el origen", (v) => { wz.origin = v; showDest(); });
    }

    function showDest() {
      el.innerHTML = wzScreen(2, "¿A dónde vas?", cityPicker("dest", "Di el destino", wz.destination));
      document.getElementById("wz-back").onclick = showOrigin;
      wireCityPicker("dest", "Di el destino", (v) => { wz.destination = v; showBudget(); });
    }

    function showBudget() {
      const PRESETS = [1000, 2000, 3000, 5000, 8000, 10000];
      el.innerHTML = wzScreen(3, "¿Cuánto presupuesto?",
        `<div class="op-amount-grid">${PRESETS.map((p) =>
          `<button class="op-amount-btn${wz.budget === p ? " selected" : ""}" data-p="${p}">
            ${fmtMXN(p)}</button>`).join("")}
        </div>
        <div class="op-city-input-row" style="margin-top:12px">
          <input id="budget-inp" class="op-city-input" type="number" inputmode="decimal"
                 placeholder="Otro monto" value="${wz.budget || ""}">
          <button class="op-voice-btn" id="voice-budget-inp">🎤</button>
        </div>
        <button class="op-btn-primary" id="next-budget-inp" style="margin-top:16px">Continuar →</button>`
      );
      document.getElementById("wz-back").onclick = showDest;
      el.querySelectorAll("[data-p]").forEach((btn) => {
        btn.onclick = () => {
          wz.budget = Number(btn.dataset.p);
          document.getElementById("budget-inp").value = wz.budget;
          el.querySelectorAll(".op-amount-btn").forEach((b) => b.classList.toggle("selected", b === btn));
        };
      });
      document.getElementById("voice-budget-inp").onclick = () =>
        dictate("Di el monto del presupuesto", (t) => {
          const n = parseFloat(t.replace(/[^0-9.]/g, ""));
          if (!isNaN(n)) { wz.budget = n; document.getElementById("budget-inp").value = n; }
        });
      document.getElementById("next-budget-inp").onclick = () => {
        const n = parseFloat(document.getElementById("budget-inp").value);
        if (isNaN(n) || n < 0) { alert("Ingresa un monto válido"); return; }
        wz.budget = n; showConfirm();
      };
    }

    function showConfirm() {
      const v = actives.find((x) => x.id === wz.vehicle_id);
      el.innerHTML = wzScreen(4, "Confirmar viaje",
        `<div class="op-confirm-card">
          <div class="op-confirm-row">
            <span class="op-confirm-label">Unidad</span>
            <span class="op-confirm-value">${esc(v?.economic_number || "—")}</span>
          </div>
          <div class="op-confirm-row">
            <span class="op-confirm-label">Origen</span>
            <span class="op-confirm-value">${esc(wz.origin)}</span>
          </div>
          <div class="op-confirm-row">
            <span class="op-confirm-label">Destino</span>
            <span class="op-confirm-value">${esc(wz.destination)}</span>
          </div>
          <div class="op-confirm-row">
            <span class="op-confirm-label">Presupuesto</span>
            <span class="op-confirm-value">${fmtMXN(wz.budget)}</span>
          </div>
        </div>
        <div class="form-msg" id="wz-msg"></div>
        <button class="op-btn-primary" id="wz-submit">🚗 Iniciar Viaje</button>`
      );
      document.getElementById("wz-back").onclick = showBudget;
      document.getElementById("wz-submit").onclick = async () => {
        const msg = document.getElementById("wz-msg");
        msg.textContent = "Guardando…"; msg.className = "form-msg";
        try {
          await callFn("fleet-create-trip", {
            method: "POST",
            body: {
              company_id: state.companyId,
              vehicle_id: wz.vehicle_id,
              driver_id: driver.id,
              origin: wz.origin,
              destination: wz.destination,
              budget_amount: wz.budget
            }
          });
          location.hash = "#/operador";
        } catch (e) { msg.textContent = e.message; msg.className = "form-msg error"; }
      };
    }

    showVehicle();
  }

  // ═══════════════════════════════════════════════════════════
  //  GASTO
  // ═══════════════════════════════════════════════════════════
  async function renderGasto() {
    setOpMode();
    const el = $el();
    el.innerHTML = `<div class="op-screen"><div class="op-wizard-body" style="color:var(--gris-texto)">Cargando…</div>${tabs("#/operador/gasto")}</div>`;

    await loadCompanyData();
    const driver = await myDriver();

    if (!driver) {
      el.innerHTML = blockScreen(
        "No estás dado de alta como operador activo.",
        "#/operador", "#/operador/gasto"
      );
      return;
    }

    const trip = await openTrip(driver.id);
    if (!trip) {
      el.innerHTML = `
        <div class="op-screen">
          <div class="op-wizard-header">
            <a href="#/operador" class="op-back-btn">←</a>
            <span class="op-wizard-title">Reportar Gasto</span>
          </div>
          <div class="op-wizard-body">
            <div class="op-alert-box">No tienes un viaje activo. Primero crea un viaje.</div>
            <button class="op-btn-primary" onclick="location.hash='#/operador/viaje'">🚗 Crear Viaje</button>
          </div>
          ${tabs("#/operador/gasto")}
        </div>`;
      return;
    }

    const TOTAL = 4;
    const wz = { receiptUrl: null, category: null, amount: null };

    function wzScreen(stepN, title, body) {
      const pct = Math.round((stepN / (TOTAL - 1)) * 100);
      return `
        <div class="op-screen">
          ${wzHdr(title, stepN, TOTAL)}
          <div class="op-wizard-body">${body}</div>
          ${tabs("#/operador/gasto")}
        </div>`;
    }

    function showPhoto() {
      el.innerHTML = wzScreen(0, "Foto del ticket",
        `<div class="op-camera-area" id="cam-tap">
          <div id="cam-ph">
            <span class="op-camera-icon">📷</span>
            <span class="op-camera-label">Toca para fotografiar el ticket</span>
            <span class="op-camera-sub">Foto obligatoria como comprobante</span>
          </div>
          <img id="cam-img" class="op-camera-preview hidden" alt="">
        </div>
        <input type="file" id="cam-file" accept="image/*" capture="environment" class="hidden">
        <div id="scan-msg" style="min-height:24px;text-align:center;padding:8px;font-size:14px;color:var(--gris-texto)"></div>`
      );
      document.getElementById("wz-back").onclick = () => { location.hash = "#/operador"; };
      const camFile = document.getElementById("cam-file");
      document.getElementById("cam-tap").onclick = () => camFile.click();

      camFile.onchange = async () => {
        const file = camFile.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          const img = document.getElementById("cam-img");
          img.src = ev.target.result; img.classList.remove("hidden");
          document.getElementById("cam-ph").classList.add("hidden");
          document.getElementById("cam-tap").classList.add("has-image");
        };
        reader.readAsDataURL(file);

        const scanMsg = document.getElementById("scan-msg");
        scanMsg.textContent = "⏳ Analizando ticket con IA…";
        try {
          const url = await uploadToBucket("receipts", file);
          wz.receiptUrl = url;
          const ocr = await callFn("fleet-scan-receipt", { method: "POST", body: { receipt_url: url } });
          if (ocr?.is_receipt) {
            if (ocr.category) wz.category = ocr.category;
            if (ocr.amount)   wz.amount   = ocr.amount;
            scanMsg.textContent = `✅ Detectado: ${ocr.category || "—"} · ${fmtMXN(ocr.amount || 0)}`;
          } else {
            scanMsg.textContent = "📷 Foto guardada. Completa los datos.";
          }
          setTimeout(showCategory, 1000);
        } catch (e) {
          scanMsg.textContent = `Error al guardar foto: ${e.message}`;
        }
      };
    }

    function showCategory() {
      el.innerHTML = wzScreen(1, "¿Qué tipo de gasto?",
        `<div class="op-category-grid">${CATEGORIES.map((c) =>
          `<button class="op-category-btn${wz.category === c.key ? " selected" : ""}" data-cat="${c.key}">
            <span class="op-category-emoji">${c.icon}</span>
            <span class="op-category-label">${c.label}</span>
          </button>`).join("")}</div>`
      );
      document.getElementById("wz-back").onclick = showPhoto;
      el.querySelectorAll("[data-cat]").forEach((btn) => {
        btn.onclick = () => { wz.category = btn.dataset.cat; showAmount(); };
      });
    }

    function showAmount() {
      const PRESETS = [100, 200, 500, 1000, 1500, 2000];
      el.innerHTML = wzScreen(2, "¿Cuánto pagaste?",
        `<div class="op-amount-grid">${PRESETS.map((p) =>
          `<button class="op-amount-btn${wz.amount === p ? " selected" : ""}" data-p="${p}">
            ${fmtMXN(p)}</button>`).join("")}
        </div>
        <div class="op-city-input-row" style="margin-top:12px">
          <input id="amt-inp" class="op-city-input" type="number" inputmode="decimal"
                 placeholder="Otro monto" value="${wz.amount || ""}">
          <button class="op-voice-btn" id="voice-amt-inp">🎤</button>
        </div>
        <button class="op-btn-primary" id="next-amt-inp" style="margin-top:16px">Continuar →</button>`
      );
      document.getElementById("wz-back").onclick = showCategory;
      el.querySelectorAll("[data-p]").forEach((btn) => {
        btn.onclick = () => {
          wz.amount = Number(btn.dataset.p);
          document.getElementById("amt-inp").value = wz.amount;
          el.querySelectorAll(".op-amount-btn").forEach((b) => b.classList.toggle("selected", b === btn));
        };
      });
      document.getElementById("voice-amt-inp").onclick = () =>
        dictate("Di el monto del gasto", (t) => {
          const n = parseFloat(t.replace(/[^0-9.]/g, ""));
          if (!isNaN(n)) { wz.amount = n; document.getElementById("amt-inp").value = n; }
        });
      document.getElementById("next-amt-inp").onclick = () => {
        const n = parseFloat(document.getElementById("amt-inp").value);
        if (isNaN(n) || n <= 0) { alert("Ingresa el monto"); return; }
        wz.amount = n; showConfirm();
      };
    }

    function showConfirm() {
      const catLabel = CATEGORIES.find((c) => c.key === wz.category)?.label || wz.category;
      el.innerHTML = wzScreen(3, "Confirmar gasto",
        `<div class="op-confirm-card">
          <div class="op-confirm-row">
            <span class="op-confirm-label">Viaje</span>
            <span class="op-confirm-value">${esc(trip.origin)} → ${esc(trip.destination)}</span>
          </div>
          <div class="op-confirm-row">
            <span class="op-confirm-label">Categoría</span>
            <span class="op-confirm-value">${esc(catLabel)}</span>
          </div>
          <div class="op-confirm-row">
            <span class="op-confirm-label">Monto</span>
            <span class="op-confirm-value">${fmtMXN(wz.amount)}</span>
          </div>
          <div class="op-confirm-row">
            <span class="op-confirm-label">Foto</span>
            <span class="op-confirm-value">${wz.receiptUrl ? "✅ Adjunta" : "❌ Sin foto"}</span>
          </div>
        </div>
        <div class="form-msg" id="wz-msg"></div>
        <button class="op-btn-primary" id="wz-submit">💵 Registrar Gasto</button>`
      );
      document.getElementById("wz-back").onclick = showAmount;
      document.getElementById("wz-submit").onclick = async () => {
        const msg = document.getElementById("wz-msg");
        if (!wz.receiptUrl) {
          msg.textContent = "Se requiere foto del comprobante."; msg.className = "form-msg error"; return;
        }
        msg.textContent = "Guardando…"; msg.className = "form-msg";
        try {
          await callFn("fleet-submit-expense", {
            method: "POST",
            body: {
              trip_id: trip.id,
              category: wz.category,
              amount: wz.amount,
              receipt_url: wz.receiptUrl,
              expense_date: new Date().toISOString().slice(0, 10)
            }
          });
          location.hash = "#/operador";
        } catch (e) { msg.textContent = e.message; msg.className = "form-msg error"; }
      };
    }

    showPhoto();
  }

  // ═══════════════════════════════════════════════════════════
  //  INSPECCIÓN
  // ═══════════════════════════════════════════════════════════
  async function renderInspeccion() {
    setOpMode();
    const el = $el();
    el.innerHTML = `<div class="op-screen"><div class="op-wizard-body" style="color:var(--gris-texto)">Cargando…</div>${tabs("#/operador/inspeccion")}</div>`;

    await loadCompanyData();
    const driver = await myDriver();

    if (!driver) {
      el.innerHTML = blockScreen(
        "No estás dado de alta como operador activo.",
        "#/operador", "#/operador/inspeccion"
      );
      return;
    }

    const actives = state.vehicles.filter((v) => v.status === "activa");
    if (!actives.length) {
      el.innerHTML = blockScreen(
        "No hay unidades activas registradas. Pide a tu despachador que registre la unidad en <strong>Flota</strong>.",
        "#/operador", "#/operador/inspeccion"
      );
      return;
    }

    // vehicle(1) + odometer(1) + checklist(10) + photos(1) + confirm(1) = 14
    const TOTAL = 14;
    const wz = { vehicle_id: null, odometer_km: null, checklist: {}, photos: {}, gps: null };
    getGPS().then((g) => { wz.gps = g; }); // grab GPS in background

    function wzScreen(stepN, title, body) {
      const pct = Math.round((stepN / (TOTAL - 1)) * 100);
      return `
        <div class="op-screen">
          ${wzHdr(title, stepN, TOTAL)}
          <div class="op-wizard-body">${body}</div>
          ${tabs("#/operador/inspeccion")}
        </div>`;
    }

    function showVehicle() {
      el.innerHTML = wzScreen(0, "¿Qué unidad?",
        `<div class="op-selector-list">${actives.map((v) =>
          `<button class="op-selector-item" data-vid="${v.id}">
            <div class="op-selector-text">
              <div>${esc(v.economic_number)}</div>
              <div class="op-selector-sub">Placa: ${esc(v.plate)}</div>
            </div>
            <span class="op-selector-arrow">›</span>
          </button>`).join("")}</div>`
      );
      document.getElementById("wz-back").onclick = () => { location.hash = "#/operador"; };
      el.querySelectorAll("[data-vid]").forEach((btn) => {
        btn.onclick = () => { wz.vehicle_id = btn.dataset.vid; showOdo(); };
      });
    }

    function showOdo() {
      el.innerHTML = wzScreen(1, "Odómetro",
        `<div class="op-camera-area" id="odo-tap">
          <div id="odo-ph">
            <span class="op-camera-icon">🔢</span>
            <span class="op-camera-label">Fotografia el odómetro (opcional)</span>
          </div>
          <img id="odo-img" class="op-camera-preview hidden" alt="">
        </div>
        <input type="file" id="odo-file" accept="image/*" capture="environment" class="hidden">
        <div class="op-city-input-row" style="margin-top:16px">
          <input id="odo-km" class="op-city-input" type="number" inputmode="numeric"
                 placeholder="Kilómetros" value="${wz.odometer_km || ""}">
          <button class="op-voice-btn" id="voice-odo-km">🎤</button>
        </div>
        <button class="op-btn-primary" id="next-odo-km" style="margin-top:16px">Continuar →</button>`
      );
      document.getElementById("wz-back").onclick = showVehicle;
      const odoFile = document.getElementById("odo-file");
      document.getElementById("odo-tap").onclick = () => odoFile.click();
      odoFile.onchange = async () => {
        const file = odoFile.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          const img = document.getElementById("odo-img");
          img.src = ev.target.result; img.classList.remove("hidden");
          document.getElementById("odo-ph").classList.add("hidden");
          document.getElementById("odo-tap").classList.add("has-image");
        };
        reader.readAsDataURL(file);
        try {
          const url = await uploadToBucket("inspections", file);
          wz.photos.odometro = url;
        } catch (e) { console.error("Odo photo upload:", e); }
      };
      document.getElementById("voice-odo-km").onclick = () =>
        dictate("Di los kilómetros del odómetro", (t) => {
          const n = parseInt(t.replace(/[^0-9]/g, ""), 10);
          if (!isNaN(n)) { wz.odometer_km = n; document.getElementById("odo-km").value = n; }
        });
      document.getElementById("next-odo-km").onclick = () => {
        const n = parseInt(document.getElementById("odo-km").value, 10);
        if (isNaN(n) || n < 0) { alert("Ingresa el odómetro"); return; }
        wz.odometer_km = n; showChecklist(0);
      };
    }

    function showChecklist(idx) {
      const item = CHECKLIST[idx];
      const cur  = wz.checklist[item.key] || {};
      el.innerHTML = wzScreen(2 + idx, item.label,
        `<div class="op-check-item">
          <div class="op-check-emoji">${item.icon}</div>
          <div class="op-check-name">${item.label.toUpperCase()}</div>
          <div class="op-check-btns">
            <button class="op-check-ok${cur.ok === true ? " selected" : ""}" id="chk-ok">✅ Bien</button>
            <button class="op-check-fail${cur.ok === false ? " selected" : ""}" id="chk-fail">❌ Falla</button>
          </div>
          <div id="notes-area" class="${cur.ok === false ? "" : "hidden"}" style="margin-top:16px">
            <textarea class="op-input" id="chk-notes" placeholder="Describe la falla (opcional)" rows="3">${esc(cur.notes || "")}</textarea>
          </div>
        </div>
        <button class="op-btn-primary" id="next-chk" style="margin-top:12px">Continuar →</button>`
      );
      document.getElementById("wz-back").onclick = () => {
        idx === 0 ? showOdo() : showChecklist(idx - 1);
      };
      document.getElementById("chk-ok").onclick = () => {
        wz.checklist[item.key] = { ok: true, notes: "" };
        document.getElementById("chk-ok").classList.add("selected");
        document.getElementById("chk-fail").classList.remove("selected");
        document.getElementById("notes-area").classList.add("hidden");
      };
      document.getElementById("chk-fail").onclick = () => {
        wz.checklist[item.key] = { ok: false, notes: wz.checklist[item.key]?.notes || "" };
        document.getElementById("chk-fail").classList.add("selected");
        document.getElementById("chk-ok").classList.remove("selected");
        document.getElementById("notes-area").classList.remove("hidden");
      };
      document.getElementById("next-chk").onclick = () => {
        if (wz.checklist[item.key] === undefined) { alert("Selecciona si está bien o falla"); return; }
        const notes = document.getElementById("chk-notes")?.value?.trim();
        if (notes && wz.checklist[item.key].ok === false) wz.checklist[item.key].notes = notes;
        idx < CHECKLIST.length - 1 ? showChecklist(idx + 1) : showPhotos();
      };
    }

    function showPhotos() {
      el.innerHTML = wzScreen(12, "Fotos de la unidad",
        `<p style="color:var(--gris-texto);font-size:14px;margin:0 0 16px">
           Toca cada cuadro para tomar la foto obligatoria.
         </p>
        <div class="op-photo-grid">${PHOTO_TYPES.map((pt) =>
          `<div class="op-photo-slot">
            <div class="op-photo-tap" id="ptap-${pt.key}">
              ${wz.photos[pt.key]
                ? `<img src="${esc(wz.photos[pt.key])}" class="op-photo-thumb" alt="">
                   <span class="op-photo-ok">✅</span>`
                : `<span class="op-photo-icon">${pt.icon}</span>`
              }
            </div>
            <div class="op-photo-label">${pt.label}</div>
            <input type="file" id="pf-${pt.key}" accept="image/*" capture="environment" class="hidden">
          </div>`).join("")}
        </div>
        <div class="form-msg" id="photo-msg"></div>
        <button class="op-btn-primary" id="next-photos" style="margin-top:16px">Continuar →</button>`
      );
      document.getElementById("wz-back").onclick = () => showChecklist(CHECKLIST.length - 1);
      PHOTO_TYPES.forEach((pt) => {
        document.getElementById(`ptap-${pt.key}`).onclick = () =>
          document.getElementById(`pf-${pt.key}`).click();
        document.getElementById(`pf-${pt.key}`).onchange = async (e) => {
          const file = e.target.files[0];
          if (!file) return;
          const msg = document.getElementById("photo-msg");
          msg.textContent = `Subiendo ${pt.label}…`; msg.className = "form-msg";
          try {
            const url = await uploadToBucket("inspections", file);
            wz.photos[pt.key] = url;
            const tap = document.getElementById(`ptap-${pt.key}`);
            tap.innerHTML = `<img src="${esc(url)}" class="op-photo-thumb" alt=""><span class="op-photo-ok">✅</span>`;
            msg.textContent = `${pt.label} lista ✅`; msg.className = "form-msg";
          } catch (err) {
            msg.textContent = err.message; msg.className = "form-msg error";
          }
        };
      });
      document.getElementById("next-photos").onclick = () => {
        const missing = PHOTO_TYPES.filter((pt) => !wz.photos[pt.key]).map((pt) => pt.label);
        if (missing.length) {
          const msg = document.getElementById("photo-msg");
          msg.textContent = `Faltan fotos: ${missing.join(", ")}`; msg.className = "form-msg error";
          return;
        }
        showConfirm();
      };
    }

    function showConfirm() {
      const vehicle = actives.find((v) => v.id === wz.vehicle_id);
      const fails   = CHECKLIST.filter((c) => wz.checklist[c.key]?.ok === false);
      el.innerHTML = wzScreen(13, "Confirmar inspección",
        `<div class="op-confirm-card">
          <div class="op-confirm-row">
            <span class="op-confirm-label">Unidad</span>
            <span class="op-confirm-value">${esc(vehicle?.economic_number || "—")}</span>
          </div>
          <div class="op-confirm-row">
            <span class="op-confirm-label">Odómetro</span>
            <span class="op-confirm-value">${Number(wz.odometer_km).toLocaleString("es-MX")} km</span>
          </div>
          <div class="op-confirm-row">
            <span class="op-confirm-label">Fotos</span>
            <span class="op-confirm-value">${Object.keys(wz.photos).length}/5 ✅</span>
          </div>
          <div class="op-confirm-row" style="${fails.length ? "color:var(--rojo)" : ""}">
            <span class="op-confirm-label">Fallas</span>
            <span class="op-confirm-value">
              ${fails.length ? fails.map((f) => f.label).join(", ") : "Ninguna ✅"}
            </span>
          </div>
        </div>
        <div class="form-msg" id="wz-msg"></div>
        <button class="op-btn-primary" id="wz-submit">🔍 Enviar Inspección</button>`
      );
      document.getElementById("wz-back").onclick = showPhotos;
      document.getElementById("wz-submit").onclick = async () => {
        const msg = document.getElementById("wz-msg");
        msg.textContent = "Enviando…"; msg.className = "form-msg";
        try {
          const photos = Object.entries(wz.photos).map(([photo_type, url]) => ({
            photo_type, url,
            ...(wz.gps ? { gps_lat: wz.gps.lat, gps_lng: wz.gps.lng } : {})
          }));
          const checklist = CHECKLIST.map((c) => ({
            item_key: c.key,
            ok: wz.checklist[c.key]?.ok ?? true,
            ...(wz.checklist[c.key]?.notes ? { notes: wz.checklist[c.key].notes } : {})
          }));
          await callFn("fleet-submit-inspection", {
            method: "POST",
            body: {
              company_id: state.companyId,
              vehicle_id: wz.vehicle_id,
              driver_id: driver.id,
              odometer_km: wz.odometer_km,
              ...(wz.gps ? { gps_lat: wz.gps.lat, gps_lng: wz.gps.lng } : {}),
              photos,
              checklist
            }
          });
          location.hash = "#/operador";
        } catch (e) { msg.textContent = e.message; msg.className = "form-msg error"; }
      };
    }

    showVehicle();
  }

  // ═══════════════════════════════════════════════════════════
  //  ESTADO (semáforo de documentos)
  // ═══════════════════════════════════════════════════════════
  async function renderEstado() {
    setOpMode();
    const el = $el();
    el.innerHTML = `<div class="op-screen"><div class="op-wizard-body" style="color:var(--gris-texto)">Cargando…</div>${tabs("#/operador/estado")}</div>`;

    await loadCompanyData();
    const driver = await myDriver();
    const docs = state.complianceDocs.filter((d) =>
      !d.driver_id || (driver && d.driver_id === driver.id)
    );
    const dot = (s) => ({ verde: "🟢", amarillo: "🟡", rojo: "🔴" }[s] || "⚫");

    el.innerHTML = `
      <div class="op-screen">
        <div class="op-wizard-header">
          <a href="#/operador" class="op-back-btn">←</a>
          <span class="op-wizard-title">Mis Documentos</span>
        </div>
        <div class="op-wizard-body">
          ${docs.length === 0
            ? `<div class="op-empty">
                 <div class="op-empty-icon">📄</div>
                 <div class="op-empty-title">Sin documentos registrados</div>
                 <div>Tu despachador puede subirlos en Flota → Documentos.</div>
               </div>`
            : `<div class="op-doc-list">${docs.map((d) => `
                <div class="op-doc-row">
                  <span>${dot(d.semaforo)}</span>
                  <div style="flex:1">
                    <div class="op-doc-name">${esc((d.doc_type || "").replace(/_/g, " "))}</div>
                    <div class="op-doc-date">Vence: ${esc(d.expires_at)} · ${d.days_to_expire} días</div>
                  </div>
                </div>`).join("")}</div>`
          }
        </div>
        ${tabs("#/operador/estado")}
      </div>`;
  }

  // ═══════════════════════════════════════════════════════════
  //  CURSOS
  // ═══════════════════════════════════════════════════════════
  async function renderCursos() {
    setOpMode();
    const el = $el();

    // COURSES es el global de courses-data.js
    const allCourses = window.COURSES || [];
    const progress   = state.progress || [];
    const certs      = state.certificates || [];

    if (!allCourses.length) {
      el.innerHTML = blockScreen("No hay cursos disponibles.", "#/operador", "#/operador");
      return;
    }

    const courseItems = allCourses.map((c) => {
      const done  = progress.filter((p) => p.course_id === c.id).length;
      const total = (c.lessons || []).length;
      const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
      const cert  = certs.find((x) => x.course_id === c.id);
      const sub   = cert ? "✅ Certificado obtenido"
                  : pct > 0  ? `${pct}% completado (${done}/${total} lecciones)`
                  : "Sin comenzar";
      return `
        <button class="op-selector-item" data-href="#/curso/${esc(c.id)}">
          <div class="op-selector-text">
            <div>${esc(c.title)}</div>
            <div class="op-selector-sub">${sub}</div>
          </div>
          ${cert
            ? `<span style="font-size:22px">🎓</span>`
            : `<span class="op-selector-arrow">›</span>`}
        </button>`;
    }).join("");

    el.innerHTML = `
      <div class="op-screen">
        <div class="op-wizard-header">
          <a href="#/operador" class="op-back-btn">←</a>
          <span class="op-wizard-title">Mis Cursos</span>
        </div>
        <div class="op-wizard-body">
          <div class="op-selector-list">${courseItems}</div>
          <p style="text-align:center;margin-top:16px">
            <a href="#/certificados" style="color:var(--verde);font-weight:600">
              Ver mis certificados →
            </a>
          </p>
        </div>
        ${tabs("#/operador")}
      </div>`;

    el.querySelectorAll("[data-href]").forEach((btn) => {
      btn.onclick = () => { location.hash = btn.dataset.href; };
    });
  }

  // ═══════════════════════════════════════════════════════════
  //  PERFIL (driver)
  // ═══════════════════════════════════════════════════════════
  async function renderPerfilOperador() {
    setOpMode();
    const el = $el();
    el.innerHTML = `<div class="op-screen"><div class="op-wizard-body" style="color:var(--gris-texto)">Cargando…</div>${tabs("#/operador")}</div>`;

    await loadCompanyData();
    const driver  = await myDriver();
    const profile = state.profile;

    const daysUntilDate = (d) => d ? Math.ceil((new Date(d) - new Date()) / 86400000) : null;
    const fmtDay = (d) => d ? new Date(d).toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" }) : "—";
    function daysTag(days) {
      if (days === null) return `<span style="color:var(--gris-texto)">Sin registrar</span>`;
      if (days < 0)     return `<span style="color:var(--rojo)">Vencida hace ${Math.abs(days)} días</span>`;
      if (days <= 30)   return `<span style="color:var(--ambar)">${days} días restantes</span>`;
      return `<span style="color:var(--verde)">${days} días restantes</span>`;
    }

    const licDays = daysUntilDate(profile?.licencia_vigencia);
    const medDays = daysUntilDate(profile?.examen_medico_vigencia);

    const myTrips = driver
      ? (state.trips || []).filter((t) => t.driver_id === driver.id).slice(0, 5)
      : [];
    const certs = state.certificates || [];

    el.innerHTML = `
      <div class="op-screen">
        <div class="op-wizard-header">
          <a href="#/operador" class="op-back-btn">←</a>
          <span class="op-wizard-title">Mi Perfil</span>
        </div>
        <div class="op-wizard-body">
          ${driver ? `
            <div class="op-confirm-card">
              <div class="op-confirm-row">
                <span class="op-confirm-label">Nombre</span>
                <span class="op-confirm-value">${esc(driver.full_name)}</span>
              </div>
              <div class="op-confirm-row">
                <span class="op-confirm-label">Empresa</span>
                <span class="op-confirm-value">${esc(state.company?.name || "—")}</span>
              </div>
              <div class="op-confirm-row">
                <span class="op-confirm-label">Estado</span>
                <span class="op-confirm-value" style="color:var(--verde)">✅ Operador activo</span>
              </div>
              <div class="op-confirm-row">
                <span class="op-confirm-label">Licencia federal</span>
                <span class="op-confirm-value">${daysTag(licDays)}</span>
              </div>
              <div class="op-confirm-row">
                <span class="op-confirm-label">Examen psicofísico</span>
                <span class="op-confirm-value">${daysTag(medDays)}</span>
              </div>
              <div class="op-confirm-row">
                <span class="op-confirm-label">Certificados</span>
                <span class="op-confirm-value">${certs.length} obtenidos</span>
              </div>
            </div>` : `
            <div class="op-alert-box">
              ⚠️ No estás dado de alta como operador activo en ninguna empresa.<br>
              Pide a tu despachador que te registre en <strong>Flota → Operadores</strong>.
            </div>`}

          ${myTrips.length ? `
            <div style="margin-top:20px">
              <div style="font-family:var(--font-display);font-weight:700;text-transform:uppercase;font-size:13px;letter-spacing:.06em;color:var(--gris-texto);margin-bottom:10px">
                Últimos viajes
              </div>
              ${myTrips.map((t) => `
                <div style="background:var(--niebla);border-radius:12px;padding:12px 14px;margin-bottom:8px">
                  <div style="font-weight:600;font-size:15px">${esc(t.origin)} → ${esc(t.destination)}</div>
                  <div style="font-size:12px;color:var(--gris-texto);margin-top:2px">
                    ${esc((t.started_at || "").slice(0, 10))} ·
                    <span style="color:${t.status === "abierto" ? "var(--verde)" : "inherit"}">${esc(t.status)}</span>
                    ${t.budget_amount ? ` · Presupuesto: ${fmtMXN(t.budget_amount)}` : ""}
                  </div>
                </div>`).join("")}
            </div>` : ""}

          <div style="margin-top:20px;display:flex;flex-direction:column;gap:10px">
            <button class="op-btn-primary" onclick="location.hash='#/operador/estado'">
              📄 Mis documentos de cumplimiento
            </button>
            <button class="op-btn-primary" onclick="location.hash='#/operador/cursos'"
                    style="background:var(--asfalto)">
              📚 Mis cursos y certificados
            </button>
            <button class="op-btn-primary" onclick="location.hash='#/perfil'"
                    style="background:var(--gris-texto)">
              ⚙️ Editar mi perfil completo
            </button>
          </div>
        </div>
        ${tabs("#/operador")}
      </div>`;
  }

  // ── API pública para panel.js ────────────────────────────────
  window.OperadorUI = {
    renderHome,
    renderViaje,
    renderGasto,
    renderInspeccion,
    renderEstado,
    renderCursos,
    renderPerfil: renderPerfilOperador,
    clearOpMode
  };
})();
