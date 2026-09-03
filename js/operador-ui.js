// ============================================================
// operador-ui.js — La app del camionero (móvil, en campo).
//
// Para quién: el chofer, el hombre-camión y el pequeño flotero.
// Qué resuelve, en su idioma:
//   · Mi viaje      — abro, gasto, cierro. Con flete y kilómetros.
//   · Mis cuentas   — ¿cuánto me quedó? (flete − gastos), $/km, km/L.
//   · Mis papeles   — licencia, examen, tarjeta, seguro: semáforo.
//   · Mi camión     — km actual, próximo aceite/llantas/frenos.
//   · Me deben      — fletes por cobrar.
//   · Auxilio       — teléfonos de carretera y qué hacer en un percance.
//   · Mis cursos    — certificación con folio verificable.
//
// Regla de diseño: botones grandes, pocas palabras, nada obligatorio
// que no sea indispensable. La foto del ticket se pide, no se exige.
//
// Depende de: state, callFn, uploadToBucket, loadCompanyData,
// loadMemberships, sb, esc, isSubscribed, hasAccess, startCheckout,
// CONFIG (globals de panel.js que se carga antes).
// ============================================================

(function () {
  // ── Catálogos ────────────────────────────────────────────────
  const CATEGORIES = [
    { key: "diesel",    label: "Diésel",     icon: "⛽" },
    { key: "caseta",    label: "Casetas",    icon: "🛣️" },
    { key: "comida",    label: "Comida",     icon: "🍽️" },
    { key: "hospedaje", label: "Hotel",      icon: "🛏️" },
    { key: "maniobras", label: "Maniobras",  icon: "🏗️" },
    { key: "taller",    label: "Taller",     icon: "🔧" },
    { key: "otro",      label: "Otro",       icon: "📦" }
  ];
  const catOf = (key) => CATEGORIES.find((c) => c.key === key) || { label: key, icon: "📦" };

  const CHECKLIST = [
    { key: "frenos",           label: "Frenos",             icon: "🛑" },
    { key: "luces",            label: "Luces",              icon: "💡" },
    { key: "llantas_desgaste", label: "Llantas",            icon: "🛞" },
    { key: "niveles_fluidos",  label: "Niveles de fluidos", icon: "🫧" },
    { key: "fugas",            label: "Sin fugas",          icon: "💧" },
    { key: "espejos",          label: "Espejos",            icon: "🪞" },
    { key: "claxon",           label: "Claxon",             icon: "📯" },
    { key: "extintor",         label: "Extintor",           icon: "🧯" },
    { key: "triangulos",       label: "Triángulos",         icon: "⚠️" },
    { key: "cinturon",         label: "Cinturón",           icon: "🪢" }
  ];

  const PHOTO_TYPES = [
    { key: "frente",       label: "Frente",        icon: "🚛" },
    { key: "llantas",      label: "Llantas",       icon: "🛞" },
    { key: "motor",        label: "Motor",         icon: "⚙️" },
    { key: "caja_trasera", label: "Parte trasera", icon: "📦" },
    { key: "odometro",     label: "Odómetro",      icon: "🔢" }
  ];

  const DOC_LABELS = {
    licencia_federal: "Licencia federal",
    poliza_seguro: "Póliza de seguro",
    tarjeta_circulacion: "Tarjeta de circulación",
    verificacion: "Verificación",
    permiso_sct: "Permiso SCT",
    carta_porte_config: "Carta Porte",
    otro: "Documento"
  };

  const MAINT_KINDS = [
    { key: "aceite",       label: "Cambio de aceite", icon: "🛢️", every_km: 10000 },
    { key: "filtros",      label: "Filtros",          icon: "🧰", every_km: 20000 },
    { key: "frenos",       label: "Frenos",           icon: "🛑", every_km: 40000 },
    { key: "llantas",      label: "Llantas",          icon: "🛞", every_km: 60000 },
    { key: "verificacion", label: "Verificación",     icon: "📋", every_km: null },
    { key: "otro",         label: "Otro",             icon: "🔧", every_km: null }
  ];
  const kindOf = (key) => MAINT_KINDS.find((k) => k.key === key) || MAINT_KINDS[5];

  const HELP_NUMBERS = [
    { tel: "911", label: "Emergencias",        sub: "Accidente, médico, incendio", icon: "🚨" },
    { tel: "078", label: "Ángeles Verdes",     sub: "Auxilio mecánico en carretera", icon: "🛠️" },
    { tel: "088", label: "Guardia Nacional",   sub: "Denuncia, asalto, carretera", icon: "🛡️" },
    { tel: "074", label: "CAPUFE",             sub: "Autopistas de cuota", icon: "🛣️" }
  ];

  // ── Utilidades ───────────────────────────────────────────────
  const $el = () => document.getElementById("app");
  const fmtMXN = (n) =>
    `$${Number(n || 0).toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  const fmtKm = (n) => n == null ? "—" : `${Number(n).toLocaleString("es-MX")} km`;
  const fmtDay = (d) => d ? new Date(d.length === 10 ? `${d}T12:00:00` : d).toLocaleDateString("es-MX", { day: "numeric", month: "short" }) : "—";
  const today = () => new Date().toISOString().slice(0, 10);
  const daysUntilDate = (d) => d ? Math.ceil((new Date(`${d}T00:00:00`) - new Date()) / 86400000) : null;
  const num = (v) => { const n = parseFloat(String(v ?? "").replace(/[^0-9.]/g, "")); return isNaN(n) ? null : n; };

  const access = () => (typeof hasAccess === "function" ? hasAccess() : isSubscribed());
  const myRole = () => (state.companies.find((c) => c.id === state.companyId) || {}).role || null;
  const isBoss = () => ["owner", "admin"].includes(myRole());

  function setOpMode()   { document.body.classList.add("op-mode"); }
  function clearOpMode() { document.body.classList.remove("op-mode"); }

  function whatsapp(text) {
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  // ── Tabs inferiores ──────────────────────────────────────────
  function tabs(active) {
    const TABS = [
      ["#/operador",         "🏠", "Inicio"],
      ["#/operador/viaje",   "🚛", "Viaje"],
      ["#/operador/gasto",   "💵", "Gasto"],
      ["#/operador/cuentas", "📊", "Cuentas"],
      ["#/operador/mas",     "☰",  "Más"]
    ];
    return `<nav class="op-tabs">${TABS.map(([href, icon, label]) =>
      `<a href="${href}" class="op-tab${active === href ? " active" : ""}">
        <span class="op-tab-icon">${icon}</span><span class="op-tab-label">${label}</span>
      </a>`).join("")}</nav>`;
  }

  function hdr(title, backHref, right) {
    return `
      <div class="op-wizard-header">
        <a href="${backHref || "#/operador"}" class="op-back-btn">←</a>
        <span class="op-wizard-title">${title}</span>
        ${right || ""}
      </div>`;
  }

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

  function screen(header, body, tabActive) {
    return `<div class="op-screen">${header}<div class="op-wizard-body">${body}</div>${tabs(tabActive)}</div>`;
  }

  function loading(tabActive) {
    $el().innerHTML = `<div class="op-screen"><div class="op-wizard-body" style="color:var(--gris-texto)">Cargando…</div>${tabs(tabActive)}</div>`;
  }

  function blockScreen(msg, backHref, tabActive, extra) {
    return screen(hdr("Aviso", backHref), `<div class="op-alert-box">${msg}</div>${extra || ""}`, tabActive);
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

  // ── Datos del operador actual ────────────────────────────────
  async function myDriver() {
    if (!state.session || !state.companyId) return null;
    const { data } = await sb.from("drivers")
      .select("id, full_name, phone, status, license_expiry")
      .eq("company_id", state.companyId)
      .eq("user_id", state.session.user.id)
      .maybeSingle();
    return data?.status === "activo" ? data : null;
  }

  // Viajes que "son míos": los del chofer; el dueño ve los de toda su empresa.
  function myTrips(driver) {
    const all = state.trips || [];
    if (isBoss()) return all;
    return driver ? all.filter((t) => t.driver_id === driver.id) : [];
  }

  function openTripOf(driver) {
    const mine = myTrips(driver).filter((t) => t.status === "abierto");
    if (!isBoss()) return mine[0] || null;
    // El dueño que también maneja: primero su propio viaje abierto.
    return (driver && mine.find((t) => t.driver_id === driver.id)) || mine[0] || null;
  }

  async function tripExpenses(tripId) {
    const { data } = await sb.from("expenses")
      .select("id, category, amount, liters, odometer_km, receipt_url, expense_date, created_at")
      .eq("trip_id", tripId)
      .order("created_at", { ascending: false });
    return data || [];
  }

  async function expensesForTrips(tripIds) {
    if (!tripIds.length) return [];
    const { data } = await sb.from("expenses")
      .select("trip_id, category, amount, liters, expense_date")
      .in("trip_id", tripIds.slice(0, 200));
    return data || [];
  }

  const vehicleOf = (id) => state.vehicles.find((v) => v.id === id);
  const vehicleLabel = (id) => { const v = vehicleOf(id); return v ? `${v.economic_number} · ${v.plate}` : "—"; };

  // ── Cuentas claras (mismas fórmulas que domain/trips.js) ─────
  const round = (n, d = 2) => Number(Number(n || 0).toFixed(d));
  function periodSummary(trips) {
    const t = trips.reduce((a, x) => {
      a.freight += Number(x.freight_amount || 0);
      a.spent   += Number(x.spent_amount || 0);
      a.diesel  += Number(x.diesel_amount || 0);
      a.liters  += Number(x.diesel_liters || 0);
      if (x.distance_km != null && x.distance_km > 0) a.km += Number(x.distance_km);
      return a;
    }, { freight: 0, spent: 0, diesel: 0, liters: 0, km: 0 });
    return {
      trips: trips.length,
      freight: round(t.freight), spent: round(t.spent), profit: round(t.freight - t.spent),
      km: t.km,
      costPerKm: t.km > 0 ? round(t.spent / t.km) : null,
      kmPerLiter: t.km > 0 && t.liters > 0 ? round(t.km / t.liters, 1) : null
    };
  }
  function maintenanceStatus(item, currentKm) {
    let kmLeft = null;
    if (item.every_km && item.last_km != null && currentKm != null) kmLeft = item.last_km + item.every_km - currentKm;
    const daysLeft = item.due_date ? daysUntilDate(item.due_date) : null;
    if (kmLeft === null && daysLeft === null) return { status: "sin_dato", kmLeft, daysLeft };
    const ks = kmLeft === null ? "ok" : kmLeft < 0 ? "vencido" : kmLeft <= 1000 ? "pronto" : "ok";
    const ds = daysLeft === null ? "ok" : daysLeft < 0 ? "vencido" : daysLeft <= 15 ? "pronto" : "ok";
    const rank = { ok: 0, pronto: 1, vencido: 2 };
    return { status: rank[ks] >= rank[ds] ? ks : ds, kmLeft, daysLeft };
  }

  function startOfWeek() {
    const d = new Date(); const day = (d.getDay() + 6) % 7; // lunes = 0
    d.setDate(d.getDate() - day); d.setHours(0, 0, 0, 0); return d;
  }
  function startOfMonth() { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d; }
  function tripsSince(trips, since) {
    return trips.filter((t) => new Date(t.closed_at || t.started_at) >= since);
  }

  // ── Alertas (papeles + mantenimiento) para el inicio ─────────
  function alertItems(driver) {
    const out = [];
    const p = state.profile || {};
    const lic = daysUntilDate(p.licencia_vigencia);
    const med = daysUntilDate(p.examen_medico_vigencia);
    if (lic !== null && lic <= 30) out.push({ level: lic < 0 ? "rojo" : "amarillo", text: lic < 0 ? `Licencia federal vencida hace ${-lic} días` : `Licencia federal vence en ${lic} días`, href: "#/operador/papeles" });
    if (med !== null && med <= 30) out.push({ level: med < 0 ? "rojo" : "amarillo", text: med < 0 ? `Examen psicofísico vencido` : `Examen psicofísico vence en ${med} días`, href: "#/operador/papeles" });

    for (const d of (state.complianceDocs || [])) {
      if (d.driver_id && (!driver || d.driver_id !== driver.id) && !isBoss()) continue;
      if (d.semaforo === "vigente") continue;
      const name = d.doc_type === "otro" ? "Documento" : (DOC_LABELS[d.doc_type] || d.doc_type);
      out.push({ level: d.semaforo === "vencido" ? "rojo" : "amarillo", text: d.semaforo === "vencido" ? `${name} vencido` : `${name} vence en ${d.days_to_expire} días`, href: "#/operador/papeles" });
    }

    for (const m of (state.maintenance || [])) {
      const v = vehicleOf(m.vehicle_id);
      const s = maintenanceStatus(m, v?.odometer_km);
      if (s.status === "vencido") out.push({ level: "rojo", text: `${m.label}: ya toca (${v?.economic_number || "unidad"})`, href: "#/operador/camion" });
      else if (s.status === "pronto") out.push({ level: "amarillo", text: `${m.label} en ${s.kmLeft != null ? fmtKm(s.kmLeft) : `${s.daysLeft} días`}`, href: "#/operador/camion" });
    }
    return out.sort((a, b) => (a.level === "rojo" ? -1 : 1) - (b.level === "rojo" ? -1 : 1)).slice(0, 4);
  }

  function alertsHtml(driver) {
    const items = alertItems(driver);
    if (!items.length) return "";
    return `<div class="op-alerts">${items.map((a) =>
      `<a href="${a.href}" class="op-alert-row ${a.level}"><span class="op-alert-dot"></span>${esc(a.text)}<span class="op-selector-arrow">›</span></a>`).join("")}</div>`;
  }

  function accessBanner() {
    if (access()) return "";
    const boss = isBoss();
    return `
      <div class="op-plan-box">
        <div class="op-plan-title">${boss ? "Activa tu plan para usar la app" : "Tu patrón necesita activar su plan"}</div>
        <div class="op-plan-sub">${boss
          ? `Una sola suscripción cubre tu camión y a tus choferes. ${esc(CONFIG.PLANES.esencial.precio)}.`
          : "En cuanto tu patrón tenga plan activo, esta app te funciona sin pagar nada."}</div>
        ${boss ? `<button class="op-btn-primary" id="op-plan-btn" style="margin-top:12px">Activar plan · ${esc(CONFIG.PLANES.esencial.precio)}</button>` : ""}
      </div>`;
  }
  function wireAccessBanner() {
    const b = document.getElementById("op-plan-btn");
    if (b) b.onclick = () => startCheckout("esencial");
  }

  // ═══════════════════════════════════════════════════════════
  //  INICIO
  // ═══════════════════════════════════════════════════════════
  async function renderHome() {
    setOpMode();
    const el = $el();
    loading("#/operador");

    await loadCompanyData();
    const driver = await myDriver();
    const trip   = openTripOf(driver);
    const nombre = (driver?.full_name || state.profile?.full_name || "Camionero").split(" ")[0];

    // Sin registro de chofer y sin unidades: primera vez → ¿cómo trabajas?
    const firstTime = !driver && !state.vehicles.length;
    const onboarding = firstTime ? `
      <div class="op-onboard">
        <div class="op-onboard-title">¿Cómo trabajas?</div>
        <div class="op-onboard-sub">Elige una y listo. Se puede cambiar después.</div>
        <button class="op-big-choice" data-go="#/operador/alta">
          <span class="op-big-choice-icon">🚛</span>
          <span><b>Manejo mi propio camión</b><small>Hombre-camión. Registras tu unidad y arrancas.</small></span>
        </button>
        <button class="op-big-choice" data-go="#/operador/unirme">
          <span class="op-big-choice-icon">👷</span>
          <span><b>Soy chofer de un patrón</b><small>Entras con el código que te pasa tu jefe.</small></span>
        </button>
        <button class="op-big-choice" data-go="#/flota">
          <span class="op-big-choice-icon">🏢</span>
          <span><b>Tengo varios camiones y choferes</b><small>Registra tus unidades y comparte tu código a tus choferes.</small></span>
        </button>
      </div>` : "";

    const noDriverBoss = !driver && !firstTime && isBoss() ? `
      <div class="op-alert-box" style="margin:16px 16px 0">
        Administras <strong>${esc(state.company?.name || "tu empresa")}</strong>. Si tú también manejas,
        <a href="#/operador/alta">regístrate como chofer</a>. Para dar de alta choferes, comparte tu
        <a href="#/operador/codigo">código de patrón</a>.
      </div>` : "";

    let tripCard = "";
    if (trip) {
      const spent = Number(trip.spent_amount || 0);
      const freight = Number(trip.freight_amount || 0);
      const left = freight - spent;
      tripCard = `
        <div class="op-active-trip" data-go="#/operador/viaje">
          <div class="op-active-trip-badge">Viaje en curso · ${esc(vehicleLabel(trip.vehicle_id))}</div>
          <div class="op-active-trip-route">${esc(trip.origin)} → ${esc(trip.destination)}</div>
          <div class="op-trip-nums">
            <div><span>Flete</span><b>${freight ? fmtMXN(freight) : "—"}</b></div>
            <div><span>Gastado</span><b>${fmtMXN(spent)}</b></div>
            <div><span>Va quedando</span><b class="${freight && left < 0 ? "neg" : ""}">${freight ? fmtMXN(left) : "—"}</b></div>
          </div>
          <div style="display:flex;gap:8px;margin-top:12px">
            <button class="op-add-expense-btn" data-go="#/operador/gasto" style="flex:1">+ Gasto</button>
            <button class="op-add-expense-btn" data-go="#/operador/cerrar" style="flex:1;background:rgba(255,196,0,.95);color:var(--asfalto);border-color:transparent">🏁 Cerrar</button>
          </div>
        </div>`;
    } else if ((driver || isBoss()) && !firstTime) {
      tripCard = `
        <button class="op-start-trip" data-go="#/operador/viaje">
          <span class="op-start-trip-icon">🚦</span>
          <span><b>Empezar viaje</b><small>Origen, destino, flete y km. Un minuto.</small></span>
          <span class="op-selector-arrow" style="color:#fff">›</span>
        </button>`;
    }

    const week = periodSummary(tripsSince(myTrips(driver), startOfWeek()));
    const weekStrip = (driver || isBoss()) && !firstTime ? `
      <a class="op-week" href="#/operador/cuentas">
        <div class="op-week-title">Esta semana</div>
        <div class="op-week-nums">
          <div><span>Me quedó</span><b class="${week.profit < 0 ? "neg" : "pos"}">${fmtMXN(week.profit)}</b></div>
          <div><span>Cobré</span><b>${fmtMXN(week.freight)}</b></div>
          <div><span>Gasté</span><b>${fmtMXN(week.spent)}</b></div>
          <div><span>Viajes</span><b>${week.trips}</b></div>
        </div>
      </a>` : "";

    el.innerHTML = `
      <div class="op-screen">
        <div class="op-home-header">
          <div class="op-home-name">Hola, ${esc(nombre)}</div>
          <div class="op-home-plan">${esc(state.company?.name || "OperadorPro")}${access() ? " · plan activo ✓" : ""}</div>
        </div>
        ${onboarding}
        ${noDriverBoss}
        ${accessBanner() ? `<div style="padding:16px 16px 0">${accessBanner()}</div>` : ""}
        ${tripCard}
        ${weekStrip}
        <div style="padding:0 16px">${alertsHtml(driver)}</div>
        <div class="op-action-grid">
          <button class="op-action-card" data-go="#/operador/cuentas"><span class="op-action-emoji">📊</span><span class="op-action-label">Mis cuentas</span></button>
          <button class="op-action-card" data-go="#/operador/papeles"><span class="op-action-emoji">📄</span><span class="op-action-label">Mis papeles</span></button>
          <button class="op-action-card" data-go="#/operador/camion"><span class="op-action-emoji">🔧</span><span class="op-action-label">Mi camión</span></button>
          <button class="op-action-card" data-go="#/operador/cobranza"><span class="op-action-emoji">🧾</span><span class="op-action-label">Me deben</span></button>
          <button class="op-action-card" data-go="#/operador/auxilio"><span class="op-action-emoji">🆘</span><span class="op-action-label">Auxilio</span></button>
          <button class="op-action-card" data-go="#/operador/cursos"><span class="op-action-emoji">🎓</span><span class="op-action-label">Mis cursos</span></button>
        </div>
        ${tabs("#/operador")}
      </div>`;

    wireGo(el);
    wireAccessBanner();
  }

  function wireGo(el) {
    el.querySelectorAll("[data-go]").forEach((btn) => {
      btn.onclick = (e) => { e.stopPropagation(); location.hash = btn.dataset.go; };
    });
  }

  // ═══════════════════════════════════════════════════════════
  //  ALTA EXPRESS — "Manejo mi propio camión"
  // ═══════════════════════════════════════════════════════════
  async function renderAlta() {
    setOpMode();
    const el = $el();
    await loadCompanyData();
    const p = state.profile || {};

    if (!isBoss()) {
      el.innerHTML = blockScreen("Esta opción es para quien es dueño de su camión. Si trabajas para un patrón, <a href='#/operador/unirme'>entra con su código</a>.", "#/operador", "#/operador");
      return;
    }

    el.innerHTML = screen(hdr("Mi camión y yo"), `
      <p class="op-lead">Con esto arrancas. Todo se puede editar después.</p>
      <label class="op-label">Tu nombre</label>
      <input id="al-name" class="op-input" value="${esc(p.full_name || "")}" placeholder="Como aparece en tu licencia">
      <label class="op-label">Tu celular (10 dígitos)</label>
      <input id="al-phone" class="op-input" inputmode="numeric" value="${esc(p.phone || "")}" placeholder="5512345678">
      <label class="op-label">Placas del camión</label>
      <input id="al-plate" class="op-input" style="text-transform:uppercase" placeholder="ABC-123-D">
      <label class="op-label">Número o nombre de la unidad</label>
      <input id="al-eco" class="op-input" value="1" placeholder="1, Kenworth rojo…">
      <label class="op-label">Kilometraje actual (opcional)</label>
      <input id="al-km" class="op-input" inputmode="numeric" placeholder="Lo que marca el odómetro">
      <div class="form-msg" id="al-msg"></div>
      <button class="op-btn-primary" id="al-submit" style="margin-top:8px">🚛 Listo, arrancar</button>
      ${accessBanner() ? `<div style="margin-top:16px">${accessBanner()}</div>` : ""}
    `, "#/operador");
    wireAccessBanner();

    document.getElementById("al-submit").onclick = async () => {
      const msg = document.getElementById("al-msg");
      const body = {
        company_id: state.companyId,
        full_name: document.getElementById("al-name").value.trim(),
        phone: document.getElementById("al-phone").value.replace(/\D/g, ""),
        plate: document.getElementById("al-plate").value.trim().toUpperCase(),
        economic_number: document.getElementById("al-eco").value.trim() || "1"
      };
      const km = num(document.getElementById("al-km").value);
      if (km != null) body.odometer_km = Math.round(km);
      if (body.full_name.length < 2) { msg.className = "form-msg error"; msg.textContent = "Escribe tu nombre."; return; }
      if (body.phone.length < 10) { msg.className = "form-msg error"; msg.textContent = "El celular debe tener 10 dígitos."; return; }
      if (body.plate.length < 5) { msg.className = "form-msg error"; msg.textContent = "Escribe las placas completas."; return; }
      msg.className = "form-msg"; msg.textContent = "Guardando…";
      try {
        await callFn("fleet-setup-owner-operator", { method: "POST", body });
        if (state.profile) { state.profile.full_name = body.full_name; state.profile.phone = body.phone; }
        await loadCompanyData();
        location.hash = "#/operador";
      } catch (e) { msg.className = "form-msg error"; msg.textContent = e.message; }
    };
  }

  // ═══════════════════════════════════════════════════════════
  //  UNIRME — "Soy chofer de un patrón"
  // ═══════════════════════════════════════════════════════════
  async function renderUnirme() {
    setOpMode();
    const el = $el();
    const p = state.profile || {};
    el.innerHTML = screen(hdr("Entrar con mi patrón"), `
      <p class="op-lead">Pídele a tu jefe su <b>código de patrón</b> (lo ve en su app, en Más → Código de patrón).</p>
      <label class="op-label">Código de patrón</label>
      <input id="un-code" class="op-input op-code-input" maxlength="8" autocapitalize="characters" placeholder="ABC123">
      <label class="op-label">Tu celular (el que tiene tu patrón)</label>
      <input id="un-phone" class="op-input" inputmode="numeric" value="${esc(p.phone || "")}" placeholder="5512345678">
      <label class="op-label">Tu nombre</label>
      <input id="un-name" class="op-input" value="${esc(p.full_name || "")}" placeholder="Como aparece en tu licencia">
      <div class="form-msg" id="un-msg"></div>
      <button class="op-btn-primary" id="un-submit" style="margin-top:8px">Entrar</button>
    `, "#/operador");

    document.getElementById("un-submit").onclick = async () => {
      const msg = document.getElementById("un-msg");
      const body = {
        invite_code: document.getElementById("un-code").value.trim().toUpperCase(),
        phone: document.getElementById("un-phone").value.replace(/\D/g, ""),
        full_name: document.getElementById("un-name").value.trim()
      };
      if (body.invite_code.length < 4) { msg.className = "form-msg error"; msg.textContent = "Escribe el código."; return; }
      if (body.phone.length < 10) { msg.className = "form-msg error"; msg.textContent = "El celular debe tener 10 dígitos."; return; }
      if (body.full_name.length < 2) { msg.className = "form-msg error"; msg.textContent = "Escribe tu nombre."; return; }
      msg.className = "form-msg"; msg.textContent = "Entrando…";
      try {
        const { driver } = await callFn("fleet-join-company", { method: "POST", body });
        if (state.profile) state.profile.phone = body.phone;
        await loadMemberships();
        state.companyId = driver.company_id;
        try { localStorage.setItem("op_company_id", driver.company_id); } catch {}
        state.company = null;
        await loadCompanyData();
        location.hash = "#/operador";
      } catch (e) { msg.className = "form-msg error"; msg.textContent = e.message; }
    };
  }

  // ═══════════════════════════════════════════════════════════
  //  CÓDIGO DE PATRÓN (dueño)
  // ═══════════════════════════════════════════════════════════
  async function renderCodigo() {
    setOpMode();
    const el = $el();
    if (!isBoss()) { el.innerHTML = blockScreen("Solo el dueño de la empresa tiene código de patrón.", "#/operador/mas", "#/operador/mas"); return; }
    el.innerHTML = screen(hdr("Código de patrón", "#/operador/mas"), `<p class="op-lead">Cargando…</p>`, "#/operador/mas");
    try {
      const { invite_code } = await callFn("fleet-invite-code", { query: { company_id: state.companyId } });
      const text = `Hola, para llevar tus viajes y gastos en OperadorPro:\n1) Entra a ${CONFIG.SITE_URL}/app.html\n2) Regístrate con tu correo\n3) Elige "Soy chofer de un patrón" y pon este código: ${invite_code}\nUsa el mismo celular que tengo registrado.`;
      el.innerHTML = screen(hdr("Código de patrón", "#/operador/mas"), `
        <p class="op-lead">Compárteselo a tus choferes. Con él y su celular entran solos a tu empresa.</p>
        <div class="op-code-box">${esc(invite_code)}</div>
        <button class="op-btn-primary" id="cd-wa">📲 Mandar por WhatsApp</button>
        <button class="op-btn-secondary" id="cd-copy" style="margin-top:10px">Copiar código</button>
        <p class="op-hint">Cada chofer queda ligado al celular con el que lo registres (o al que él ponga). Si no lo reconoces, dalo de baja en Flota.</p>
      `, "#/operador/mas");
      document.getElementById("cd-wa").onclick = () => whatsapp(text);
      document.getElementById("cd-copy").onclick = async () => {
        try { await navigator.clipboard.writeText(invite_code); alert("Copiado"); } catch { window.prompt("Copia el código:", invite_code); }
      };
    } catch (e) {
      el.innerHTML = blockScreen(esc(e.message), "#/operador/mas", "#/operador/mas");
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  VIAJE
  // ═══════════════════════════════════════════════════════════
  async function renderViaje() {
    setOpMode();
    const el = $el();
    loading("#/operador/viaje");

    await loadCompanyData();
    const driver = await myDriver();

    if (!driver && !isBoss()) {
      el.innerHTML = blockScreen("Todavía no estás ligado a una empresa.", "#/operador", "#/operador/viaje",
        `<button class="op-btn-primary" data-go="#/operador/unirme">Entrar con el código de mi patrón</button>`);
      wireGo(el); return;
    }
    if (!access()) {
      el.innerHTML = screen(hdr("Viaje"), accessBanner(), "#/operador/viaje"); wireAccessBanner(); return;
    }

    const trip = openTripOf(driver);
    if (trip) return renderViajeActivo(trip, driver);

    const actives = state.vehicles.filter((v) => v.status === "activa");
    if (!actives.length) {
      el.innerHTML = blockScreen("No hay ninguna unidad registrada.", "#/operador", "#/operador/viaje",
        isBoss() ? `<button class="op-btn-primary" data-go="#/operador/alta">Registrar mi camión</button>` : "<p>Pídele a tu patrón que registre la unidad.</p>");
      wireGo(el); return;
    }

    // ── Wizard de viaje nuevo ────────────────────────────────
    const needDriverStep = isBoss() && state.drivers.filter((d) => d.status === "activo").length > 1 || (!driver && isBoss());
    const steps = ["unidad", "chofer", "origen", "destino", "flete", "km", "confirmar"].filter((s) =>
      !(s === "unidad" && actives.length === 1) && !(s === "chofer" && !needDriverStep));
    const TOTAL = steps.length;
    const wz = {
      vehicle_id: actives.length === 1 ? actives[0].id : null,
      driver_id: driver?.id || null,
      origin: "", destination: "", freight: null, km_start: null, client_name: "", budget: 0
    };
    const idx = (s) => steps.indexOf(s);
    const prev = (s) => steps[idx(s) - 1];
    const next = (s) => steps[idx(s) + 1];
    const goto = (s) => {
      if (!s) { location.hash = "#/operador"; return; }
      ({ unidad: showVehicle, chofer: showDriver, origen: showOrigin, destino: showDest, flete: showFreight, km: showKm, confirmar: showConfirm })[s]();
    };
    const wzScreen = (s, title, body) => screen(wzHdr(title, idx(s), TOTAL), body, "#/operador/viaje");
    const backTo = (s) => { document.getElementById("wz-back").onclick = () => goto(prev(s)); };

    function recentValues(field) {
      const seen = new Set(); const out = [];
      for (const t of (state.trips || [])) {
        const v = t[field]; if (v && !seen.has(v)) { seen.add(v); out.push(v); }
        if (out.length >= 6) break;
      }
      return out;
    }

    function textStep(s, title, field, placeholder, voice, onNext) {
      const recent = recentValues(field === "origin" ? "origin" : "destination");
      const cur = wz[field];
      el.innerHTML = wzScreen(s, title, `
        ${recent.length ? `<div class="op-city-suggestions">${recent.map((c) => `<button class="op-city-btn" data-val="${esc(c)}">📍 ${esc(c)}</button>`).join("")}</div>` : ""}
        <div class="op-city-input-row">
          <input id="tx" class="op-city-input" type="text" placeholder="${placeholder}" value="${esc(cur)}">
          <button class="op-voice-btn" id="tx-voice" title="Dictar">🎤</button>
        </div>
        <button class="op-btn-primary" id="tx-next" style="margin-top:16px">Continuar →</button>`);
      backTo(s);
      el.querySelectorAll("[data-val]").forEach((b) => { b.onclick = () => { wz[field] = b.dataset.val; onNext(); }; });
      document.getElementById("tx-voice").onclick = () => dictate(voice, (t) => { document.getElementById("tx").value = t; });
      document.getElementById("tx-next").onclick = () => {
        const v = document.getElementById("tx").value.trim();
        if (v.length < 2) { alert("Escribe la ciudad"); return; }
        wz[field] = v; onNext();
      };
    }

    function showVehicle() {
      el.innerHTML = wzScreen("unidad", "¿Qué unidad?",
        `<div class="op-selector-list">${actives.map((v) =>
          `<button class="op-selector-item${wz.vehicle_id === v.id ? " selected" : ""}" data-vid="${v.id}">
            <span class="op-selector-emoji">🚛</span>
            <div class="op-selector-text"><div>${esc(v.economic_number)}</div><div class="op-selector-sub">Placas ${esc(v.plate)}${v.odometer_km ? ` · ${fmtKm(v.odometer_km)}` : ""}</div></div>
            <span class="op-selector-arrow">›</span>
          </button>`).join("")}</div>`);
      backTo("unidad");
      el.querySelectorAll("[data-vid]").forEach((b) => { b.onclick = () => { wz.vehicle_id = b.dataset.vid; goto(next("unidad")); }; });
    }

    function showDriver() {
      const drivers = state.drivers.filter((d) => d.status === "activo");
      el.innerHTML = wzScreen("chofer", "¿Quién maneja?",
        `<div class="op-selector-list">${drivers.map((d) =>
          `<button class="op-selector-item${wz.driver_id === d.id ? " selected" : ""}" data-did="${d.id}">
            <span class="op-selector-emoji">👷</span>
            <div class="op-selector-text"><div>${esc(d.full_name)}${driver && d.id === driver.id ? " (yo)" : ""}</div><div class="op-selector-sub">${esc(d.phone)}</div></div>
            <span class="op-selector-arrow">›</span>
          </button>`).join("")}</div>
        ${!drivers.length ? `<div class="op-alert-box">No tienes choferes registrados. <a href="#/operador/alta">Regístrate tú</a> o comparte tu <a href="#/operador/codigo">código de patrón</a>.</div>` : ""}`);
      backTo("chofer");
      el.querySelectorAll("[data-did]").forEach((b) => { b.onclick = () => { wz.driver_id = b.dataset.did; goto(next("chofer")); }; });
    }

    function showOrigin() { textStep("origen", "¿De dónde sales?", "origin", "Ciudad de salida", "Di el origen", () => goto(next("origen"))); }
    function showDest()   { textStep("destino", "¿A dónde vas?", "destination", "Ciudad de llegada", "Di el destino", () => goto(next("destino"))); }

    function showFreight() {
      const PRESETS = [5000, 8000, 12000, 15000, 20000, 30000];
      el.innerHTML = wzScreen("flete", "¿Cuánto te pagan por el flete?", `
        <p class="op-lead">Es la base para saber cuánto te queda. Si aún no sabes, déjalo vacío.</p>
        <div class="op-amount-grid">${PRESETS.map((p) => `<button class="op-amount-btn${wz.freight === p ? " selected" : ""}" data-p="${p}">${fmtMXN(p)}</button>`).join("")}</div>
        <div class="op-city-input-row">
          <input id="fr" class="op-city-input" type="number" inputmode="decimal" placeholder="Otro monto" value="${wz.freight ?? ""}">
          <button class="op-voice-btn" id="fr-voice">🎤</button>
        </div>
        <button class="op-btn-primary" id="fr-next" style="margin-top:16px">Continuar →</button>
        <button class="op-btn-secondary" id="fr-skip" style="margin-top:10px">Aún no sé</button>`);
      backTo("flete");
      el.querySelectorAll("[data-p]").forEach((b) => { b.onclick = () => { wz.freight = Number(b.dataset.p); document.getElementById("fr").value = wz.freight; el.querySelectorAll(".op-amount-btn").forEach((x) => x.classList.toggle("selected", x === b)); }; });
      document.getElementById("fr-voice").onclick = () => dictate("Di el monto del flete", (t) => { const n = num(t); if (n != null) { wz.freight = n; document.getElementById("fr").value = n; } });
      document.getElementById("fr-next").onclick = () => { const n = num(document.getElementById("fr").value); wz.freight = n; goto(next("flete")); };
      document.getElementById("fr-skip").onclick = () => { wz.freight = null; goto(next("flete")); };
    }

    function showKm() {
      const v = vehicleOf(wz.vehicle_id);
      el.innerHTML = wzScreen("km", "¿Qué marca el odómetro?", `
        <p class="op-lead">Con el km de salida y el de llegada sabes cuánto te cuesta cada kilómetro y cuánto rinde tu diésel.</p>
        <div class="op-city-input-row">
          <input id="km" class="op-city-input" type="number" inputmode="numeric" placeholder="Kilómetros" value="${wz.km_start ?? v?.odometer_km ?? ""}">
          <button class="op-voice-btn" id="km-voice">🎤</button>
        </div>
        <button class="op-btn-primary" id="km-next" style="margin-top:16px">Continuar →</button>
        <button class="op-btn-secondary" id="km-skip" style="margin-top:10px">Saltar</button>`);
      backTo("km");
      document.getElementById("km-voice").onclick = () => dictate("Di los kilómetros", (t) => { const n = num(t); if (n != null) document.getElementById("km").value = Math.round(n); });
      document.getElementById("km-next").onclick = () => { const n = num(document.getElementById("km").value); wz.km_start = n == null ? null : Math.round(n); goto(next("km")); };
      document.getElementById("km-skip").onclick = () => { wz.km_start = null; goto(next("km")); };
    }

    function showConfirm() {
      const v = vehicleOf(wz.vehicle_id);
      const d = state.drivers.find((x) => x.id === wz.driver_id);
      const clients = recentValues("client_name");
      el.innerHTML = wzScreen("confirmar", "Confirmar viaje", `
        <div class="op-confirm-card">
          <div class="op-confirm-row"><span class="op-confirm-label">Unidad</span><span class="op-confirm-value">${esc(v?.economic_number || "—")}</span></div>
          ${d ? `<div class="op-confirm-row"><span class="op-confirm-label">Chofer</span><span class="op-confirm-value">${esc(d.full_name)}</span></div>` : ""}
          <div class="op-confirm-row"><span class="op-confirm-label">Ruta</span><span class="op-confirm-value">${esc(wz.origin)} → ${esc(wz.destination)}</span></div>
          <div class="op-confirm-row"><span class="op-confirm-label">Flete</span><span class="op-confirm-value">${wz.freight ? fmtMXN(wz.freight) : "Por definir"}</span></div>
          <div class="op-confirm-row"><span class="op-confirm-label">Km salida</span><span class="op-confirm-value">${fmtKm(wz.km_start)}</span></div>
        </div>
        <label class="op-label">Cliente (opcional)</label>
        ${clients.length ? `<div class="op-chips">${clients.map((c) => `<button class="op-chip" data-cl="${esc(c)}">${esc(c)}</button>`).join("")}</div>` : ""}
        <input id="cl" class="op-input" placeholder="¿Para quién es el flete?" value="${esc(wz.client_name)}">
        ${isBoss() ? `<label class="op-label">Viáticos que entregas al chofer (opcional)</label>
        <input id="bd" class="op-input" type="number" inputmode="decimal" placeholder="$0" value="${wz.budget || ""}">` : ""}
        <div class="form-msg" id="wz-msg"></div>
        <button class="op-btn-primary" id="wz-submit" style="margin-top:8px">🚛 Iniciar viaje</button>`);
      backTo("confirmar");
      el.querySelectorAll("[data-cl]").forEach((b) => { b.onclick = () => { document.getElementById("cl").value = b.dataset.cl; }; });
      document.getElementById("wz-submit").onclick = async () => {
        const msg = document.getElementById("wz-msg");
        if (!wz.driver_id) { msg.className = "form-msg error"; msg.textContent = "Falta el chofer."; return; }
        msg.className = "form-msg"; msg.textContent = "Guardando…";
        const body = {
          company_id: state.companyId, vehicle_id: wz.vehicle_id, driver_id: wz.driver_id,
          origin: wz.origin, destination: wz.destination,
          freight_amount: wz.freight || 0,
          budget_amount: num(document.getElementById("bd")?.value) || 0
        };
        if (wz.km_start != null) body.km_start = wz.km_start;
        const cl = document.getElementById("cl").value.trim(); if (cl) body.client_name = cl;
        try {
          await callFn("fleet-create-trip", { method: "POST", body });
          location.hash = "#/operador";
        } catch (e) { msg.className = "form-msg error"; msg.textContent = e.message; }
      };
    }

    goto(steps[0]);
  }

  // ── Viaje activo ─────────────────────────────────────────────
  async function renderViajeActivo(trip, driver) {
    const el = $el();
    const expenses = await tripExpenses(trip.id);
    const spent = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const freight = Number(trip.freight_amount || 0);
    const left = freight - spent;
    const budget = Number(trip.budget_amount || 0);

    const rows = expenses.slice(0, 8).map((e) => `
      <div class="op-exp-row">
        <span class="op-exp-icon">${catOf(e.category).icon}</span>
        <div style="flex:1"><div>${esc(catOf(e.category).label)}${e.liters ? ` · ${e.liters} L` : ""}</div><div class="op-selector-sub">${fmtDay(e.expense_date)}${e.receipt_url ? " · 📷" : ""}</div></div>
        <b>${fmtMXN(e.amount)}</b>
      </div>`).join("") || `<div class="op-empty" style="padding:20px">Sin gastos todavía.</div>`;

    el.innerHTML = screen(hdr("Viaje en curso"), `
      <div class="op-confirm-card">
        <div class="op-confirm-row"><span class="op-confirm-label">Ruta</span><span class="op-confirm-value">${esc(trip.origin)} → ${esc(trip.destination)}</span></div>
        <div class="op-confirm-row"><span class="op-confirm-label">Unidad</span><span class="op-confirm-value">${esc(vehicleLabel(trip.vehicle_id))}</span></div>
        ${trip.client_name ? `<div class="op-confirm-row"><span class="op-confirm-label">Cliente</span><span class="op-confirm-value">${esc(trip.client_name)}</span></div>` : ""}
        <div class="op-confirm-row"><span class="op-confirm-label">Salida</span><span class="op-confirm-value">${fmtDay(trip.started_at)} · ${fmtKm(trip.km_start)}</span></div>
        <div class="op-confirm-row"><span class="op-confirm-label">Flete</span><span class="op-confirm-value">${freight ? fmtMXN(freight) : "Por definir"}</span></div>
        <div class="op-confirm-row"><span class="op-confirm-label">Gastado</span><span class="op-confirm-value">${fmtMXN(spent)}</span></div>
        ${freight ? `<div class="op-confirm-row"><span class="op-confirm-label">Va quedando</span><span class="op-confirm-value ${left < 0 ? "neg" : "pos"}">${fmtMXN(left)}</span></div>` : ""}
        ${budget ? `<div class="op-confirm-row"><span class="op-confirm-label">Viáticos</span><span class="op-confirm-value">${fmtMXN(spent)} de ${fmtMXN(budget)}</span></div>` : ""}
      </div>
      <button class="op-btn-primary op-gap-sm" data-go="#/operador/gasto">💵 Reportar gasto</button>
      <button class="op-btn-secondary op-gap-sm" data-go="#/operador/inspeccion">🔍 Inspección pre-viaje</button>
      <button class="op-btn-secondary op-gap" id="tr-wa">📲 Mandar resumen por WhatsApp</button>
      <div class="op-section-label">Gastos de este viaje</div>
      <div class="op-exp-list">${rows}</div>
      <button class="op-btn-danger" data-go="#/operador/cerrar" style="margin-top:20px">🏁 Cerrar viaje</button>
    `, "#/operador/viaje");
    wireGo(el);
    document.getElementById("tr-wa").onclick = () => whatsapp(tripText(trip, expenses));
  }

  function tripText(trip, expenses) {
    const spent = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const freight = Number(trip.freight_amount || 0);
    const byCat = {};
    for (const e of expenses) byCat[e.category] = (byCat[e.category] || 0) + Number(e.amount);
    const lines = [
      `🚛 Viaje ${trip.origin} → ${trip.destination}`,
      `Unidad: ${vehicleLabel(trip.vehicle_id)}`,
      trip.client_name ? `Cliente: ${trip.client_name}` : null,
      `Salida: ${fmtDay(trip.started_at)}${trip.km_start ? ` · ${fmtKm(trip.km_start)}` : ""}`,
      trip.km_end ? `Llegada: ${fmtDay(trip.closed_at)} · ${fmtKm(trip.km_end)} (${fmtKm(trip.km_end - (trip.km_start || trip.km_end))} recorridos)` : null,
      "",
      ...Object.entries(byCat).map(([k, v]) => `${catOf(k).icon} ${catOf(k).label}: ${fmtMXN(v)}`),
      `Total gastos: ${fmtMXN(spent)}`,
      freight ? `Flete: ${fmtMXN(freight)}` : null,
      freight ? `✅ Me quedó: ${fmtMXN(freight - spent)}` : null,
      "",
      "— OperadorPro"
    ].filter((l) => l !== null);
    return lines.join("\n");
  }

  // ── Cerrar viaje ─────────────────────────────────────────────
  async function renderCerrar() {
    setOpMode();
    const el = $el();
    loading("#/operador/viaje");
    await loadCompanyData();
    const driver = await myDriver();
    const trip = openTripOf(driver);
    if (!trip) { location.hash = "#/operador/viaje"; return; }

    const wz = { km_end: null, pod_url: null, freight: Number(trip.freight_amount || 0) || null };
    const v = vehicleOf(trip.vehicle_id);

    el.innerHTML = screen(hdr("Cerrar viaje", "#/operador/viaje"), `
      <div class="op-confirm-card">
        <div class="op-confirm-row"><span class="op-confirm-label">Ruta</span><span class="op-confirm-value">${esc(trip.origin)} → ${esc(trip.destination)}</span></div>
        <div class="op-confirm-row"><span class="op-confirm-label">Km salida</span><span class="op-confirm-value">${fmtKm(trip.km_start)}</span></div>
      </div>
      <label class="op-label">¿Qué marca el odómetro al llegar?</label>
      <div class="op-city-input-row">
        <input id="ce-km" class="op-city-input" type="number" inputmode="numeric" placeholder="Kilómetros" value="${trip.km_start ? "" : (v?.odometer_km || "")}">
        <button class="op-voice-btn" id="ce-voice">🎤</button>
      </div>
      ${!trip.freight_amount ? `<label class="op-label">¿Cuánto te pagan por este flete?</label>
      <input id="ce-fr" class="op-input" type="number" inputmode="decimal" placeholder="$">` : ""}
      <label class="op-label">Foto de la remisión firmada (opcional)</label>
      <div class="op-camera-area" id="ce-tap" style="min-height:110px;padding:18px">
        <div id="ce-ph"><span class="op-camera-icon" style="font-size:36px">📷</span><span class="op-camera-label">Evidencia de entrega</span></div>
        <img id="ce-img" class="op-camera-preview hidden" alt="">
      </div>
      <input type="file" id="ce-file" accept="image/*" capture="environment" class="hidden">
      <div class="form-msg" id="ce-msg"></div>
      <button class="op-btn-primary" id="ce-submit">🏁 Cerrar y ver cuentas</button>
    `, "#/operador/viaje");

    const file = document.getElementById("ce-file");
    document.getElementById("ce-tap").onclick = () => file.click();
    file.onchange = async () => {
      const f = file.files[0]; if (!f) return;
      const msg = document.getElementById("ce-msg");
      const r = new FileReader();
      r.onload = (ev) => { const img = document.getElementById("ce-img"); img.src = ev.target.result; img.classList.remove("hidden"); document.getElementById("ce-ph").classList.add("hidden"); document.getElementById("ce-tap").classList.add("has-image"); };
      r.readAsDataURL(f);
      msg.className = "form-msg"; msg.textContent = "Subiendo foto…";
      try { wz.pod_url = await uploadToBucket("trip-evidence", f); msg.textContent = "Foto guardada ✅"; }
      catch (e) { msg.className = "form-msg error"; msg.textContent = `No se pudo subir la foto: ${e.message}`; }
    };
    document.getElementById("ce-voice").onclick = () => dictate("Di los kilómetros", (t) => { const n = num(t); if (n != null) document.getElementById("ce-km").value = Math.round(n); });

    document.getElementById("ce-submit").onclick = async () => {
      const msg = document.getElementById("ce-msg");
      const km = num(document.getElementById("ce-km").value);
      if (km != null && trip.km_start != null && km < trip.km_start) { msg.className = "form-msg error"; msg.textContent = `El km de llegada no puede ser menor al de salida (${fmtKm(trip.km_start)}).`; return; }
      const fr = document.getElementById("ce-fr") ? num(document.getElementById("ce-fr").value) : null;
      if (!confirm("¿Cerrar este viaje? Ya no podrás agregarle gastos.")) return;
      msg.className = "form-msg"; msg.textContent = "Cerrando…";
      const body = { trip_id: trip.id };
      if (km != null) body.km_end = Math.round(km);
      if (wz.pod_url) body.pod_url = wz.pod_url;
      if (fr != null) body.freight_amount = fr;
      try {
        await callFn("fleet-close-trip", { method: "POST", body });
        location.hash = `#/operador/cuentas/${trip.id}`;
      } catch (e) { msg.className = "form-msg error"; msg.textContent = e.message; }
    };
  }

  // ═══════════════════════════════════════════════════════════
  //  GASTO
  // ═══════════════════════════════════════════════════════════
  async function renderGasto() {
    setOpMode();
    const el = $el();
    loading("#/operador/gasto");

    await loadCompanyData();
    const driver = await myDriver();
    if (!driver && !isBoss()) {
      el.innerHTML = blockScreen("Todavía no estás ligado a una empresa.", "#/operador", "#/operador/gasto",
        `<button class="op-btn-primary" data-go="#/operador/unirme">Entrar con el código de mi patrón</button>`);
      wireGo(el); return;
    }
    if (!access()) { el.innerHTML = screen(hdr("Gasto"), accessBanner(), "#/operador/gasto"); wireAccessBanner(); return; }

    const trip = openTripOf(driver);
    if (!trip) {
      el.innerHTML = screen(hdr("Reportar gasto"), `
        <div class="op-alert-box">Los gastos van dentro de un viaje. Empieza uno y luego registra diésel, casetas, comida…</div>
        <button class="op-btn-primary" data-go="#/operador/viaje">🚦 Empezar viaje</button>`, "#/operador/gasto");
      wireGo(el); return;
    }

    const TOTAL = 4;
    const wz = { category: null, amount: null, liters: null, odometer_km: null, receiptUrl: null };
    const v = vehicleOf(trip.vehicle_id);
    const wzScreen = (n, title, body) => screen(wzHdr(title, n, TOTAL), body, "#/operador/gasto");

    function showCategory() {
      el.innerHTML = wzScreen(0, "¿Qué gastaste?",
        `<p class="op-lead">${esc(trip.origin)} → ${esc(trip.destination)}</p>
        <div class="op-category-grid">${CATEGORIES.map((c) =>
          `<button class="op-category-btn${wz.category === c.key ? " selected" : ""}" data-cat="${c.key}">
            <span class="op-category-emoji">${c.icon}</span><span class="op-category-label">${c.label}</span>
          </button>`).join("")}</div>`);
      document.getElementById("wz-back").onclick = () => { location.hash = "#/operador"; };
      el.querySelectorAll("[data-cat]").forEach((b) => { b.onclick = () => { wz.category = b.dataset.cat; showAmount(); }; });
    }

    function showAmount() {
      const diesel = wz.category === "diesel";
      const PRESETS = diesel ? [1000, 2000, 3000, 4000, 5000, 6000]
        : wz.category === "caseta" ? [150, 300, 500, 800, 1000, 1500]
        : [100, 200, 300, 500, 800, 1000];
      el.innerHTML = wzScreen(1, `¿Cuánto pagaste de ${catOf(wz.category).label.toLowerCase()}?`, `
        <div class="op-amount-grid">${PRESETS.map((p) => `<button class="op-amount-btn${wz.amount === p ? " selected" : ""}" data-p="${p}">${fmtMXN(p)}</button>`).join("")}</div>
        <div class="op-city-input-row">
          <input id="amt" class="op-city-input" type="number" inputmode="decimal" placeholder="Otro monto" value="${wz.amount ?? ""}">
          <button class="op-voice-btn" id="amt-voice">🎤</button>
        </div>
        ${diesel ? `
          <label class="op-label">Litros (opcional, para saber el rendimiento)</label>
          <input id="lt" class="op-input" type="number" inputmode="decimal" placeholder="Litros cargados" value="${wz.liters ?? ""}">
          <label class="op-label">Odómetro al cargar (opcional)</label>
          <input id="od" class="op-input" type="number" inputmode="numeric" placeholder="${v?.odometer_km ? `Último: ${fmtKm(v.odometer_km)}` : "Kilómetros"}" value="${wz.odometer_km ?? ""}">` : ""}
        <button class="op-btn-primary" id="amt-next" style="margin-top:16px">Continuar →</button>`);
      document.getElementById("wz-back").onclick = showCategory;
      el.querySelectorAll("[data-p]").forEach((b) => { b.onclick = () => { wz.amount = Number(b.dataset.p); document.getElementById("amt").value = wz.amount; el.querySelectorAll(".op-amount-btn").forEach((x) => x.classList.toggle("selected", x === b)); }; });
      document.getElementById("amt-voice").onclick = () => dictate("Di el monto", (t) => { const n = num(t); if (n != null) { wz.amount = n; document.getElementById("amt").value = n; } });
      document.getElementById("amt-next").onclick = () => {
        const n = num(document.getElementById("amt").value);
        if (n == null || n <= 0) { alert("Escribe el monto"); return; }
        wz.amount = n;
        if (diesel) { wz.liters = num(document.getElementById("lt").value); const od = num(document.getElementById("od").value); wz.odometer_km = od == null ? null : Math.round(od); }
        showPhoto();
      };
    }

    function showPhoto() {
      el.innerHTML = wzScreen(2, "Foto del ticket", `
        <div class="op-camera-area" id="cam-tap">
          <div id="cam-ph">
            <span class="op-camera-icon">📷</span>
            <span class="op-camera-label">Toca para fotografiar el ticket</span>
            <span class="op-camera-sub">Recomendado: es tu comprobante ante el patrón o el SAT</span>
          </div>
          <img id="cam-img" class="op-camera-preview hidden" alt="">
        </div>
        <input type="file" id="cam-file" accept="image/*" capture="environment" class="hidden">
        <div class="form-msg" id="scan-msg" style="text-align:center"></div>
        <button class="op-btn-primary" id="ph-next">Continuar →</button>
        <button class="op-btn-secondary" id="ph-skip" style="margin-top:10px">Sin foto</button>`);
      document.getElementById("wz-back").onclick = showAmount;
      const camFile = document.getElementById("cam-file");
      document.getElementById("cam-tap").onclick = () => camFile.click();
      camFile.onchange = async () => {
        const file = camFile.files[0]; if (!file) return;
        const r = new FileReader();
        r.onload = (ev) => { const img = document.getElementById("cam-img"); img.src = ev.target.result; img.classList.remove("hidden"); document.getElementById("cam-ph").classList.add("hidden"); document.getElementById("cam-tap").classList.add("has-image"); };
        r.readAsDataURL(file);
        const m = document.getElementById("scan-msg"); m.className = "form-msg"; m.textContent = "Subiendo foto…";
        try { wz.receiptUrl = await uploadToBucket("trip-evidence", file); m.textContent = "Foto guardada ✅"; }
        catch (e) { m.className = "form-msg error"; m.textContent = `No se pudo subir: ${e.message}`; }
      };
      document.getElementById("ph-next").onclick = showConfirm;
      document.getElementById("ph-skip").onclick = () => { wz.receiptUrl = null; showConfirm(); };
    }

    function showConfirm() {
      el.innerHTML = wzScreen(3, "Confirmar gasto", `
        <div class="op-confirm-card">
          <div class="op-confirm-row"><span class="op-confirm-label">Viaje</span><span class="op-confirm-value">${esc(trip.origin)} → ${esc(trip.destination)}</span></div>
          <div class="op-confirm-row"><span class="op-confirm-label">Tipo</span><span class="op-confirm-value">${catOf(wz.category).icon} ${esc(catOf(wz.category).label)}</span></div>
          <div class="op-confirm-row"><span class="op-confirm-label">Monto</span><span class="op-confirm-value">${fmtMXN(wz.amount)}</span></div>
          ${wz.liters ? `<div class="op-confirm-row"><span class="op-confirm-label">Litros</span><span class="op-confirm-value">${wz.liters} L (${fmtMXN(wz.amount / wz.liters)}/L)</span></div>` : ""}
          ${wz.odometer_km ? `<div class="op-confirm-row"><span class="op-confirm-label">Odómetro</span><span class="op-confirm-value">${fmtKm(wz.odometer_km)}</span></div>` : ""}
          <div class="op-confirm-row"><span class="op-confirm-label">Foto</span><span class="op-confirm-value">${wz.receiptUrl ? "✅ Adjunta" : "Sin foto"}</span></div>
        </div>
        <div class="form-msg" id="wz-msg"></div>
        <button class="op-btn-primary" id="wz-submit">💵 Guardar gasto</button>`);
      document.getElementById("wz-back").onclick = showPhoto;
      document.getElementById("wz-submit").onclick = async () => {
        const msg = document.getElementById("wz-msg");
        msg.className = "form-msg"; msg.textContent = "Guardando…";
        const body = { trip_id: trip.id, category: wz.category, amount: wz.amount, expense_date: today() };
        if (wz.receiptUrl) body.receipt_url = wz.receiptUrl;
        if (wz.liters) body.liters = wz.liters;
        if (wz.odometer_km != null) body.odometer_km = wz.odometer_km;
        try {
          await callFn("fleet-submit-expense", { method: "POST", body });
          location.hash = "#/operador";
        } catch (e) { msg.className = "form-msg error"; msg.textContent = e.message; }
      };
    }

    showCategory();
  }

  // ═══════════════════════════════════════════════════════════
  //  CUENTAS CLARAS
  // ═══════════════════════════════════════════════════════════
  let cuentasPeriod = "semana";
  async function renderCuentas() {
    setOpMode();
    const el = $el();
    loading("#/operador/cuentas");
    await loadCompanyData();
    const driver = await myDriver();
    const all = myTrips(driver);

    const since = cuentasPeriod === "semana" ? startOfWeek() : cuentasPeriod === "mes" ? startOfMonth() : new Date(0);
    const trips = tripsSince(all, since);
    const sum = periodSummary(trips);
    const expenses = await expensesForTrips(trips.map((t) => t.id));
    const byCat = {};
    for (const e of expenses) byCat[e.category] = (byCat[e.category] || 0) + Number(e.amount);
    const catRows = Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([k, v]) => `
      <div class="op-cat-row">
        <span>${catOf(k).icon} ${esc(catOf(k).label)}</span>
        <div class="op-cat-bar"><div style="width:${sum.spent ? Math.round((v / sum.spent) * 100) : 0}%"></div></div>
        <b>${fmtMXN(v)}</b>
      </div>`).join("");

    const tripRows = trips.map((t) => {
      const profit = Number(t.freight_amount || 0) - Number(t.spent_amount || 0);
      return `
        <button class="op-selector-item" data-go="#/operador/cuentas/${t.id}">
          <div class="op-selector-text">
            <div>${esc(t.origin)} → ${esc(t.destination)} ${t.status === "abierto" ? `<span class="op-tag">en curso</span>` : ""}</div>
            <div class="op-selector-sub">${fmtDay(t.started_at)} · ${esc(vehicleLabel(t.vehicle_id))}${t.distance_km ? ` · ${fmtKm(t.distance_km)}` : ""}</div>
          </div>
          <div style="text-align:right">
            <div class="${t.freight_amount ? (profit < 0 ? "neg" : "pos") : ""}" style="font-weight:700">${t.freight_amount ? fmtMXN(profit) : `−${fmtMXN(t.spent_amount)}`}</div>
            <div class="op-selector-sub">${t.freight_amount ? "me quedó" : "gastado"}</div>
          </div>
        </button>`;
    }).join("") || `<div class="op-empty"><div class="op-empty-icon">📊</div><div class="op-empty-title">Sin viajes en este periodo</div>Cuando cierres un viaje aquí ves cuánto te quedó.</div>`;

    const periodLabel = { semana: "esta semana", mes: "este mes", todo: "en total" }[cuentasPeriod];
    el.innerHTML = screen(hdr("Mis cuentas"), `
      <div class="op-seg">
        ${["semana", "mes", "todo"].map((p) => `<button class="op-seg-btn${cuentasPeriod === p ? " active" : ""}" data-period="${p}">${{ semana: "Semana", mes: "Mes", todo: "Todo" }[p]}</button>`).join("")}
      </div>
      <div class="op-big-card ${sum.profit < 0 ? "neg" : ""}">
        <div class="op-big-label">Me quedó ${periodLabel}</div>
        <div class="op-big-num">${fmtMXN(sum.profit)}</div>
        <div class="op-big-sub">Cobré ${fmtMXN(sum.freight)} · Gasté ${fmtMXN(sum.spent)} · ${sum.trips} viaje${sum.trips === 1 ? "" : "s"}</div>
      </div>
      <div class="op-kpi-row">
        <div class="op-kpi"><span>Kilómetros</span><b>${sum.km ? fmtKm(sum.km) : "—"}</b></div>
        <div class="op-kpi"><span>Costo por km</span><b>${sum.costPerKm != null ? `$${sum.costPerKm}` : "—"}</b></div>
        <div class="op-kpi"><span>Rendimiento</span><b>${sum.kmPerLiter != null ? `${sum.kmPerLiter} km/L` : "—"}</b></div>
      </div>
      ${catRows ? `<div class="op-section-label">En qué se fue</div><div class="op-cat-list">${catRows}</div>` : ""}
      <button class="op-btn-secondary op-gap" id="cu-wa">📲 Mandar cuentas por WhatsApp</button>
      <div class="op-section-label">Viajes</div>
      <div class="op-selector-list">${tripRows}</div>
      <p class="op-hint">Sin km ni litros no hay costo por km ni rendimiento: captúralos al salir, al cargar diésel y al llegar.</p>
    `, "#/operador/cuentas");

    wireGo(el);
    el.querySelectorAll("[data-period]").forEach((b) => { b.onclick = () => { cuentasPeriod = b.dataset.period; renderCuentas(); }; });
    document.getElementById("cu-wa").onclick = () => {
      const lines = [
        `📊 Mis cuentas ${periodLabel} — ${state.company?.name || ""}`,
        `Viajes: ${sum.trips}`,
        `Cobré: ${fmtMXN(sum.freight)}`,
        `Gasté: ${fmtMXN(sum.spent)}`,
        ...Object.entries(byCat).map(([k, v]) => `  ${catOf(k).icon} ${catOf(k).label}: ${fmtMXN(v)}`),
        `✅ Me quedó: ${fmtMXN(sum.profit)}`,
        sum.km ? `Km: ${fmtKm(sum.km)}${sum.costPerKm != null ? ` · $${sum.costPerKm}/km` : ""}${sum.kmPerLiter != null ? ` · ${sum.kmPerLiter} km/L` : ""}` : null,
        "", "— OperadorPro"
      ].filter((l) => l !== null);
      whatsapp(lines.join("\n"));
    };
  }

  async function renderCuentasDetalle(tripId) {
    setOpMode();
    const el = $el();
    loading("#/operador/cuentas");
    await loadCompanyData();
    const trip = (state.trips || []).find((t) => t.id === tripId);
    if (!trip) { location.hash = "#/operador/cuentas"; return; }
    const expenses = await tripExpenses(tripId);
    const spent = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const freight = Number(trip.freight_amount || 0);
    const profit = freight - spent;
    const km = trip.distance_km;
    const liters = expenses.filter((e) => e.category === "diesel").reduce((s, e) => s + Number(e.liters || 0), 0);

    const rows = expenses.map((e) => `
      <div class="op-exp-row">
        <span class="op-exp-icon">${catOf(e.category).icon}</span>
        <div style="flex:1"><div>${esc(catOf(e.category).label)}${e.liters ? ` · ${e.liters} L` : ""}</div><div class="op-selector-sub">${fmtDay(e.expense_date)}</div></div>
        ${e.receipt_url ? `<a href="${esc(e.receipt_url)}" target="_blank" style="text-decoration:none">📷</a>` : ""}
        <b>${fmtMXN(e.amount)}</b>
      </div>`).join("") || `<div class="op-empty" style="padding:20px">Sin gastos.</div>`;

    el.innerHTML = screen(hdr("Cuentas del viaje", "#/operador/cuentas"), `
      <div class="op-big-card ${freight && profit < 0 ? "neg" : ""}">
        <div class="op-big-label">${esc(trip.origin)} → ${esc(trip.destination)}</div>
        <div class="op-big-num">${freight ? fmtMXN(profit) : fmtMXN(-spent)}</div>
        <div class="op-big-sub">${freight ? `Flete ${fmtMXN(freight)} − gastos ${fmtMXN(spent)}` : `Gastos ${fmtMXN(spent)} · flete por definir`}</div>
      </div>
      <div class="op-kpi-row">
        <div class="op-kpi"><span>Recorrido</span><b>${km ? fmtKm(km) : "—"}</b></div>
        <div class="op-kpi"><span>Costo por km</span><b>${km ? `$${round(spent / km)}` : "—"}</b></div>
        <div class="op-kpi"><span>Rendimiento</span><b>${km && liters ? `${round(km / liters, 1)} km/L` : "—"}</b></div>
      </div>
      <div class="op-confirm-card">
        <div class="op-confirm-row"><span class="op-confirm-label">Unidad</span><span class="op-confirm-value">${esc(vehicleLabel(trip.vehicle_id))}</span></div>
        ${trip.client_name ? `<div class="op-confirm-row"><span class="op-confirm-label">Cliente</span><span class="op-confirm-value">${esc(trip.client_name)}</span></div>` : ""}
        <div class="op-confirm-row"><span class="op-confirm-label">Fechas</span><span class="op-confirm-value">${fmtDay(trip.started_at)}${trip.closed_at ? ` → ${fmtDay(trip.closed_at)}` : " (en curso)"}</span></div>
        <div class="op-confirm-row"><span class="op-confirm-label">Odómetro</span><span class="op-confirm-value">${fmtKm(trip.km_start)} → ${fmtKm(trip.km_end)}</span></div>
        ${trip.pod_url ? `<div class="op-confirm-row"><span class="op-confirm-label">Entrega</span><span class="op-confirm-value"><a href="${esc(trip.pod_url)}" target="_blank">Ver remisión 📷</a></span></div>` : ""}
      </div>
      <button class="op-btn-secondary op-gap" id="cd-wa">📲 Mandar por WhatsApp</button>
      ${isBoss() && trip.status === "cerrado" && freight ? `<button class="op-btn-secondary op-gap" data-go="#/operador/cobranza?trip=${trip.id}">🧾 Poner a cobrar este flete</button>` : ""}
      <div class="op-section-label">Gastos</div>
      <div class="op-exp-list">${rows}</div>
    `, "#/operador/cuentas");
    wireGo(el);
    document.getElementById("cd-wa").onclick = () => whatsapp(tripText(trip, expenses));
  }

  // ═══════════════════════════════════════════════════════════
  //  MIS PAPELES
  // ═══════════════════════════════════════════════════════════
  async function renderPapeles() {
    setOpMode();
    const el = $el();
    loading("#/operador/mas");
    await loadCompanyData();
    const driver = await myDriver();
    const p = state.profile || {};

    const dot = (s) => ({ vigente: "🟢", por_vencer: "🟡", vencido: "🔴" }[s] || "⚫");
    const tag = (days) => days === null ? `<span class="op-selector-sub">Sin fecha</span>`
      : days < 0 ? `<span class="neg">Vencido hace ${-days} días</span>`
      : days <= 30 ? `<span style="color:var(--ambar)">Vence en ${days} días</span>`
      : `<span class="pos">Vigente · ${days} días</span>`;
    const semOf = (days) => days === null ? "⚫" : days < 0 ? "🔴" : days <= 30 ? "🟡" : "🟢";

    const mine = [
      { icon: semOf(daysUntilDate(p.licencia_vigencia)), name: "Licencia federal", sub: tag(daysUntilDate(p.licencia_vigencia)), href: "#/perfil" },
      { icon: semOf(daysUntilDate(p.examen_medico_vigencia)), name: "Examen psicofísico", sub: tag(daysUntilDate(p.examen_medico_vigencia)), href: "#/perfil" }
    ];

    const docs = (state.complianceDocs || []).filter((d) => isBoss() || !d.driver_id || (driver && d.driver_id === driver.id));
    const docRows = docs.map((d) => {
      const name = d.doc_type === "otro" ? "Documento" : (DOC_LABELS[d.doc_type] || d.doc_type);
      const who = d.vehicle_id ? vehicleLabel(d.vehicle_id) : (state.drivers.find((x) => x.id === d.driver_id)?.full_name || "Chofer");
      return `<div class="op-doc-row"><span>${dot(d.semaforo)}</span><div style="flex:1"><div class="op-doc-name">${esc(name)}</div><div class="op-doc-date">${esc(who)} · vence ${fmtDay(d.expires_at)} (${d.days_to_expire} días)</div></div></div>`;
    }).join("");

    el.innerHTML = screen(hdr("Mis papeles"), `
      <div class="op-section-label">Yo</div>
      <div class="op-doc-list">${mine.map((m) => `<a class="op-doc-row" href="${m.href}" style="text-decoration:none;color:inherit"><span>${m.icon}</span><div style="flex:1"><div class="op-doc-name">${m.name}</div><div class="op-doc-date">${m.sub}</div></div><span class="op-selector-arrow">›</span></a>`).join("")}</div>
      <div class="op-section-label" style="margin-top:18px">Documentos con archivo</div>
      ${docRows ? `<div class="op-doc-list">${docRows}</div>` : `<div class="op-empty" style="padding:16px">Aún no subes papeles. Con foto y fecha te avisamos 30, 15 y 5 días antes de que venzan.</div>`}
      ${access() ? `<button class="op-btn-primary" id="pp-add" style="margin-top:18px">📷 Subir un papel</button>` : `<div style="margin-top:16px">${accessBanner()}</div>`}
      <div id="pp-form" class="hidden" style="margin-top:14px">
        <label class="op-label">¿Qué documento?</label>
        <select id="pp-type" class="op-input">
          <option value="licencia_federal">Licencia federal (mía)</option>
          <option value="otro">Examen psicofísico (mío)</option>
          ${isBoss() ? `
          <option value="tarjeta_circulacion">Tarjeta de circulación (unidad)</option>
          <option value="poliza_seguro">Póliza de seguro (unidad)</option>
          <option value="verificacion">Verificación (unidad)</option>
          <option value="permiso_sct">Permiso SCT (unidad)</option>` : ""}
        </select>
        ${isBoss() && state.vehicles.length > 1 ? `<label class="op-label">Unidad</label><select id="pp-veh" class="op-input">${state.vehicles.map((v) => `<option value="${v.id}">${esc(v.economic_number)} · ${esc(v.plate)}</option>`).join("")}</select>` : ""}
        <label class="op-label">¿Cuándo vence?</label>
        <input id="pp-exp" class="op-input" type="date">
        <label class="op-label">Foto o PDF</label>
        <input id="pp-file" class="op-input" type="file" accept="image/*,.pdf">
        <div class="form-msg" id="pp-msg"></div>
        <button class="op-btn-primary" id="pp-submit">Guardar y activar avisos</button>
      </div>
    `, "#/operador/mas");
    wireAccessBanner();

    const addBtn = document.getElementById("pp-add");
    if (addBtn) addBtn.onclick = () => { document.getElementById("pp-form").classList.remove("hidden"); addBtn.classList.add("hidden"); };
    const submit = document.getElementById("pp-submit");
    if (submit) submit.onclick = async () => {
      const msg = document.getElementById("pp-msg");
      const type = document.getElementById("pp-type").value;
      const exp = document.getElementById("pp-exp").value;
      const file = document.getElementById("pp-file").files[0];
      if (!exp) { msg.className = "form-msg error"; msg.textContent = "Pon la fecha de vencimiento."; return; }
      if (!file) { msg.className = "form-msg error"; msg.textContent = "Toma la foto o elige el PDF."; return; }
      const isMine = ["licencia_federal", "otro"].includes(type);
      if (isMine && !driver) { msg.className = "form-msg error"; msg.textContent = "Primero regístrate como chofer."; return; }
      msg.className = "form-msg"; msg.textContent = "Subiendo…";
      try {
        const url = await uploadToBucket("compliance-docs", file);
        const body = { company_id: state.companyId, doc_type: type, file_url: url, expires_at: exp };
        if (isMine) { body.driver_id = driver.id; if (type === "otro") body.doc_number = "EXAMEN PSICOFISICO"; }
        else body.vehicle_id = document.getElementById("pp-veh")?.value || state.vehicles[0]?.id;
        await callFn("fleet-upload-compliance-doc", { method: "POST", body });
        if (type === "licencia_federal" || type === "otro") {
          const field = type === "licencia_federal" ? "licencia_vigencia" : "examen_medico_vigencia";
          await sb.from("profiles").update({ [field]: exp, updated_at: new Date().toISOString() }).eq("id", state.session.user.id);
          if (state.profile) state.profile[field] = exp;
        }
        renderPapeles();
      } catch (e) { msg.className = "form-msg error"; msg.textContent = e.message; }
    };
  }

  // ═══════════════════════════════════════════════════════════
  //  MI CAMIÓN
  // ═══════════════════════════════════════════════════════════
  let camionVehicleId = null;
  async function renderCamion() {
    setOpMode();
    const el = $el();
    loading("#/operador/mas");
    await loadCompanyData();
    const vehicles = state.vehicles.filter((v) => v.status !== "baja");
    if (!vehicles.length) {
      el.innerHTML = blockScreen("No hay ninguna unidad registrada.", "#/operador", "#/operador/mas",
        isBoss() ? `<button class="op-btn-primary" data-go="#/operador/alta">Registrar mi camión</button>` : "");
      wireGo(el); return;
    }
    const v = vehicles.find((x) => x.id === camionVehicleId) || vehicles[0];
    camionVehicleId = v.id;

    const items = (state.maintenance || []).filter((m) => m.vehicle_id === v.id);
    const vTrips = (state.trips || []).filter((t) => t.vehicle_id === v.id && t.status === "cerrado");
    const perf = periodSummary(vTrips);
    const lastDiesel = null;

    const itemRows = items.map((m) => {
      const s = maintenanceStatus(m, v.odometer_km);
      const k = kindOf(m.kind);
      const detail = s.status === "sin_dato" ? "Sin km ni fecha registrados"
        : [s.kmLeft != null ? (s.kmLeft < 0 ? `pasado por ${fmtKm(-s.kmLeft)}` : `faltan ${fmtKm(s.kmLeft)}`) : null,
           s.daysLeft != null ? (s.daysLeft < 0 ? `venció hace ${-s.daysLeft} días` : `${s.daysLeft} días`) : null].filter(Boolean).join(" · ");
      return `
        <div class="op-maint-row ${s.status}">
          <span class="op-exp-icon">${k.icon}</span>
          <div style="flex:1">
            <div class="op-doc-name">${esc(m.label)}</div>
            <div class="op-doc-date">${m.every_km ? `cada ${fmtKm(m.every_km)} · ` : ""}${m.last_km != null ? `último a ${fmtKm(m.last_km)}` : m.last_date ? `último ${fmtDay(m.last_date)}` : "sin registro"}</div>
            <div class="op-doc-date"><b class="${s.status === "vencido" ? "neg" : s.status === "pronto" ? "warn" : ""}">${detail}</b></div>
          </div>
          <button class="op-mini-btn" data-done="${m.id}">Ya se hizo</button>
        </div>`;
    }).join("");

    el.innerHTML = screen(hdr("Mi camión"), `
      ${vehicles.length > 1 ? `<div class="op-chips">${vehicles.map((x) => `<button class="op-chip${x.id === v.id ? " active" : ""}" data-veh="${x.id}">${esc(x.economic_number)}</button>`).join("")}</div>` : ""}
      <div class="op-big-card dark">
        <div class="op-big-label">${esc(v.economic_number)} · ${esc(v.plate)}</div>
        <div class="op-big-num">${v.odometer_km ? fmtKm(v.odometer_km) : "— km"}</div>
        <div class="op-big-sub">Kilometraje actual · <a href="#" id="cm-km" style="color:var(--amarillo)">corregir</a></div>
      </div>
      <div class="op-kpi-row">
        <div class="op-kpi"><span>Rendimiento</span><b>${perf.kmPerLiter != null ? `${perf.kmPerLiter} km/L` : "—"}</b></div>
        <div class="op-kpi"><span>Costo por km</span><b>${perf.costPerKm != null ? `$${perf.costPerKm}` : "—"}</b></div>
        <div class="op-kpi"><span>Viajes cerrados</span><b>${perf.trips}</b></div>
      </div>
      <div class="op-section-label">Mantenimiento</div>
      ${itemRows ? `<div class="op-maint-list">${itemRows}</div>` : `<div class="op-empty" style="padding:16px">Registra tus servicios y te avisamos cuando toque el siguiente.</div>`}
      ${access() ? `
        ${!items.length ? `<button class="op-btn-primary op-gap-sm" id="cm-basics">Agregar los básicos (aceite, filtros, frenos, llantas)</button>` : ""}
        <button class="op-btn-secondary" id="cm-add">+ Agregar servicio</button>
        <div id="cm-form" class="hidden" style="margin-top:14px">
          <label class="op-label">Tipo</label>
          <select id="cm-kind" class="op-input">${MAINT_KINDS.map((k) => `<option value="${k.key}">${k.icon} ${k.label}</option>`).join("")}</select>
          <label class="op-label">Nombre (como tú le dices)</label>
          <input id="cm-label" class="op-input" placeholder="Cambio de aceite">
          <label class="op-label">Cada cuántos km (opcional)</label>
          <input id="cm-every" class="op-input" type="number" inputmode="numeric" placeholder="10000">
          <label class="op-label">Km del último servicio (opcional)</label>
          <input id="cm-last" class="op-input" type="number" inputmode="numeric" placeholder="${v.odometer_km || ""}">
          <label class="op-label">Fecha límite (opcional, ej. verificación)</label>
          <input id="cm-due" class="op-input" type="date">
          <div class="form-msg" id="cm-msg"></div>
          <button class="op-btn-primary" id="cm-save">Guardar</button>
        </div>` : `<div style="margin-top:14px">${accessBanner()}</div>`}
    `, "#/operador/mas");
    wireAccessBanner();

    el.querySelectorAll("[data-veh]").forEach((b) => { b.onclick = () => { camionVehicleId = b.dataset.veh; renderCamion(); }; });
    document.getElementById("cm-km").onclick = async (e) => {
      e.preventDefault();
      const val = num(window.prompt("¿Qué marca el odómetro?", v.odometer_km || ""));
      if (val == null) return;
      const { error } = await sb.from("vehicles").update({ odometer_km: Math.round(val) }).eq("id", v.id);
      if (error) { alert(isBoss() ? error.message : "Solo el dueño puede corregir el kilometraje a mano. Se actualiza solo al cargar diésel o cerrar viaje."); return; }
      renderCamion();
    };
    const kindSel = document.getElementById("cm-kind");
    if (kindSel) kindSel.onchange = () => { const k = kindOf(kindSel.value); document.getElementById("cm-label").value = k.label; if (k.every_km) document.getElementById("cm-every").value = k.every_km; };
    const addBtn = document.getElementById("cm-add");
    if (addBtn) addBtn.onclick = () => { document.getElementById("cm-form").classList.toggle("hidden"); kindSel.onchange(); };
    const basics = document.getElementById("cm-basics");
    if (basics) basics.onclick = async () => {
      basics.disabled = true; basics.textContent = "Agregando…";
      try {
        for (const k of MAINT_KINDS.filter((x) => x.every_km)) {
          await callFn("fleet-save-maintenance", { method: "POST", body: { company_id: state.companyId, vehicle_id: v.id, kind: k.key, label: k.label, every_km: k.every_km, ...(v.odometer_km ? { last_km: v.odometer_km } : {}) } });
        }
        renderCamion();
      } catch (e) { alert(e.message); basics.disabled = false; basics.textContent = "Agregar los básicos"; }
    };
    const save = document.getElementById("cm-save");
    if (save) save.onclick = async () => {
      const msg = document.getElementById("cm-msg");
      const body = { company_id: state.companyId, vehicle_id: v.id, kind: kindSel.value, label: document.getElementById("cm-label").value.trim() };
      const ev = num(document.getElementById("cm-every").value); if (ev) body.every_km = Math.round(ev);
      const lk = num(document.getElementById("cm-last").value); if (lk != null) body.last_km = Math.round(lk);
      const due = document.getElementById("cm-due").value; if (due) body.due_date = due;
      if (body.label.length < 2) { msg.className = "form-msg error"; msg.textContent = "Ponle nombre."; return; }
      msg.className = "form-msg"; msg.textContent = "Guardando…";
      try { await callFn("fleet-save-maintenance", { method: "POST", body }); renderCamion(); }
      catch (e) { msg.className = "form-msg error"; msg.textContent = e.message; }
    };
    el.querySelectorAll("[data-done]").forEach((b) => {
      b.onclick = async () => {
        const m = items.find((x) => x.id === b.dataset.done);
        const kmVal = num(window.prompt(`${m.label}: ¿a cuántos km se hizo?`, v.odometer_km || ""));
        if (kmVal == null && m.every_km) return;
        b.disabled = true;
        const body = { company_id: state.companyId, vehicle_id: v.id, id: m.id, kind: m.kind, label: m.label, last_date: today() };
        if (m.every_km) body.every_km = m.every_km;
        if (kmVal != null) body.last_km = Math.round(kmVal);
        if (m.due_date && !m.every_km) {
          const nd = window.prompt("¿Nueva fecha límite? (AAAA-MM-DD)", ""); if (nd) body.due_date = nd;
        }
        try { await callFn("fleet-save-maintenance", { method: "POST", body }); renderCamion(); }
        catch (e) { alert(e.message); b.disabled = false; }
      };
    });
    void lastDiesel;
  }

  // ═══════════════════════════════════════════════════════════
  //  ME DEBEN (cobranza simple)
  // ═══════════════════════════════════════════════════════════
  async function renderCobranzaOp() {
    setOpMode();
    const el = $el();
    loading("#/operador/mas");
    await loadCompanyData();

    if (!isBoss()) {
      el.innerHTML = blockScreen("La cobranza de los fletes la lleva tu patrón. Tú concéntrate en el viaje y los gastos.", "#/operador", "#/operador/mas");
      return;
    }
    const pending = (state.invoices || []).filter((i) => ["pendiente", "vencida"].includes(i.computed_status));
    const total = pending.reduce((s, i) => s + Number(i.amount), 0);
    const overdue = pending.filter((i) => i.computed_status === "vencida").reduce((s, i) => s + Number(i.amount), 0);
    const clientName = (id) => state.clients.find((c) => c.id === id)?.name || "Cliente";
    const tripParam = new URLSearchParams((location.hash.split("?")[1] || "")).get("trip");
    const tripPre = tripParam ? (state.trips || []).find((t) => t.id === tripParam) : null;

    const rows = pending.map((i) => `
      <div class="op-exp-row ${i.computed_status === "vencida" ? "late" : ""}">
        <div style="flex:1"><div>${esc(clientName(i.client_id))}</div><div class="op-selector-sub">Folio ${esc(i.folio)} · ${i.computed_status === "vencida" ? `<span class="neg">vencida hace ${i.days_overdue} días</span>` : `vence ${fmtDay(i.due_date)}`}</div></div>
        <b>${fmtMXN(i.amount)}</b>
        <button class="op-mini-btn" data-pay="${i.id}">Ya pagó</button>
      </div>`).join("") || `<div class="op-empty" style="padding:16px">Nadie te debe. 👌</div>`;

    el.innerHTML = screen(hdr("Me deben"), `
      <div class="op-big-card ${overdue ? "neg" : ""}">
        <div class="op-big-label">Por cobrar</div>
        <div class="op-big-num">${fmtMXN(total)}</div>
        <div class="op-big-sub">${overdue ? `${fmtMXN(overdue)} ya vencido` : `${pending.length} flete${pending.length === 1 ? "" : "s"} pendiente${pending.length === 1 ? "" : "s"}`}</div>
      </div>
      <div class="op-exp-list">${rows}</div>
      ${access() ? `
      <button class="op-btn-primary" id="cb-add" style="margin-top:16px">+ Flete por cobrar</button>
      <div id="cb-form" class="${tripPre ? "" : "hidden"}" style="margin-top:14px">
        <label class="op-label">Cliente</label>
        ${state.clients.length ? `<div class="op-chips">${state.clients.slice(0, 8).map((c) => `<button class="op-chip" data-cl="${esc(c.name)}">${esc(c.name)}</button>`).join("")}</div>` : ""}
        <input id="cb-client" class="op-input" placeholder="Nombre del cliente" value="${esc(tripPre?.client_name || "")}">
        <label class="op-label">Monto</label>
        <input id="cb-amount" class="op-input" type="number" inputmode="decimal" placeholder="$" value="${tripPre?.freight_amount || ""}">
        <label class="op-label">¿Cuándo te deben pagar?</label>
        <input id="cb-due" class="op-input" type="date" value="${new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)}">
        <label class="op-label">Folio o referencia (opcional)</label>
        <input id="cb-folio" class="op-input" placeholder="${tripPre ? `${tripPre.origin}-${tripPre.destination}` : "F-001"}">
        <div class="form-msg" id="cb-msg"></div>
        <button class="op-btn-primary" id="cb-save">Guardar y programar recordatorios</button>
        <p class="op-hint">Si el cliente tiene teléfono registrado, le mandamos recordatorio 3 días antes y cuando se pase.</p>
      </div>
      <p style="text-align:center;margin-top:16px"><a href="#/cobranza">Cobranza completa (facturas, clientes) →</a></p>` : `<div style="margin-top:14px">${accessBanner()}</div>`}
    `, "#/operador/mas");
    wireAccessBanner();

    const add = document.getElementById("cb-add");
    if (add) add.onclick = () => document.getElementById("cb-form").classList.toggle("hidden");
    el.querySelectorAll("[data-cl]").forEach((b) => { b.onclick = () => { document.getElementById("cb-client").value = b.dataset.cl; }; });
    el.querySelectorAll("[data-pay]").forEach((b) => {
      b.onclick = async () => {
        if (!confirm("¿Marcar como pagada?")) return;
        b.disabled = true;
        try { await callFn("fleet-register-payment", { method: "POST", body: { invoice_id: b.dataset.pay } }); renderCobranzaOp(); }
        catch (e) { alert(e.message); b.disabled = false; }
      };
    });
    const save = document.getElementById("cb-save");
    if (save) save.onclick = async () => {
      const msg = document.getElementById("cb-msg");
      const name = document.getElementById("cb-client").value.trim();
      const amount = num(document.getElementById("cb-amount").value);
      const due = document.getElementById("cb-due").value;
      let folio = document.getElementById("cb-folio").value.trim();
      if (name.length < 2) { msg.className = "form-msg error"; msg.textContent = "Escribe el cliente."; return; }
      if (!amount || amount <= 0) { msg.className = "form-msg error"; msg.textContent = "Escribe el monto."; return; }
      if (!due) { msg.className = "form-msg error"; msg.textContent = "Pon la fecha de pago."; return; }
      if (!folio) folio = `F-${Date.now().toString().slice(-6)}`;
      msg.className = "form-msg"; msg.textContent = "Guardando…";
      try {
        let client = state.clients.find((c) => c.name.toLowerCase() === name.toLowerCase());
        if (!client) {
          const r = await callFn("fleet-create-client", { method: "POST", body: { company_id: state.companyId, name } });
          client = r.client;
        }
        const body = { company_id: state.companyId, client_id: client.id, folio, amount, due_date: due };
        if (tripPre) body.trip_id = tripPre.id;
        await callFn("fleet-create-invoice", { method: "POST", body });
        location.hash = "#/operador/cobranza"; renderCobranzaOp();
      } catch (e) { msg.className = "form-msg error"; msg.textContent = e.message; }
    };
  }

  // ═══════════════════════════════════════════════════════════
  //  AUXILIO EN CARRETERA
  // ═══════════════════════════════════════════════════════════
  const STEPS_ACCIDENTE = [
    "Respira. Pon los triángulos y las intermitentes. Primero tu vida, luego el camión.",
    "Si hay heridos: 911. No muevas a nadie si no es indispensable.",
    "No muevas la unidad hasta que llegue la autoridad o el ajustador (si no estorba y no hay riesgo).",
    "Toma fotos de todo: unidades, placas, daños, carga, señalización, calle, huellas.",
    "Llama a tu aseguradora y a tu patrón. Ten a la mano la póliza (Mis papeles).",
    "Pide nombre, placa, licencia y seguro del otro conductor. Foto de sus documentos.",
    "NO firmes nada que no entiendas. NO aceptes la culpa. NO entregues tu licencia original a particulares.",
    "Si te llevan al MP: tienes derecho a un abogado y a no declarar sin él. Plan Protegido: escríbenos."
  ];
  function renderAuxilio() {
    setOpMode();
    const el = $el();
    let contacts = {};
    try { contacts = JSON.parse(localStorage.getItem("op_contacts") || "{}"); } catch {}
    const poliza = (state.complianceDocs || []).find((d) => d.doc_type === "poliza_seguro");

    el.innerHTML = screen(hdr("Auxilio en carretera"), `
      <div class="op-call-grid">
        ${HELP_NUMBERS.map((n) => `<a class="op-call" href="tel:${n.tel}"><span class="op-call-icon">${n.icon}</span><b>${n.tel}</b><span>${n.label}</span><small>${n.sub}</small></a>`).join("")}
        <a class="op-call mine" href="${contacts.seguro ? `tel:${contacts.seguro}` : "#"}" id="ax-seguro"><span class="op-call-icon">🛡️</span><b>${contacts.seguro ? esc(contacts.seguro) : "Agregar"}</b><span>Mi aseguradora</span><small>${poliza ? `Póliza vence ${fmtDay(poliza.expires_at)}` : "Toca para guardar el número"}</small></a>
        <a class="op-call mine" href="${contacts.patron ? `tel:${contacts.patron}` : "#"}" id="ax-patron"><span class="op-call-icon">📞</span><b>${contacts.patron ? esc(contacts.patron) : "Agregar"}</b><span>${isBoss() ? "Mi base / taller" : "Mi patrón"}</span><small>Toca para ${contacts.patron ? "llamar" : "guardar el número"}</small></a>
      </div>
      <div class="op-section-label" style="margin-top:20px">Si tienes un percance</div>
      <ol class="op-steps">${STEPS_ACCIDENTE.map((s) => `<li>${s}</li>`).join("")}</ol>
      ${isProtegido() ? `<button class="op-btn-primary" id="ax-legal">⚖️ Hablar con el abogado (incluido)</button>`
        : `<div class="op-alert-box">Con el plan <b>Protegido</b> tienes abogado por WhatsApp para percances, retenes y laboral. <a href="#/perfil">Ver planes</a></div>`}
      <p class="op-hint">Esta pantalla funciona sin internet. Guárdala en tu pantalla de inicio.</p>
    `, "#/operador/mas");

    const saveContact = (key, label) => (e) => {
      if (contacts[key]) return; // ya tiene número: el href llama
      e.preventDefault();
      const t = window.prompt(`Teléfono de ${label}:`, "");
      if (!t) return;
      contacts[key] = t.replace(/[^\d+]/g, "");
      try { localStorage.setItem("op_contacts", JSON.stringify(contacts)); } catch {}
      renderAuxilio();
    };
    document.getElementById("ax-seguro").onclick = saveContact("seguro", "tu aseguradora");
    document.getElementById("ax-patron").onclick = saveContact("patron", isBoss() ? "tu base o taller" : "tu patrón");
    document.getElementById("ax-seguro").oncontextmenu = (e) => { e.preventDefault(); delete contacts.seguro; localStorage.setItem("op_contacts", JSON.stringify(contacts)); renderAuxilio(); };
    const legal = document.getElementById("ax-legal");
    if (legal) legal.onclick = () => window.open(`https://wa.me/${CONFIG.LEGAL_WA || ""}?text=${encodeURIComponent("Hola, soy operador con plan Protegido de OperadorPro y tuve un percance. Necesito asesoría legal.")}`, "_blank");
  }

  // ═══════════════════════════════════════════════════════════
  //  MÁS (menú)
  // ═══════════════════════════════════════════════════════════
  function renderMas() {
    setOpMode();
    const el = $el();
    const item = (href, icon, label, sub) => `
      <a class="op-selector-item" href="${href}" style="text-decoration:none">
        <span class="op-selector-emoji">${icon}</span>
        <div class="op-selector-text"><div>${label}</div>${sub ? `<div class="op-selector-sub">${sub}</div>` : ""}</div>
        <span class="op-selector-arrow">›</span>
      </a>`;
    const boss = isBoss();
    el.innerHTML = screen(hdr("Más"), `
      <div class="op-selector-list">
        ${item("#/operador/papeles", "📄", "Mis papeles", "Licencia, examen, tarjeta, seguro")}
        ${item("#/operador/camion", "🔧", "Mi camión", "Kilometraje y mantenimiento")}
        ${item("#/operador/cobranza", "🧾", "Me deben", "Fletes por cobrar")}
        ${item("#/operador/inspeccion", "🔍", "Inspección pre-viaje", "Checklist NOM-068 con fotos")}
        ${item("#/operador/cursos", "🎓", "Mis cursos y certificados", "Carta Porte, NOM-087, accidente…")}
        ${item("#/operador/auxilio", "🆘", "Auxilio en carretera", "Teléfonos y qué hacer")}
        ${item("#/operador/perfil", "👤", "Mi perfil", state.profile?.full_name || "")}
      </div>
      ${boss ? `<div class="op-section-label" style="margin-top:20px">Soy el patrón</div>
      <div class="op-selector-list">
        ${item("#/operador/codigo", "🔑", "Código de patrón", "Para que tus choferes entren solos")}
        ${item("#/flota", "🏢", "Panel de flota", "Unidades, choferes, documentos")}
        ${item("flotero.html", "📈", "Dashboard de flota", "Costos y rendimiento por unidad")}
        ${item("#/cobranza", "💼", "Cobranza completa", "Clientes y facturas")}
      </div>` : `<div class="op-section-label" style="margin-top:20px">Empresa</div>
      <div class="op-selector-list">
        ${item("#/operador/unirme", "🔑", "Entrar con otro código de patrón", state.company?.name ? `Ahora: ${esc(state.company.name)}` : "")}
      </div>`}
      ${state.companies.length > 1 ? `<div class="op-section-label" style="margin-top:20px">Cambiar de empresa</div>
      <div class="op-chips">${state.companies.map((c) => `<button class="op-chip${c.id === state.companyId ? " active" : ""}" data-co="${c.id}">${esc(c.name)}</button>`).join("")}</div>` : ""}
      <button class="op-btn-secondary" id="op-logout" style="margin-top:24px">Cerrar sesión</button>
      <p class="op-hint">OperadorPro · ${access() ? "plan activo" : "sin plan activo"} · <a href="#/perfil">administrar suscripción</a></p>
    `, "#/operador/mas");
    el.querySelectorAll("[data-co]").forEach((b) => {
      b.onclick = async () => {
        state.companyId = b.dataset.co; state.company = null;
        try { localStorage.setItem("op_company_id", b.dataset.co); } catch {}
        location.hash = "#/operador";
      };
    });
    document.getElementById("op-logout").onclick = () => document.getElementById("logout-link").click();
  }

  // ═══════════════════════════════════════════════════════════
  //  INSPECCIÓN (checklist NOM-068) — sin cambios de fondo
  // ═══════════════════════════════════════════════════════════
  async function renderInspeccion() {
    setOpMode();
    const el = $el();
    loading("#/operador/mas");

    await loadCompanyData();
    const driver = await myDriver();
    if (!driver) { el.innerHTML = blockScreen("Para inspeccionar necesitas estar registrado como chofer.", "#/operador", "#/operador/mas"); return; }
    if (!access()) { el.innerHTML = screen(hdr("Inspección"), accessBanner(), "#/operador/mas"); wireAccessBanner(); return; }

    const actives = state.vehicles.filter((v) => v.status === "activa");
    if (!actives.length) { el.innerHTML = blockScreen("No hay unidades activas registradas.", "#/operador", "#/operador/mas"); return; }

    const TOTAL = 14;
    const wz = { vehicle_id: actives.length === 1 ? actives[0].id : null, odometer_km: null, checklist: {}, photos: {}, gps: null };
    getGPS().then((g) => { wz.gps = g; });
    const wzScreen = (n, title, body) => screen(wzHdr(title, n, TOTAL), body, "#/operador/mas");

    function showVehicle() {
      if (wz.vehicle_id) return showOdo();
      el.innerHTML = wzScreen(0, "¿Qué unidad?",
        `<div class="op-selector-list">${actives.map((v) => `<button class="op-selector-item" data-vid="${v.id}"><span class="op-selector-emoji">🚛</span><div class="op-selector-text"><div>${esc(v.economic_number)}</div><div class="op-selector-sub">Placas ${esc(v.plate)}</div></div><span class="op-selector-arrow">›</span></button>`).join("")}</div>`);
      document.getElementById("wz-back").onclick = () => { location.hash = "#/operador"; };
      el.querySelectorAll("[data-vid]").forEach((b) => { b.onclick = () => { wz.vehicle_id = b.dataset.vid; showOdo(); }; });
    }

    function showOdo() {
      const v = vehicleOf(wz.vehicle_id);
      el.innerHTML = wzScreen(1, "Odómetro", `
        <div class="op-camera-area" id="odo-tap"><div id="odo-ph"><span class="op-camera-icon">🔢</span><span class="op-camera-label">Foto del odómetro (opcional)</span></div><img id="odo-img" class="op-camera-preview hidden" alt=""></div>
        <input type="file" id="odo-file" accept="image/*" capture="environment" class="hidden">
        <div class="op-city-input-row" style="margin-top:16px">
          <input id="odo-km" class="op-city-input" type="number" inputmode="numeric" placeholder="Kilómetros" value="${wz.odometer_km ?? v?.odometer_km ?? ""}">
          <button class="op-voice-btn" id="voice-odo-km">🎤</button>
        </div>
        <button class="op-btn-primary" id="next-odo-km" style="margin-top:16px">Continuar →</button>`);
      document.getElementById("wz-back").onclick = () => { actives.length === 1 ? (location.hash = "#/operador") : showVehicle(); };
      const odoFile = document.getElementById("odo-file");
      document.getElementById("odo-tap").onclick = () => odoFile.click();
      odoFile.onchange = async () => {
        const file = odoFile.files[0]; if (!file) return;
        const r = new FileReader();
        r.onload = (ev) => { const img = document.getElementById("odo-img"); img.src = ev.target.result; img.classList.remove("hidden"); document.getElementById("odo-ph").classList.add("hidden"); document.getElementById("odo-tap").classList.add("has-image"); };
        r.readAsDataURL(file);
        try { wz.photos.odometro = await uploadToBucket("inspections", file); } catch (e) { console.error("Odo photo upload:", e); }
      };
      document.getElementById("voice-odo-km").onclick = () => dictate("Di los kilómetros del odómetro", (t) => { const n = num(t); if (n != null) document.getElementById("odo-km").value = Math.round(n); });
      document.getElementById("next-odo-km").onclick = () => {
        const n = num(document.getElementById("odo-km").value);
        if (n == null || n < 0) { alert("Ingresa el odómetro"); return; }
        wz.odometer_km = Math.round(n); showChecklist(0);
      };
    }

    function showChecklist(idx) {
      const item = CHECKLIST[idx];
      const cur = wz.checklist[item.key] || {};
      el.innerHTML = wzScreen(2 + idx, item.label, `
        <div class="op-check-item">
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
        <button class="op-btn-primary" id="next-chk" style="margin-top:12px">Continuar →</button>`);
      document.getElementById("wz-back").onclick = () => { idx === 0 ? showOdo() : showChecklist(idx - 1); };
      const pick = (ok) => {
        wz.checklist[item.key] = { ok, notes: wz.checklist[item.key]?.notes || "" };
        document.getElementById("chk-ok").classList.toggle("selected", ok);
        document.getElementById("chk-fail").classList.toggle("selected", !ok);
        document.getElementById("notes-area").classList.toggle("hidden", ok);
        if (ok) setTimeout(() => document.getElementById("next-chk")?.click(), 150);
      };
      document.getElementById("chk-ok").onclick = () => pick(true);
      document.getElementById("chk-fail").onclick = () => pick(false);
      document.getElementById("next-chk").onclick = () => {
        if (wz.checklist[item.key] === undefined) { alert("Selecciona si está bien o falla"); return; }
        const notes = document.getElementById("chk-notes")?.value?.trim();
        if (notes && wz.checklist[item.key].ok === false) wz.checklist[item.key].notes = notes;
        idx < CHECKLIST.length - 1 ? showChecklist(idx + 1) : showPhotos();
      };
    }

    function showPhotos() {
      el.innerHTML = wzScreen(12, "Fotos de la unidad", `
        <p class="op-lead">Toca cada cuadro para tomar la foto.</p>
        <div class="op-photo-grid">${PHOTO_TYPES.map((pt) => `
          <div class="op-photo-slot">
            <div class="op-photo-tap" id="ptap-${pt.key}">${wz.photos[pt.key] ? `<img src="${esc(wz.photos[pt.key])}" class="op-photo-thumb" alt=""><span class="op-photo-ok">✅</span>` : `<span class="op-photo-icon">${pt.icon}</span>`}</div>
            <div class="op-photo-label">${pt.label}</div>
            <input type="file" id="pf-${pt.key}" accept="image/*" capture="environment" class="hidden">
          </div>`).join("")}
        </div>
        <div class="form-msg" id="photo-msg"></div>
        <button class="op-btn-primary" id="next-photos" style="margin-top:16px">Continuar →</button>`);
      document.getElementById("wz-back").onclick = () => showChecklist(CHECKLIST.length - 1);
      PHOTO_TYPES.forEach((pt) => {
        document.getElementById(`ptap-${pt.key}`).onclick = () => document.getElementById(`pf-${pt.key}`).click();
        document.getElementById(`pf-${pt.key}`).onchange = async (e) => {
          const file = e.target.files[0]; if (!file) return;
          const msg = document.getElementById("photo-msg");
          msg.textContent = `Subiendo ${pt.label}…`; msg.className = "form-msg";
          try {
            const url = await uploadToBucket("inspections", file);
            wz.photos[pt.key] = url;
            document.getElementById(`ptap-${pt.key}`).innerHTML = `<img src="${esc(url)}" class="op-photo-thumb" alt=""><span class="op-photo-ok">✅</span>`;
            msg.textContent = `${pt.label} lista ✅`;
          } catch (err) { msg.textContent = err.message; msg.className = "form-msg error"; }
        };
      });
      document.getElementById("next-photos").onclick = () => {
        const missing = PHOTO_TYPES.filter((pt) => !wz.photos[pt.key]).map((pt) => pt.label);
        if (missing.length) { const msg = document.getElementById("photo-msg"); msg.textContent = `Faltan fotos: ${missing.join(", ")}`; msg.className = "form-msg error"; return; }
        showConfirm();
      };
    }

    function showConfirm() {
      const vehicle = vehicleOf(wz.vehicle_id);
      const fails = CHECKLIST.filter((c) => wz.checklist[c.key]?.ok === false);
      el.innerHTML = wzScreen(13, "Confirmar inspección", `
        <div class="op-confirm-card">
          <div class="op-confirm-row"><span class="op-confirm-label">Unidad</span><span class="op-confirm-value">${esc(vehicle?.economic_number || "—")}</span></div>
          <div class="op-confirm-row"><span class="op-confirm-label">Odómetro</span><span class="op-confirm-value">${fmtKm(wz.odometer_km)}</span></div>
          <div class="op-confirm-row"><span class="op-confirm-label">Fotos</span><span class="op-confirm-value">${Object.keys(wz.photos).length}/5 ✅</span></div>
          <div class="op-confirm-row" style="${fails.length ? "color:var(--rojo)" : ""}"><span class="op-confirm-label">Fallas</span><span class="op-confirm-value">${fails.length ? fails.map((f) => f.label).join(", ") : "Ninguna ✅"}</span></div>
        </div>
        <div class="form-msg" id="wz-msg"></div>
        <button class="op-btn-primary" id="wz-submit">🔍 Enviar inspección</button>`);
      document.getElementById("wz-back").onclick = showPhotos;
      document.getElementById("wz-submit").onclick = async () => {
        const msg = document.getElementById("wz-msg");
        msg.textContent = "Enviando…"; msg.className = "form-msg";
        try {
          const photos = Object.entries(wz.photos).map(([photo_type, url]) => ({ photo_type, url, ...(wz.gps ? { gps_lat: wz.gps.lat, gps_lng: wz.gps.lng } : {}) }));
          const checklist = CHECKLIST.map((c) => ({ item_key: c.key, ok: wz.checklist[c.key]?.ok ?? true, ...(wz.checklist[c.key]?.notes ? { notes: wz.checklist[c.key].notes } : {}) }));
          const { inspection } = await callFn("fleet-submit-inspection", {
            method: "POST",
            body: { company_id: state.companyId, vehicle_id: wz.vehicle_id, driver_id: driver.id, odometer_km: wz.odometer_km, ...(wz.gps ? { gps_lat: wz.gps.lat, gps_lng: wz.gps.lng } : {}), photos, checklist }
          });
          if (inspection?.status === "rechazada") alert("⚠️ Inspección RECHAZADA: hay una falla crítica. No salgas hasta atenderla.");
          location.hash = "#/operador";
        } catch (e) { msg.textContent = e.message; msg.className = "form-msg error"; }
      };
    }

    showVehicle();
  }

  // ═══════════════════════════════════════════════════════════
  //  CURSOS
  // ═══════════════════════════════════════════════════════════
  async function renderCursos() {
    setOpMode();
    const el = $el();
    const allCourses = window.COURSES || [];
    const progress = state.progress || [];
    const certs = state.certificates || [];
    if (!allCourses.length) { el.innerHTML = blockScreen("No hay cursos disponibles.", "#/operador", "#/operador/mas"); return; }

    const items = allCourses.map((c) => {
      const done = progress.filter((p) => p.course_id === c.id).length;
      const total = (c.lessons || []).length;
      const pct = total > 0 ? Math.round((done / total) * 100) : 0;
      const cert = certs.find((x) => x.course_id === c.id);
      const sub = cert ? "✅ Certificado obtenido" : pct > 0 ? `${pct}% · ${done}/${total} lecciones` : "Sin comenzar";
      return `<button class="op-selector-item" data-go="#/curso/${esc(c.id)}"><div class="op-selector-text"><div>${esc(c.title)}</div><div class="op-selector-sub">${sub}</div></div>${cert ? `<span style="font-size:22px">🎓</span>` : `<span class="op-selector-arrow">›</span>`}</button>`;
    }).join("");

    el.innerHTML = screen(hdr("Mis cursos"), `
      <p class="op-lead">Lecciones cortas para leer en la espera de carga. Apruebas el examen y sale tu certificado con folio verificable.</p>
      <div class="op-selector-list">${items}</div>
      <p style="text-align:center;margin-top:16px"><a href="#/certificados" style="color:var(--verde);font-weight:600">Ver mis certificados →</a></p>
      ${!isSubscribed() ? `<div style="margin-top:14px">${accessBanner() || `<div class="op-alert-box">Los cursos completos y el certificado van con tu propio plan (el de tu patrón cubre la operación, no la certificación). <a href="#/dashboard">Ver planes</a></div>`}</div>` : ""}
    `, "#/operador/mas");
    wireGo(el); wireAccessBanner();
  }

  // ═══════════════════════════════════════════════════════════
  //  PERFIL (resumen)
  // ═══════════════════════════════════════════════════════════
  async function renderPerfilOperador() {
    setOpMode();
    const el = $el();
    loading("#/operador/mas");
    await loadCompanyData();
    const driver = await myDriver();
    const p = state.profile || {};
    const certs = state.certificates || [];
    const planLabel = { esencial: "Esencial", protegido: "Protegido ⚖️" }[p.plan] || "—";

    el.innerHTML = screen(hdr("Mi perfil"), `
      <div class="op-confirm-card">
        <div class="op-confirm-row"><span class="op-confirm-label">Nombre</span><span class="op-confirm-value">${esc(driver?.full_name || p.full_name || "—")}</span></div>
        <div class="op-confirm-row"><span class="op-confirm-label">Celular</span><span class="op-confirm-value">${esc(driver?.phone || p.phone || "—")}</span></div>
        <div class="op-confirm-row"><span class="op-confirm-label">Empresa</span><span class="op-confirm-value">${esc(state.company?.name || "—")}</span></div>
        <div class="op-confirm-row"><span class="op-confirm-label">Soy</span><span class="op-confirm-value">${isBoss() ? (driver ? "Dueño y chofer" : "Dueño / patrón") : "Chofer"}</span></div>
        <div class="op-confirm-row"><span class="op-confirm-label">Mi plan</span><span class="op-confirm-value">${isSubscribed() ? `${planLabel} ✓` : access() ? "Cubierto por mi patrón" : "Sin plan"}</span></div>
        <div class="op-confirm-row"><span class="op-confirm-label">Certificados</span><span class="op-confirm-value">${certs.length}</span></div>
      </div>
      <button class="op-btn-primary op-gap-sm" data-go="#/perfil">⚙️ Editar datos y suscripción</button>
      <button class="op-btn-secondary op-gap-sm" data-go="#/operador/papeles">📄 Mis papeles</button>
      <button class="op-btn-secondary" data-go="#/operador/cursos">🎓 Mis cursos y certificados</button>
    `, "#/operador/mas");
    wireGo(el);
  }

  // ── API pública para panel.js ────────────────────────────────
  window.OperadorUI = {
    renderHome, renderAlta, renderUnirme, renderCodigo,
    renderViaje, renderCerrar, renderGasto,
    renderCuentas, renderCuentasDetalle,
    renderPapeles, renderCamion, renderCobranza: renderCobranzaOp,
    renderAuxilio, renderMas, renderInspeccion, renderCursos,
    renderPerfil: renderPerfilOperador,
    renderEstado: renderPapeles,
    clearOpMode
  };
})();
