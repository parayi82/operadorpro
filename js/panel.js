// ============================================================
// OperadorPro — Panel unificado (SPA con rutas #). Un solo login da
// acceso a TODO: cursos de certificación y gestión de flota, sea el
// usuario un chofer, un "hombre-camión" dueño de su unidad, o una
// empresa con varias — sin distinción de persona física o moral.
//
// Fusiona lo que antes eran dos apps separadas (app.html + fleet.html)
// en un solo cliente, estado y router — "un acceso, no dos".
// ============================================================

const sb = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
const FN = (name) => `/.netlify/functions/${name}`;

const state = {
  session: null,
  // Certificación
  profile: null,
  progress: [],      // filas de course_progress
  certificates: [],  // certificados del usuario
  examDraft: {},      // respuestas seleccionadas del examen en curso
  // Flota (la empresa se crea sola al registrarse — ver schema_platform.sql)
  companies: [],       // [{id, name, role}]
  companyId: null,
  company: null,       // fila completa de la empresa activa
  vehicles: [],
  drivers: [],
  complianceDocs: [],
  trips: [],
  clients: [],
  invoices: []
};

const $app = document.getElementById("app");

// ---------- Utilidades ----------
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const course = (id) => COURSES.find((c) => c.id === id);
const isSubscribed = () => state.profile?.subscription_status === "active";
const isProtegido = () => isSubscribed() && state.profile?.plan === "protegido";
const daysUntil = (dateStr) => dateStr ? Math.ceil((new Date(dateStr) - new Date()) / 86400000) : null;
const lessonsDone = (courseId) => state.progress.filter((p) => p.course_id === courseId).map((p) => p.lesson_id);
const certFor = (courseId) => state.certificates.find((c) => c.course_id === courseId);
const fmtDate = (d) => new Date(d).toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" });
const fmtMoney = (n) => `$${Number(n || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN`;

function expirationAlerts() {
  const p = state.profile || {};
  const items = [
    { label: "tu licencia federal", days: daysUntil(p.licencia_vigencia) },
    { label: "tu examen psicofísico", days: daysUntil(p.examen_medico_vigencia) }
  ].filter((x) => x.days !== null && x.days <= 60);
  if (!items.length) return "";
  const rows = items.map((x) => x.days < 0
    ? `<strong>${x.label}</strong> está VENCIDA desde hace ${Math.abs(x.days)} días — no puedes operar en regla; renuévala cuanto antes.`
    : `<strong>${x.label}</strong> vence en ${x.days} días — agenda tu renovación ya (los trámites se saturan).`
  ).map((t) => `<p style="margin:4px 0">⚠️ ${t}</p>`).join("");
  return `<div class="locked-banner" style="margin-bottom:22px;background:var(--ambar)">${rows}
    <a href="#/perfil" style="color:#fff">Actualizar fechas en mi perfil →</a></div>`;
}

function setNav(loggedIn) {
  document.getElementById("logout-link").classList.toggle("hidden", !loggedIn);
  document.querySelectorAll("#app-nav a:not(#logout-link)").forEach((a) => a.classList.toggle("hidden", !loggedIn));
  renderCompanySwitcher(loggedIn);
}

// ---------- Selector de empresa (si el usuario pertenece a más de una) ----------
function renderCompanySwitcher(loggedIn) {
  const $sw = document.getElementById("company-switcher");
  if (!loggedIn || state.companies.length <= 1) { $sw.classList.add("hidden"); return; }
  $sw.classList.remove("hidden");
  $sw.innerHTML = state.companies
    .map((c) => `<option value="${c.id}" ${c.id === state.companyId ? "selected" : ""}>${esc(c.name)}</option>`)
    .join("");
  $sw.onchange = () => {
    state.companyId = $sw.value;
    state.company = null;
    router();
  };
}

// ---------- Llamadas a Netlify Functions con JWT del usuario ----------
async function callFn(name, { method = "GET", body, query } = {}) {
  const token = state.session?.access_token;
  const qs = query ? `?${new URLSearchParams(query).toString()}` : "";
  const res = await fetch(FN(name) + qs, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || "Error de red");
  return data;
}

// ---------- Subida de archivos a Storage (buckets privados) ----------
async function uploadToBucket(bucket, file) {
  if (!state.companyId) throw new Error("No hay empresa activa");
  const path = `${state.companyId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
  const { error } = await sb.storage.from(bucket).upload(path, file, { upsert: false });
  if (error) throw error;
  const { data, error: signErr } = await sb.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 365);
  if (signErr) throw signErr;
  return data.signedUrl;
}

// ---------- Carga de datos ----------
async function loadUserData() {
  const uid = state.session.user.id;
  const [{ data: profile }, { data: progress }, { data: certs }] = await Promise.all([
    sb.from("profiles").select("*").eq("id", uid).single(),
    sb.from("course_progress").select("course_id, lesson_id").eq("user_id", uid),
    sb.from("certificates").select("*").eq("user_id", uid)
  ]);
  state.profile = profile;
  state.progress = progress || [];
  state.certificates = certs || [];
}

async function loadMemberships() {
  const { data } = await sb
    .from("company_members")
    .select("role, companies:company_id (id, name)")
    .eq("user_id", state.session.user.id)
    .eq("status", "active");
  state.companies = (data || []).map((m) => ({ id: m.companies.id, name: m.companies.name, role: m.role }));
  if (!state.companyId && state.companies[0]) state.companyId = state.companies[0].id;
}

async function loadCompanyData() {
  if (!state.companyId) return;
  const [{ data: company }, { data: vehicles }, { data: drivers }, { data: trips }, { data: clients }, { data: invoices }] = await Promise.all([
    sb.from("companies").select("id, name, rfc, entity_type, plan, subscription_status").eq("id", state.companyId).single(),
    sb.from("vehicles").select("*").eq("company_id", state.companyId).order("economic_number"),
    sb.from("drivers").select("*").eq("company_id", state.companyId).order("full_name"),
    sb.from("trip_reconciliation_v").select("*").eq("company_id", state.companyId).order("started_at", { ascending: false }),
    sb.from("clients").select("*").eq("company_id", state.companyId).order("name"),
    sb.from("invoice_status_v").select("*").eq("company_id", state.companyId).order("due_date")
  ]);
  state.company = company || null;
  state.vehicles = vehicles || [];
  state.drivers = drivers || [];
  state.trips = trips || [];
  state.clients = clients || [];
  state.invoices = invoices || [];

  // Sin plan activo, el servidor rechaza esta llamada a propósito (Flota
  // requiere suscripción) — no debe tronar la carga del resto de la app
  // (cursos, perfil) para un usuario que apenas se registró y aún no paga.
  if (isSubscribed()) {
    try {
      const { documents } = await callFn("fleet-compliance-dashboard", { query: { company_id: state.companyId } });
      state.complianceDocs = documents || [];
    } catch (e) {
      console.error("loadCompanyData: fleet-compliance-dashboard falló", e);
      state.complianceDocs = [];
    }
  } else {
    state.complianceDocs = [];
  }
}

async function loadAllUserData() {
  await loadUserData();
  await loadMemberships();
  await loadCompanyData();
}

function resetUserState() {
  state.profile = null; state.progress = []; state.certificates = [];
  state.companies = []; state.companyId = null; state.company = null;
  state.vehicles = []; state.drivers = []; state.complianceDocs = [];
  state.trips = []; state.clients = []; state.invoices = [];
}

// ---------- Router ----------
const routes = {
  "": renderDashboard,
  "/dashboard": renderDashboard,
  "/login": renderLogin,
  "/registro": renderRegistro,
  "/pago-confirmado": renderPagoConfirmado,
  "/certificados": renderCertificados,
  "/perfil": renderPerfil,
  "/suscripcion-exito": renderSuscripcionExito,
  "/flota": renderFlota,
  "/viajes": renderViajes,
  "/inspecciones": renderInspecciones,
  "/cobranza": renderCobranza,
  // Interfaz nativa para operadores en campo
  "/operador":            () => window.OperadorUI?.renderHome(),
  "/operador/viaje":      () => window.OperadorUI?.renderViaje(),
  "/operador/gasto":      () => window.OperadorUI?.renderGasto(),
  "/operador/inspeccion": () => window.OperadorUI?.renderInspeccion(),
  "/operador/estado":     () => window.OperadorUI?.renderEstado()
};
const FLEET_ROUTES = ["/flota", "/viajes", "/inspecciones", "/cobranza",
  "/operador", "/operador/viaje", "/operador/gasto", "/operador/inspeccion", "/operador/estado"];

async function router() {
  const hash = location.hash.replace(/^#/, "") || "/dashboard";
  const publicRoutes = ["/login", "/registro", "/pago-confirmado"];
  // Limpiar modo operador al salir de rutas de chofer
  if (!hash.startsWith("/operador")) window.OperadorUI?.clearOpMode();

  if (!state.session && !publicRoutes.includes(hash)) { location.hash = "#/login"; return; }
  if (state.session && publicRoutes.includes(hash)) { location.hash = "#/dashboard"; return; }

  if (state.session && FLEET_ROUTES.includes(hash) && !state.companyId) {
    setNav(true);
    $app.innerHTML = `<div class="form-card"><p class="form-msg error">No encontramos una empresa asociada a tu cuenta. Escríbenos para resolverlo.</p></div>`;
    return;
  }

  const parts = hash.split("/").filter(Boolean);
  if (parts[0] === "curso" && parts[1]) return renderCurso(parts[1]);
  if (parts[0] === "leccion" && parts[1] && parts[2] !== undefined) return renderLeccion(parts[1], parseInt(parts[2], 10));
  if (parts[0] === "examen" && parts[1]) return renderExamen(parts[1]);

  const view = routes[hash] || routes["/" + (parts[0] || "dashboard")] || renderDashboard;
  try {
    await view();
  } catch (e) {
    $app.innerHTML = `<div class="form-card"><p class="form-msg error">${esc(e.message)}</p></div>`;
  }
  window.scrollTo(0, 0);
}

window.addEventListener("hashchange", router);

// ---------- Vistas: Autenticación ----------
function renderLogin() {
  setNav(false);
  $app.innerHTML = `
    <div class="form-card">
      <h2>Entrar a tu cuenta</h2>
      <label for="li-email">Correo electrónico</label>
      <input id="li-email" type="email" autocomplete="email" placeholder="tucorreo@ejemplo.com">
      <label for="li-pass">Contraseña</label>
      <input id="li-pass" type="password" autocomplete="current-password" placeholder="••••••••">
      <div class="form-msg" id="li-msg"></div>
      <button class="btn btn-green btn-block" id="li-btn">Entrar</button>
      <p class="switch-auth">¿Aún no tienes cuenta? <a href="#/registro">Regístrate gratis</a></p>
    </div>`;
  document.getElementById("li-btn").onclick = async () => {
    const msg = document.getElementById("li-msg");
    msg.className = "form-msg"; msg.textContent = "Verificando…";
    const { error } = await sb.auth.signInWithPassword({
      email: document.getElementById("li-email").value.trim(),
      password: document.getElementById("li-pass").value
    });
    if (error) { msg.className = "form-msg error"; msg.textContent = "Correo o contraseña incorrectos."; }
  };
}

function renderRegistro() {
  setNav(false);
  const state_rg = { step: 1, email: "" }; // step 1: email, step 2: code
  $app.innerHTML = `
    <div class="form-card">
      <h2>Crear tu cuenta</h2>
      <p style="color:var(--gris-texto);margin-bottom:14px">Rápido y fácil. Solo necesitamos tu correo.</p>
      <div id="rg-step1">
        <label for="rg-email">Tu correo electrónico</label>
        <input id="rg-email" type="email" autocomplete="email" placeholder="tucorreo@ejemplo.com">
        <div class="form-msg" id="rg-msg"></div>
        <button class="btn btn-primary btn-block" id="rg-btn1">Enviar código</button>
        <p class="switch-auth">¿Ya tienes cuenta? <a href="#/login">Entra aquí</a></p>
      </div>
      <div id="rg-step2" class="hidden">
        <label for="rg-code">Ingresa el código que recibiste en tu correo:</label>
        <input id="rg-code" type="text" placeholder="000000" maxlength="6" style="font-size:24px;text-align:center;letter-spacing:8px">
        <div class="form-msg" id="rg-msg2"></div>
        <button class="btn btn-primary btn-block" id="rg-btn2">Confirmar código</button>
        <p class="switch-auth"><a href="#" id="rg-back" style="color:var(--verde)">← Cambiar correo</a></p>
      </div>
    </div>`;

  document.getElementById("rg-btn1").onclick = async () => {
    const msg = document.getElementById("rg-msg");
    const email = document.getElementById("rg-email").value.trim().toLowerCase();
    if (!email.includes("@")) { msg.className = "form-msg error"; msg.textContent = "Correo no válido."; return; }
    msg.textContent = "Enviando código…";
    const { error } = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    if (error) { msg.className = "form-msg error"; msg.textContent = error.message; return; }
    state_rg.email = email;
    msg.textContent = "Código enviado. Revisa tu correo (y spam).";
    document.getElementById("rg-step1").classList.add("hidden");
    document.getElementById("rg-step2").classList.remove("hidden");
  };

  document.getElementById("rg-btn2").onclick = async () => {
    const msg = document.getElementById("rg-msg2");
    const code = document.getElementById("rg-code").value.trim();
    if (code.length !== 6) { msg.className = "form-msg error"; msg.textContent = "Ingresa el código de 6 dígitos."; return; }
    msg.textContent = "Verificando…";
    const { error } = await sb.auth.verifyOtp({ email: state_rg.email, token: code, type: "email" });
    if (error) { msg.className = "form-msg error"; msg.textContent = error.message; return; }

    // Asegurar que el perfil existe (para OTP signup y alta manual)
    try {
      const session = await sb.auth.getSession();
      if (session.data.session?.access_token) {
        await fetch(FN("ensure-user-profile"), {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.data.session.access_token}` }
        });
      }
    } catch (e) {
      console.error("ensure-user-profile error (no es crítico):", e);
    }

    msg.className = "form-msg ok";
    msg.textContent = "¡Bienvenido! Redirigiendo…";
    setTimeout(() => location.hash = "#/dashboard", 1500);
  };

  document.getElementById("rg-back").onclick = (e) => {
    e.preventDefault();
    document.getElementById("rg-step1").classList.remove("hidden");
    document.getElementById("rg-step2").classList.add("hidden");
  };
}

// ---------- Vista: Pago Confirmado ----------
function renderPagoConfirmado() {
  setNav(false);
  $app.innerHTML = `
    <div class="form-card" style="text-align:center;max-width:500px">
      <div style="font-size:56px;margin-bottom:16px">✓</div>
      <h2>¡Pago confirmado!</h2>
      <p style="color:var(--gris-texto);margin-bottom:24px">Tu suscripción está activa. Tu cuenta se ha creado y estará lista en unos momentos.</p>
      <div class="form-msg ok" style="margin-bottom:24px">
        Revisa tu correo para instrucciones de acceso. Si no ves el email, verifica la bandeja de spam.
      </div>
      <p style="margin-bottom:24px;color:var(--gris-texto);font-size:14px">Estamos preparando tu cuenta. Serás redirigido automáticamente en 5 segundos o puedes hacer click abajo.</p>
      <a href="app.html#/login" class="btn btn-primary btn-block">Ir a la app</a>
      <p style="margin-top:16px;font-size:13px;color:var(--gris-texto)"><a href="index.html">← Volver al inicio</a></p>
    </div>`;

  // Redirigir a login después de 5 segundos
  setTimeout(() => {
    location.href = "app.html#/login";
  }, 5000);
}

// ---------- Vista: Dashboard (cursos) ----------
function renderDashboard() {
  setNav(true);
  const subBanner = isSubscribed() ? "" : `
    <div class="locked-banner" style="margin-bottom:26px">
      <div><strong>Modo gratuito:</strong> puedes leer la primera lección de cada curso. Elige un plan para desbloquear cursos completos, exámenes y certificados:</div>
      <div style="display:flex;gap:12px;flex-wrap:wrap">
        <button class="btn btn-primary" data-plan="esencial">Esencial · ${esc(CONFIG.PLANES.esencial.precio)}</button>
        <button class="btn btn-green" data-plan="protegido" style="border:2px solid var(--amarillo)">Protegido · ${esc(CONFIG.PLANES.protegido.precio)} — incluye asesoría legal</button>
      </div>
    </div>`;

  const waCard = isProtegido() ? `
    <div class="card" style="margin-bottom:26px;background:var(--verde);color:#fff">
      <span class="badge" style="background:var(--amarillo);color:var(--asfalto)">⚖️</span>
      <h3 style="color:#fff">Asesoría legal incluida</h3>
      <p style="color:#E4EFE9">Consulta laboral, de tránsito o de percances con un abogado real. Respuesta en menos de 24 horas hábiles. Hasta 3 consultas al mes incluidas en tu plan.</p>
      <button class="btn btn-primary" id="btn-legal-contact">Contactar abogado →</button>
    </div>` : isSubscribed() ? `
    <div class="locked-banner" style="margin-bottom:26px">
      <div>⚖️ <strong>Asesoría legal:</strong> el plan Protegido incluye consultas con un abogado real (laboral, tránsito, percances). Cambia de plan desde <a href="#/perfil" style="color:var(--amarillo)">tu perfil</a> → Administrar suscripción.</div>
    </div>` : "";

  const fleetCard = `
    <div class="card" style="margin-bottom:26px;background:var(--asfalto);color:#fff">
      <span class="badge" style="background:var(--amarillo);color:var(--asfalto)">🚛</span>
      <h3 style="color:#fff">¿Eres dueño de tu unidad o de una flota?</h3>
      <p style="color:#C9CDD3">Con esta misma cuenta ya tienes acceso al panel de flota: cumplimiento documental, viáticos, inspección pre-viaje y cobranza.</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <a class="btn btn-primary" href="#/flota">Panel de flota →</a>
        <a class="btn" href="#/operador" style="background:var(--verde);color:#fff">App de operador →</a>
      </div>
    </div>`;

  const cards = COURSES.map((c) => {
    const done = lessonsDone(c.id).length;
    const pct = Math.round((done / c.lessons.length) * 100);
    const cert = certFor(c.id);
    const cta = cert
      ? `<a class="btn btn-green" href="#/certificados">Certificado ✓</a>`
      : done === c.lessons.length
        ? `<a class="btn btn-primary" href="#/examen/${c.id}">Presentar examen</a>`
        : `<a class="btn btn-green" href="#/curso/${c.id}">${done ? "Continuar" : "Empezar"}</a>`;
    return `
      <div class="card">
        <span class="badge" style="background:${c.color}">${esc(c.badge)}</span>
        <h3>${esc(c.title)}</h3>
        <p>${esc(c.desc)}</p>
        <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
        <div class="meta"><span>${done}/${c.lessons.length} lecciones · ${esc(c.duracion)}</span>${cta}</div>
      </div>`;
  }).join("");

  $app.innerHTML = `
    <h1 class="view-title">📚 Cursos de certificación</h1>
    <p class="view-sub">Hola, ${esc((state.profile?.full_name || "operador").split(" ")[0])} — completa los cursos y obtén certificados verificables.</p>
    ${expirationAlerts()}
    ${subBanner}
    <div class="grid grid-3">${cards}</div>
    ${waCard}
    ${fleetCard}`;

  $app.querySelectorAll("[data-plan]").forEach((b) => (b.onclick = () => startCheckout(b.dataset.plan)));

  const legalBtn = document.getElementById("btn-legal-contact");
  if (legalBtn) {
    legalBtn.onclick = () => {
      const txt = encodeURIComponent("Hola, soy operador con plan Protegido de OperadorPro y necesito asesoría legal.");
      window.open(`https://wa.me/${CONFIG.LEGAL_WA || ""}?text=${txt}`, "_blank");
    };
  }
}

// ---------- Vista: Curso ----------
function renderCurso(courseId) {
  const c = course(courseId);
  if (!c) { location.hash = "#/dashboard"; return; }
  setNav(true);
  const done = lessonsDone(courseId);

  const list = c.lessons.map((l, i) => {
    const locked = !isSubscribed() && i > 0;
    const check = done.includes(l.id) ? "✓ " : "";
    const label = locked ? `🔒 ${esc(l.title)}` : `${check}${esc(l.title)}`;
    const action = locked
      ? `<button class="btn btn-primary" data-locked style="font-size:15px;padding:8px 16px">Desbloquear</button>`
      : `<a class="btn btn-green" style="font-size:15px;padding:8px 16px" href="#/leccion/${c.id}/${i}">${done.includes(l.id) ? "Repasar" : "Leer"}</a>`;
    return `<div class="cert-row"><div class="info"><h4>Lección ${i + 1}</h4><p>${label}</p></div>${action}</div>`;
  }).join("");

  const examReady = done.length === c.lessons.length;
  $app.innerHTML = `
    <a href="#/dashboard" style="font-size:14px">← Todos los cursos</a>
    <h1 class="view-title" style="margin-top:10px">${esc(c.title)}</h1>
    <p class="view-sub">${esc(c.desc)}</p>
    ${list}
    <div style="margin-top:26px">
      ${examReady
        ? `<a class="btn btn-primary" href="#/examen/${c.id}">Presentar examen (10 reactivos, aprueba con ${PASSING_SCORE})</a>`
        : `<p style="color:var(--gris-texto)">Completa las ${c.lessons.length} lecciones para desbloquear el examen.</p>`}
    </div>`;

  $app.querySelectorAll("[data-locked]").forEach((b) => (b.onclick = () => { location.hash = "#/dashboard"; }));
}

// ---------- Vista: Lección ----------
async function renderLeccion(courseId, idx) {
  const c = course(courseId);
  const l = c?.lessons[idx];
  if (!l) { location.hash = "#/dashboard"; return; }
  if (!isSubscribed() && idx > 0) { location.hash = "#/curso/" + courseId; return; }
  setNav(true);

  const isLast = idx === c.lessons.length - 1;
  $app.innerHTML = `
    <a href="#/curso/${c.id}" style="font-size:14px">← ${esc(c.title)}</a>
    <div class="lesson-body" style="margin-top:14px">
      <p style="font-family:var(--font-display);text-transform:uppercase;letter-spacing:.12em;color:${c.color};font-size:15px;margin-bottom:6px">Lección ${idx + 1} de ${c.lessons.length}</p>
      <h1>${esc(l.title)}</h1>
      ${l.html}
    </div>
    <div class="lesson-nav">
      ${idx > 0 ? `<a class="btn btn-ghost" style="color:var(--asfalto);border-color:#B9BEC6" href="#/leccion/${c.id}/${idx - 1}">← Anterior</a>` : "<span></span>"}
      <button class="btn btn-green" id="next-btn">${isLast ? "Terminar curso →" : "Siguiente lección →"}</button>
    </div>`;

  document.getElementById("next-btn").onclick = async () => {
    await sb.from("course_progress").upsert(
      { user_id: state.session.user.id, course_id: c.id, lesson_id: l.id },
      { onConflict: "user_id,course_id,lesson_id" }
    );
    if (!state.progress.some((p) => p.course_id === c.id && p.lesson_id === l.id)) {
      state.progress.push({ course_id: c.id, lesson_id: l.id });
    }
    location.hash = isLast ? "#/curso/" + c.id : `#/leccion/${c.id}/${idx + 1}`;
  };
  window.scrollTo(0, 0);
}

// ---------- Vista: Examen ----------
function renderExamen(courseId) {
  const c = course(courseId);
  if (!c) { location.hash = "#/dashboard"; return; }
  if (!isSubscribed()) { location.hash = "#/curso/" + courseId; return; }
  if (lessonsDone(courseId).length < c.lessons.length) { location.hash = "#/curso/" + courseId; return; }
  setNav(true);
  state.examDraft = {};

  const qs = c.quiz.map((item, qi) => `
    <div class="question-card">
      <h4>${qi + 1}. ${esc(item.q)}</h4>
      ${item.options.map((op, oi) => `
        <label class="option" data-q="${qi}" data-o="${oi}">
          <input type="radio" name="q${qi}" value="${oi}"> ${esc(op)}
        </label>`).join("")}
    </div>`).join("");

  $app.innerHTML = `
    <a href="#/curso/${c.id}" style="font-size:14px">← ${esc(c.title)}</a>
    <h1 class="view-title" style="margin-top:10px">Examen: ${esc(c.title)}</h1>
    <p class="view-sub">10 reactivos. Necesitas ${PASSING_SCORE} aciertos. Puedes intentarlo las veces que necesites.</p>
    ${qs}
    <div class="form-msg error" id="ex-msg" style="text-align:center"></div>
    <button class="btn btn-primary btn-block" id="ex-submit" style="margin-top:10px">Calificar examen</button>`;

  $app.querySelectorAll(".option").forEach((lbl) => {
    lbl.addEventListener("click", () => {
      const q = lbl.dataset.q;
      state.examDraft[q] = parseInt(lbl.dataset.o, 10);
      $app.querySelectorAll(`.option[data-q="${q}"]`).forEach((x) => x.classList.remove("selected"));
      lbl.classList.add("selected");
    });
  });

  document.getElementById("ex-submit").onclick = () => gradeExam(c);
}

async function gradeExam(c) {
  const msg = document.getElementById("ex-msg");
  if (Object.keys(state.examDraft).length < c.quiz.length) {
    msg.textContent = "Te faltan reactivos por contestar.";
    return;
  }
  let score = 0;
  const answers = [];
  c.quiz.forEach((item, qi) => {
    const a = state.examDraft[qi];
    answers.push(a);
    if (a === item.correct) score++;
  });
  const passed = score >= PASSING_SCORE;

  await sb.from("exam_attempts").insert({
    user_id: state.session.user.id,
    course_id: c.id, score, total: c.quiz.length, passed, answers
  });

  if (!passed) {
    $app.innerHTML = `
      <div class="result-banner fail">
        <div class="score">${score}/${c.quiz.length}</div>
        <p>Todavía no. Necesitas ${PASSING_SCORE} aciertos — repasa las lecciones y vuelve a intentarlo, sin límite de intentos.</p>
      </div>
      <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center">
        <a class="btn btn-green" href="#/curso/${c.id}">Repasar lecciones</a>
        <a class="btn btn-primary" href="#/examen/${c.id}" onclick="setTimeout(()=>location.reload(),50)">Intentar de nuevo</a>
      </div>`;
    window.scrollTo(0, 0);
    return;
  }

  // Aprobado: emitir certificado desde el servidor
  $app.innerHTML = `
    <div class="result-banner pass">
      <div class="score">${score}/${c.quiz.length}</div>
      <p>¡Aprobado! Emitiendo tu certificado…</p>
    </div>`;
  window.scrollTo(0, 0);

  try {
    const res = await fetch("/.netlify/functions/issue-certificate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + state.session.access_token
      },
      body: JSON.stringify({ course_id: c.id })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "No se pudo emitir el certificado");

    if (!certFor(c.id)) state.certificates.push(data.certificate);
    $app.innerHTML = `
      <div class="result-banner pass">
        <div class="score">${score}/${c.quiz.length}</div>
        <p>¡Aprobado! Tu certificado quedó emitido con folio:</p>
        <div class="plate" style="margin-top:14px;background:var(--blanco)">${esc(data.certificate.folio)}</div>
      </div>
      <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center">
        <button class="btn btn-primary" id="dl-cert">Descargar PDF</button>
        <a class="btn btn-green" href="#/dashboard">Siguiente curso</a>
      </div>`;
    document.getElementById("dl-cert").onclick = () => downloadCertificatePDF(data.certificate);
  } catch (e) {
    $app.innerHTML += `<p class="form-msg error" style="text-align:center">${esc(e.message)}. Tu examen aprobado quedó guardado; intenta emitir el certificado desde la sección Certificados.</p>`;
  }
}

// ---------- Vista: Certificados ----------
function renderCertificados() {
  setNav(true);
  const rows = state.certificates.length
    ? state.certificates.map((cert) => `
        <div class="cert-row">
          <div class="info">
            <h4>${esc(cert.course_title)}</h4>
            <p>Folio <strong>${esc(cert.folio)}</strong> · Emitido: ${fmtDate(cert.issued_at)} · Vigente hasta: ${fmtDate(cert.valid_until)}</p>
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            <button class="btn btn-primary" style="font-size:15px;padding:8px 16px" data-folio="${esc(cert.folio)}">Descargar PDF</button>
            <a class="btn btn-ghost" style="font-size:15px;padding:8px 16px;color:var(--asfalto);border-color:#B9BEC6" target="_blank" href="verificar.html?folio=${encodeURIComponent(cert.folio)}">Ver verificación</a>
          </div>
        </div>`).join("")
    : `<div class="card"><p>Aún no tienes certificados. Completa un curso y aprueba su examen para emitir el primero.</p></div>`;

  $app.innerHTML = `
    <h1 class="view-title">Tus certificados</h1>
    <p class="view-sub">Cada folio es verificable públicamente: compártelo con reclutadores o imprímelo con su QR.</p>
    ${rows}`;

  $app.querySelectorAll("[data-folio]").forEach((b) => {
    b.onclick = () => {
      const cert = state.certificates.find((x) => x.folio === b.dataset.folio);
      if (cert) downloadCertificatePDF(cert);
    };
  });
}

// ---------- Vista: Perfil ----------
function renderPerfil() {
  setNav(true);
  const p = state.profile || {};
  const subLabel = { active: "Activa ✓", inactive: "Sin activar", past_due: "Pago pendiente", canceled: "Cancelada" }[p.subscription_status] || p.subscription_status;
  const planLabel = { esencial: "Esencial", protegido: "Protegido ⚖️", none: "—" }[p.plan] || p.plan;

  $app.innerHTML = `
    <h1 class="view-title">Tu perfil de operador</h1>
    <p class="view-sub">Estos datos aparecen en tus certificados y en tu expediente profesional.<br>
    Suscripción de certificación: <strong>${esc(subLabel)}</strong> · Plan: <strong>${esc(planLabel)}</strong>
    ${isSubscribed() ? ` — <a href="#" id="perfil-portal">Administrar suscripción</a>` : ` — <a href="#/dashboard" >elegir un plan</a>`}</p>
    <div class="lesson-body">
      <div class="profile-grid">
        <div>
          <label for="pf-name">Nombre completo</label>
          <input id="pf-name" value="${esc(p.full_name)}">
        </div>
        <div>
          <label for="pf-phone">Teléfono</label>
          <input id="pf-phone" value="${esc(p.phone || "")}" placeholder="10 dígitos">
        </div>
        <div>
          <label for="pf-curp">CURP</label>
          <input id="pf-curp" value="${esc(p.curp || "")}" maxlength="18" style="text-transform:uppercase">
        </div>
        <div>
          <label for="pf-lic">Número de licencia federal</label>
          <input id="pf-lic" value="${esc(p.licencia_numero || "")}">
        </div>
        <div>
          <label for="pf-cat">Categoría de licencia</label>
          <select id="pf-cat">
            ${["", "A", "B", "C", "D", "E", "F"].map((x) => `<option value="${x}" ${p.licencia_categoria === x ? "selected" : ""}>${x || "Selecciona…"}</option>`).join("")}
          </select>
        </div>
        <div>
          <label for="pf-vig">Vigencia de la licencia</label>
          <input id="pf-vig" type="date" value="${esc(p.licencia_vigencia || "")}">
        </div>
        <div>
          <label for="pf-med">Vigencia del examen psicofísico</label>
          <input id="pf-med" type="date" value="${esc(p.examen_medico_vigencia || "")}">
        </div>
        <div>
          <label for="pf-exp">Años de experiencia</label>
          <input id="pf-exp" type="number" min="0" max="60" value="${esc(p.experiencia_anios ?? 0)}">
        </div>
        <div>
          <label for="pf-unidades">Unidades que operas (separadas por coma)</label>
          <input id="pf-unidades" value="${esc((p.unidades || []).join(", "))}" placeholder="Tracto 5a rueda, Full, Caja seca…">
        </div>
      </div>
      <div class="form-msg" id="pf-msg"></div>
      <button class="btn btn-green" id="pf-save" style="margin-top:8px">Guardar cambios</button>
    </div>

    <div class="lesson-body" style="margin-top:26px">
      <h2 style="margin-bottom:6px">Mi empresa / unidad</h2>
      <p style="color:var(--gris-texto);margin-bottom:14px">Estos datos identifican tu cuenta como transportista, ya sea que operes tú solo (persona física) o tengas una empresa (persona moral). Se usan en el módulo de flota y en tus facturas y documentos.</p>
      <div class="profile-grid">
        <div>
          <label for="cp-name">Nombre o razón social</label>
          <input id="cp-name" value="${esc(state.company?.name || "")}">
        </div>
        <div>
          <label for="cp-rfc">RFC</label>
          <input id="cp-rfc" maxlength="13" value="${esc(state.company?.rfc || "")}" style="text-transform:uppercase">
        </div>
        <div>
          <label for="cp-tipo">Tipo de contribuyente</label>
          <select id="cp-tipo">
            <option value="">Selecciona…</option>
            <option value="fisica" ${state.company?.entity_type === "fisica" ? "selected" : ""}>Persona física (operador / hombre-camión)</option>
            <option value="moral" ${state.company?.entity_type === "moral" ? "selected" : ""}>Persona moral (empresa)</option>
          </select>
        </div>
      </div>
      <div class="form-msg" id="cp-msg"></div>
      <button class="btn btn-green" id="cp-save" style="margin-top:8px">Guardar datos de empresa</button>
      <p style="margin-top:14px"><a href="#/flota">Ir al panel de flota →</a></p>
    </div>

    <div class="lesson-body" style="margin-top:26px">
      <h2 style="margin-bottom:6px">Telegram — Reportes y gestión desde el celular</h2>
      <p style="color:var(--gris-texto);margin-bottom:14px">Vincula tu cuenta de Telegram para recibir notificaciones, enviar evidencia de inspecciones y gestionar viajes y gastos sin abrir la app web. Funciona sin internet: los cambios se sincronizan automáticamente cuando reconectes.</p>
      <div id="tg-status-section" style="margin-bottom:14px"></div>
      <button class="btn btn-primary" id="tg-gen-code" style="margin-top:8px">Generar código para Telegram</button>
      <div class="form-msg" id="tg-msg"></div>
      <div id="tg-code-display" style="display:none;margin-top:14px;padding:16px;background:#FFF8E1;border-radius:8px;border-left:4px solid var(--verde)">
        <p style="font-size:12px;color:var(--gris-texto);margin-bottom:8px">Código válido por 15 minutos:</p>
        <div style="font-size:24px;font-weight:bold;color:var(--asfalto);font-family:monospace;letter-spacing:2px;text-align:center;margin-bottom:8px" id="tg-code-value"></div>
        <p style="font-size:12px;color:var(--gris-texto);margin-bottom:8px">1. Abre Telegram y busca <strong>@operadorpromx_bot</strong></p>
        <p style="font-size:12px;color:var(--gris-texto);margin-bottom:8px">2. Escribe <strong>/start</strong> y presiona enviar</p>
        <p style="font-size:12px;color:var(--gris-texto)">3. El bot te pedirá el código, cópialo arriba y listo</p>
      </div>
    </div>`;

  const portal = document.getElementById("perfil-portal");
  if (portal) portal.onclick = async (e) => {
    e.preventDefault();
    portal.textContent = "Abriendo…";
    try {
      const res = await fetch("/.netlify/functions/create-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + state.session.access_token }
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Error");
      location.href = data.url;
    } catch (err) { alert(err.message); portal.textContent = "Administrar suscripción"; }
  };

  document.getElementById("pf-save").onclick = async () => {
    const msg = document.getElementById("pf-msg");
    msg.className = "form-msg"; msg.textContent = "Guardando…";
    const update = {
      full_name: document.getElementById("pf-name").value.trim(),
      phone: document.getElementById("pf-phone").value.trim(),
      curp: document.getElementById("pf-curp").value.trim().toUpperCase(),
      licencia_numero: document.getElementById("pf-lic").value.trim(),
      licencia_categoria: document.getElementById("pf-cat").value || null,
      licencia_vigencia: document.getElementById("pf-vig").value || null,
      examen_medico_vigencia: document.getElementById("pf-med").value || null,
      experiencia_anios: parseInt(document.getElementById("pf-exp").value, 10) || 0,
      unidades: document.getElementById("pf-unidades").value.split(",").map((s) => s.trim()).filter(Boolean),
      updated_at: new Date().toISOString()
    };
    const { error } = await sb.from("profiles").update(update).eq("id", state.session.user.id);
    if (error) { msg.className = "form-msg error"; msg.textContent = "No se pudo guardar: " + error.message; return; }
    Object.assign(state.profile, update);
    msg.className = "form-msg ok"; msg.textContent = "Perfil guardado.";
  };

  document.getElementById("cp-save").onclick = async () => {
    const msg = document.getElementById("cp-msg");
    if (!state.companyId) { msg.className = "form-msg error"; msg.textContent = "No hay una empresa asociada a tu cuenta."; return; }
    msg.className = "form-msg"; msg.textContent = "Guardando…";
    try {
      const { company } = await callFn("fleet-update-company", {
        method: "POST",
        body: {
          company_id: state.companyId,
          name: document.getElementById("cp-name").value.trim(),
          rfc: document.getElementById("cp-rfc").value.trim(),
          entity_type: document.getElementById("cp-tipo").value || undefined
        }
      });
      state.company = company;
      msg.className = "form-msg ok"; msg.textContent = "Datos de empresa guardados.";
    } catch (e) { msg.className = "form-msg error"; msg.textContent = e.message; }
  };

  // Cargar estado de sesión Telegram
  async function loadTelegramStatus() {
    if (!state.companyId) return;
    const $status = document.getElementById("tg-status-section");
    try {
      const session = await callFn("telegram-get-session", {
        query: { company_id: state.companyId }
      });
      const lastActivity = session.last_activity_at
        ? new Date(session.last_activity_at).toLocaleDateString("es-MX", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
        : "nunca";
      $status.innerHTML = `<div style="padding:12px;background:var(--verde);color:#fff;border-radius:6px">
        <strong>✓ Vinculado a Telegram</strong><br>
        <span style="font-size:12px">Última actividad: ${esc(lastActivity)}</span>
      </div>`;
      document.getElementById("tg-gen-code").textContent = "Generar nuevo código";
    } catch (e) {
      $status.innerHTML = "";
    }
  }

  loadTelegramStatus();

  document.getElementById("tg-gen-code").onclick = async () => {
    const msg = document.getElementById("tg-msg");
    const codeDisplay = document.getElementById("tg-code-display");
    const codeValue = document.getElementById("tg-code-value");
    const btn = document.getElementById("tg-gen-code");

    if (!state.companyId) {
      msg.className = "form-msg error";
      msg.textContent = "No hay una empresa asociada a tu cuenta.";
      return;
    }

    msg.className = "form-msg";
    msg.textContent = "Generando código…";
    btn.disabled = true;

    try {
      const result = await callFn("telegram-auth", {
        method: "POST",
        body: { company_id: state.companyId }
      });

      codeValue.textContent = result.code;
      codeDisplay.style.display = "block";
      msg.className = "form-msg ok";
      msg.textContent = "Código generado. Válido por 15 minutos.";

      // Auto-clear después de 15 minutos
      setTimeout(() => {
        codeDisplay.style.display = "none";
        msg.textContent = "";
      }, 15 * 60 * 1000);
    } catch (e) {
      msg.className = "form-msg error";
      msg.textContent = "Error al generar código: " + e.message;
    } finally {
      btn.disabled = false;
    }
  };
}

// ---------- Vista: éxito de suscripción ----------
async function renderSuscripcionExito() {
  setNav(true);
  $app.innerHTML = `<p style="text-align:center;padding:60px 0">Confirmando tu pago…</p>`;
  for (let i = 0; i < 6; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    await loadUserData();
    if (isSubscribed()) break;
  }
  $app.innerHTML = isSubscribed()
    ? `<div class="result-banner pass"><h2 style="color:#fff">Suscripción activa 🚛</h2><p>Todos los cursos y exámenes quedaron desbloqueados. ¡Buen viaje!</p></div>
       <div style="text-align:center"><a class="btn btn-primary" href="#/dashboard">Ir a mis cursos</a></div>`
    : `<div class="card"><p>El pago está en proceso. Si en unos minutos tu acceso no se activa, escríbenos con tu correo de registro.</p>
       <a class="btn btn-green" href="#/dashboard" style="margin-top:10px">Volver al panel</a></div>`;
}

// ---------- Stripe checkout (certificación) ----------
async function startCheckout(plan) {
  try {
    const res = await fetch("/.netlify/functions/create-checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + state.session.access_token
      },
      body: JSON.stringify({ plan: plan || "esencial" })
    });
    const data = await res.json();
    if (!res.ok || !data.url) throw new Error(data.error || "No se pudo iniciar el pago");
    location.href = data.url;
  } catch (e) {
    alert("Error al iniciar el pago: " + e.message);
  }
}

// ---------- PDF del certificado ----------
async function downloadCertificatePDF(cert) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "letter" }); // 279.4 x 215.9

  const W = 279.4, H = 215.9;
  const verde = [5, 96, 58], amarillo = [255, 196, 0], asfalto = [23, 25, 30];

  doc.setFillColor(242, 243, 240); doc.rect(0, 0, W, H, "F");
  doc.setFillColor(...verde); doc.roundedRect(10, 10, W - 20, H - 20, 8, 8, "F");
  doc.setDrawColor(255, 255, 255); doc.setLineWidth(2.4);
  doc.roundedRect(14, 14, W - 28, H - 28, 6, 6, "S");

  doc.setDrawColor(...amarillo); doc.setLineWidth(2); doc.setLineDashPattern([9, 6], 0);
  doc.line(26, 34, W - 26, 34);
  doc.setLineDashPattern([], 0);

  doc.setTextColor(255, 196, 0);
  doc.setFont("helvetica", "bold"); doc.setFontSize(15);
  doc.text("OPERADORPRO · CAPACITACIÓN PROFESIONAL DEL AUTOTRANSPORTE", W / 2, 27, { align: "center" });

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(30);
  doc.text("CERTIFICADO DE CAPACITACIÓN", W / 2, 52, { align: "center" });

  doc.setFont("helvetica", "normal"); doc.setFontSize(13);
  doc.text("Se hace constar que", W / 2, 68, { align: "center" });

  doc.setFont("helvetica", "bold"); doc.setFontSize(26);
  doc.text(cert.full_name.toUpperCase(), W / 2, 82, { align: "center" });

  doc.setFont("helvetica", "normal"); doc.setFontSize(13);
  doc.text("acreditó satisfactoriamente la evaluación del curso", W / 2, 94, { align: "center" });

  doc.setFont("helvetica", "bold"); doc.setFontSize(20);
  doc.text(`«${cert.course_title}»`, W / 2, 106, { align: "center" });

  doc.setFont("helvetica", "normal"); doc.setFontSize(12);
  doc.text(`Calificación: ${cert.score}/${cert.total}  ·  Emitido: ${fmtDate(cert.issued_at)}  ·  Vigente hasta: ${fmtDate(cert.valid_until)}`, W / 2, 118, { align: "center" });

  const plateW = 86, plateH = 16, plateX = W / 2 - plateW / 2, plateY = 128;
  doc.setFillColor(255, 255, 255); doc.roundedRect(plateX, plateY, plateW, plateH, 3, 3, "F");
  doc.setDrawColor(...asfalto); doc.setLineWidth(1.4); doc.roundedRect(plateX, plateY, plateW, plateH, 3, 3, "S");
  doc.setDrawColor(...amarillo); doc.setLineWidth(0.8); doc.roundedRect(plateX + 1.6, plateY + 1.6, plateW - 3.2, plateH - 3.2, 2, 2, "S");
  doc.setTextColor(...asfalto); doc.setFont("courier", "bold"); doc.setFontSize(17);
  doc.text(cert.folio, W / 2, plateY + 11, { align: "center" });

  const verifyUrl = `${CONFIG.SITE_URL}/verificar.html?folio=${encodeURIComponent(cert.folio)}`;
  const qrData = await makeQR(verifyUrl);
  if (qrData) {
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(W - 62, H - 64, 40, 40, 3, 3, "F");
    doc.addImage(qrData, "PNG", W - 58, H - 60, 32, 32);
    doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    doc.text("Escanea para verificar", W - 42, H - 20, { align: "center" });
  }

  doc.setTextColor(228, 239, 233); doc.setFontSize(9);
  doc.text(`Verificación pública: ${verifyUrl}`, 24, H - 22);
  doc.text("Este certificado acredita capacitación evaluada en línea. No sustituye la licencia federal ni documentos oficiales.", 24, H - 17);

  doc.save(`Certificado_${cert.folio}.pdf`);
}

function makeQR(text) {
  return new Promise((resolve) => {
    try {
      const holder = document.getElementById("qr-holder");
      holder.innerHTML = "";
      new QRCode(holder, { text, width: 256, height: 256, correctLevel: QRCode.CorrectLevel.M });
      setTimeout(() => {
        const canvas = holder.querySelector("canvas");
        const img = holder.querySelector("img");
        resolve(canvas ? canvas.toDataURL("image/png") : (img ? img.src : null));
      }, 120);
    } catch { resolve(null); }
  });
}

function tabs(active) {
  const items = [
    ["/flota", "Cumplimiento y flota"],
    ["/viajes", "Viáticos"],
    ["/inspecciones", "Inspección pre-viaje"],
    ["/cobranza", "Cobranza"]
  ];
  return `<div class="fleet-tabs">${items.map(([href, label]) =>
    `<a href="#${href}" class="${active === href ? "active" : ""}">${label}</a>`).join("")}</div>`;
}

// ---------- Vista: Cumplimiento y flota (Módulo 1) ----------
async function renderFlota() {
  setNav(true);
  await loadCompanyData();
  const vehicleOptions = state.vehicles.map((v) => `<option value="${v.id}">${esc(v.economic_number)} — ${esc(v.plate)}</option>`).join("");
  const driverOptions = state.drivers.map((d) => `<option value="${d.id}">${esc(d.full_name)}</option>`).join("");

  const docsRows = state.complianceDocs.map((d) => `
    <tr>
      <td>${esc(d.doc_type)}</td>
      <td>${esc(d.expires_at)}</td>
      <td><span class="badge ${d.semaforo}">${d.semaforo.replace("_", " ")}</span></td>
      <td>${d.days_to_expire} días</td>
    </tr>`).join("") || `<tr><td colspan="4">Sin documentos registrados todavía.</td></tr>`;

  const vehicleRows = state.vehicles.map((v) => `
    <div class="fleet-card">
      <h3>${esc(v.economic_number)}</h3>
      <p>Placa: ${esc(v.plate)}</p>
      <label>Estatus</label>
      <select data-vehicle-status="${v.id}">
        <option value="activa" ${v.status === "activa" ? "selected" : ""}>Activa</option>
        <option value="taller" ${v.status === "taller" ? "selected" : ""}>En taller</option>
        <option value="baja" ${v.status === "baja" ? "selected" : ""}>Baja</option>
      </select>
      <a href="fleet-qr.html?id=${v.id}" target="_blank">Ver QR de verificación →</a>
    </div>`).join("") || "<p>Aún no registras unidades.</p>";

  const driverCards = state.drivers.map((d) => `
    <div class="fleet-card">
      <h3>${esc(d.full_name)}</h3>
      <p>${esc(d.phone)} · ${esc(d.status)}</p>
    </div>`).join("") || "<p>Aún no registras choferes.</p>";

  const planLabel = { esencial: "Esencial", protegido: "Protegido" }[state.profile?.plan] || "Esencial";
  const billingCard = `
    <div class="fleet-card" style="margin-bottom:18px">
      <h3>Flota — ${esc(state.company?.name || "")}</h3>
      ${isSubscribed()
        ? `<p>Incluida en tu plan <strong>${esc(planLabel)}</strong> — sin costo adicional por unidad. <span class="badge pagada">Activa ✓</span> · ${state.vehicles.length} unidad(es) activa(s)</p>`
        : `<p class="form-msg error">Necesitas un plan de certificación activo (Esencial o Protegido) para usar el módulo de flota. <a href="#/dashboard">Elegir un plan →</a></p>`}
    </div>`;

  $app.innerHTML = `
    <div class="fleet-shell">
      ${tabs("/flota")}
      ${billingCard}
      <h2>Mi flota</h2>
      <div class="fleet-grid">${vehicleRows}</div>

      <h3 style="margin-top:26px">Agregar unidad</h3>
      <div class="fleet-card">
        <label>Número económico</label><input id="v-eco">
        <label>Placa</label><input id="v-plate">
        <div class="form-msg" id="v-msg"></div>
        <button id="v-submit" class="btn-primary">Guardar unidad</button>
      </div>

      <h3 style="margin-top:26px">Choferes</h3>
      <div class="fleet-grid">${driverCards}</div>
      <div class="fleet-card">
        <label>Nombre completo</label><input id="dr-name">
        <label>Teléfono (10 dígitos, para recibir avisos)</label><input id="dr-phone" placeholder="5512345678">
        <label>Número de licencia (opcional)</label><input id="dr-license">
        <label>Vencimiento de licencia (opcional)</label><input id="dr-license-exp" type="date">
        <div class="form-msg" id="dr-msg"></div>
        <button id="dr-submit" class="btn-primary">Guardar chofer</button>
      </div>

      <h3 style="margin-top:26px">Subir documento de cumplimiento</h3>
      <div class="fleet-card">
        <label>Unidad</label>
        <select id="d-vehicle"><option value="">— (o selecciona chofer) —</option>${vehicleOptions}</select>
        <label>Chofer</label>
        <select id="d-driver"><option value="">— (o selecciona unidad) —</option>${driverOptions}</select>
        <label>Tipo de documento</label>
        <select id="d-type">
          <option value="licencia_federal">Licencia federal</option>
          <option value="poliza_seguro">Póliza de seguro</option>
          <option value="tarjeta_circulacion">Tarjeta de circulación</option>
          <option value="verificacion">Verificación vehicular</option>
          <option value="permiso_sct">Permiso SCT</option>
          <option value="carta_porte_config">Configuración Carta Porte</option>
        </select>
        <label>Fecha de vencimiento</label><input id="d-expires" type="date">
        <label>Archivo (PDF/foto)</label><input id="d-file" type="file" accept="image/*,.pdf">
        <div class="form-msg" id="d-msg"></div>
        <button id="d-submit" class="btn-primary">Subir y activar recordatorios</button>
      </div>

      <h3 style="margin-top:26px">Semáforo de vencimientos</h3>
      <div class="table-scroll"><table class="fleet-table">
        <thead><tr><th>Documento</th><th>Vence</th><th>Estatus</th><th>Faltan</th></tr></thead>
        <tbody>${docsRows}</tbody>
      </table></div>
    </div>`;

  $app.querySelectorAll("[data-vehicle-status]").forEach((select) => {
    select.onchange = async () => {
      try {
        await callFn("fleet-update-vehicle-status", {
          method: "POST",
          body: { company_id: state.companyId, vehicle_id: select.dataset.vehicleStatus, status: select.value }
        });
        renderFlota();
      } catch (e) {
        alert(e.message);
        renderFlota();
      }
    };
  });

  document.getElementById("v-submit").onclick = async () => {
    const msg = document.getElementById("v-msg");
    try {
      msg.textContent = "Guardando…";
      await callFn("fleet-create-vehicle", {
        method: "POST",
        body: {
          company_id: state.companyId,
          economic_number: document.getElementById("v-eco").value.trim(),
          plate: document.getElementById("v-plate").value.trim()
        }
      });
      renderFlota();
    } catch (e) { msg.textContent = e.message; msg.className = "form-msg error"; }
  };

  document.getElementById("dr-submit").onclick = async () => {
    const msg = document.getElementById("dr-msg");
    try {
      msg.textContent = "Guardando…";
      await callFn("fleet-create-driver", {
        method: "POST",
        body: {
          company_id: state.companyId,
          full_name: document.getElementById("dr-name").value.trim(),
          phone: document.getElementById("dr-phone").value.trim(),
          license_number: document.getElementById("dr-license").value.trim() || undefined,
          license_expiry: document.getElementById("dr-license-exp").value || undefined
        }
      });
      renderFlota();
    } catch (e) { msg.textContent = e.message; msg.className = "form-msg error"; }
  };

  document.getElementById("d-submit").onclick = async () => {
    const msg = document.getElementById("d-msg");
    const file = document.getElementById("d-file").files[0];
    if (!file) { msg.textContent = "Selecciona un archivo"; msg.className = "form-msg error"; return; }
    try {
      msg.textContent = "Subiendo archivo…";
      const fileUrl = await uploadToBucket("compliance-docs", file);
      msg.textContent = "Registrando documento…";
      await callFn("fleet-upload-compliance-doc", {
        method: "POST",
        body: {
          company_id: state.companyId,
          vehicle_id: document.getElementById("d-vehicle").value || undefined,
          driver_id: document.getElementById("d-driver").value || undefined,
          doc_type: document.getElementById("d-type").value,
          file_url: fileUrl,
          expires_at: document.getElementById("d-expires").value
        }
      });
      renderFlota();
    } catch (e) { msg.textContent = e.message; msg.className = "form-msg error"; }
  };
}

// ---------- Vista: Viáticos (Módulo 2) ----------
async function renderViajes() {
  setNav(true);
  await loadCompanyData();
  const vehicleOptions = state.vehicles.length
    ? state.vehicles.map((v) => `<option value="${v.id}">${esc(v.economic_number)}</option>`).join("")
    : `<option value="">— Registra unidades en Flota primero —</option>`;
  const driverOptions = state.drivers.length
    ? state.drivers.map((d) => `<option value="${d.id}">${esc(d.full_name)}</option>`).join("")
    : `<option value="">— Registra choferes en Flota primero —</option>`;
  const openTripOptions = state.trips.filter((t) => t.status === "abierto")
    .map((t) => `<option value="${t.id}">${esc(t.origin)} → ${esc(t.destination)}</option>`).join("")
    || `<option value="">— Sin viajes abiertos —</option>`;

  const tripRows = state.trips.map((t) => `
    <tr>
      <td>${esc(t.origin)} → ${esc(t.destination)}</td>
      <td>${fmtMoney(t.budget_amount)}</td>
      <td>${fmtMoney(t.spent_amount)}</td>
      <td class="${t.remaining_amount < 0 ? "form-msg error" : ""}">${fmtMoney(t.remaining_amount)}</td>
      <td><span class="badge ${t.status === "abierto" ? "pendiente" : "pagada"}">${t.status}</span></td>
      <td>${t.status === "abierto" ? `<button data-close="${t.id}" class="btn-secondary">Cerrar</button>` : ""}</td>
    </tr>`).join("") || `<tr><td colspan="6">Sin viajes registrados todavía.</td></tr>`;

  $app.innerHTML = `
    <div class="fleet-shell">
      ${tabs("/viajes")}
      <h2>Viáticos y gastos de viaje</h2>

      <div class="fleet-card">
        <h3>Abrir viaje</h3>
        <label>Unidad</label><select id="t-vehicle">${vehicleOptions}</select>
        <label>Chofer</label><select id="t-driver">${driverOptions}</select>
        <label>Origen</label><input id="t-origin">
        <label>Destino</label><input id="t-destination">
        <label>Presupuesto asignado (MXN)</label><input id="t-budget" type="number" min="0" step="0.01">
        <div class="form-msg" id="t-msg"></div>
        <button id="t-submit" class="btn-primary">Abrir viaje</button>
      </div>

      <h3 style="margin-top:26px">Viajes</h3>
      <div class="table-scroll"><table class="fleet-table">
        <thead><tr><th>Ruta</th><th>Presupuesto</th><th>Gastado</th><th>Restante</th><th>Estatus</th><th></th></tr></thead>
        <tbody>${tripRows}</tbody>
      </table></div>

      <div class="fleet-card" style="margin-top:20px">
        <h3>Registrar gasto (ticket)</h3>
        <label>Viaje</label>
        <select id="e-trip">${openTripOptions}</select>
        <label>Categoría</label>
        <select id="e-category"><option value="diesel">Diésel</option><option value="caseta">Caseta</option><option value="comida">Comida</option><option value="taller">Taller</option><option value="otro">Otro</option></select>
        <label>Monto (MXN)</label><input id="e-amount" type="number" min="0.01" step="0.01">
        <label>Foto del ticket</label>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin:6px 0;align-items:center">
          <label style="display:inline-flex;align-items:center;gap:6px;background:var(--asfalto);color:#fff;padding:8px 14px;border-radius:8px;cursor:pointer;font-size:14px">
            📷 Cámara
            <input id="e-file-cam" type="file" accept="image/*" capture="environment" style="display:none">
          </label>
          <label style="display:inline-flex;align-items:center;gap:6px;background:#f0f0f0;color:#333;padding:8px 14px;border-radius:8px;cursor:pointer;font-size:14px">
            🖼️ Galería
            <input id="e-file-gal" type="file" accept="image/*" style="display:none">
          </label>
          <span id="e-file-name" style="font-size:13px;color:var(--gris-texto)">Sin foto</span>
        </div>
        <div class="form-msg" id="e-msg"></div>
        <button id="e-submit" class="btn-primary">Guardar gasto</button>
      </div>
    </div>`;

  document.getElementById("t-submit").onclick = async () => {
    const msg = document.getElementById("t-msg");
    if (!document.getElementById("t-vehicle").value) {
      msg.textContent = "Primero registra una unidad en la sección Flota."; msg.className = "form-msg error"; return;
    }
    if (!document.getElementById("t-driver").value) {
      msg.textContent = "Primero registra un chofer en la sección Flota."; msg.className = "form-msg error"; return;
    }
    try {
      msg.textContent = "Guardando…";
      await callFn("fleet-create-trip", {
        method: "POST",
        body: {
          company_id: state.companyId,
          vehicle_id: document.getElementById("t-vehicle").value,
          driver_id: document.getElementById("t-driver").value,
          origin: document.getElementById("t-origin").value.trim(),
          destination: document.getElementById("t-destination").value.trim(),
          budget_amount: Number(document.getElementById("t-budget").value)
        }
      });
      renderViajes();
    } catch (e) { msg.textContent = e.message; msg.className = "form-msg error"; }
  };

  let _receiptFile = null;
  ["e-file-cam", "e-file-gal"].forEach((id) => {
    document.getElementById(id).onchange = function () {
      if (this.files[0]) {
        _receiptFile = this.files[0];
        document.getElementById("e-file-name").textContent = this.files[0].name;
      }
    };
  });

  document.getElementById("e-submit").onclick = async () => {
    const msg = document.getElementById("e-msg");
    if (!document.getElementById("e-trip").value) {
      msg.textContent = "No hay viajes abiertos. Abre un viaje primero."; msg.className = "form-msg error"; return;
    }
    const file = _receiptFile;
    if (!file) { msg.textContent = "Adjunta la foto del ticket"; msg.className = "form-msg error"; return; }
    try {
      msg.textContent = "Subiendo ticket…";
      const receiptUrl = await uploadToBucket("trip-evidence", file);
      msg.textContent = "Leyendo ticket (OCR) y guardando…";
      await callFn("fleet-submit-expense", {
        method: "POST",
        body: {
          trip_id: document.getElementById("e-trip").value,
          category: document.getElementById("e-category").value,
          amount: Number(document.getElementById("e-amount").value),
          receipt_url: receiptUrl
        }
      });
      renderViajes();
    } catch (e) { msg.textContent = e.message; msg.className = "form-msg error"; }
  };

  $app.querySelectorAll("[data-close]").forEach((btn) => {
    btn.onclick = async () => {
      const orig = btn.textContent;
      try {
        btn.disabled = true; btn.textContent = "Cerrando…";
        await callFn("fleet-close-trip", { method: "POST", body: { trip_id: btn.dataset.close } });
        renderViajes();
      } catch (e) {
        btn.disabled = false; btn.textContent = orig;
        document.getElementById("t-msg").textContent = "Error al cerrar viaje: " + e.message;
        document.getElementById("t-msg").className = "form-msg error";
      }
    };
  });
}

// ---------- Vista: Inspección pre-viaje NOM-068 (Módulo 3) ----------
const PHOTO_TYPES = [["frente", "Frente"], ["llantas", "Llantas"], ["motor", "Motor"], ["caja_trasera", "Caja trasera"], ["odometro", "Odómetro"]];
const CHECKLIST_ITEMS = [
  ["frenos", "Frenos"], ["luces", "Luces"], ["llantas_desgaste", "Desgaste de llantas"],
  ["niveles_fluidos", "Niveles de fluidos"], ["fugas", "Sin fugas"], ["espejos", "Espejos"],
  ["claxon", "Claxon"], ["extintor", "Extintor"], ["triangulos", "Triángulos de seguridad"], ["cinturon", "Cinturón de seguridad"]
];

async function renderInspecciones() {
  setNav(true);
  await loadCompanyData();
  const vehicleOptions = state.vehicles.length
    ? state.vehicles.map((v) => `<option value="${v.id}">${esc(v.economic_number)}</option>`).join("")
    : `<option value="">— Registra unidades en Flota primero —</option>`;
  const driverOptions = state.drivers.length
    ? state.drivers.map((d) => `<option value="${d.id}">${esc(d.full_name)}</option>`).join("")
    : `<option value="">— Registra choferes en Flota primero —</option>`;

  $app.innerHTML = `
    <div class="fleet-shell">
      ${tabs("/inspecciones")}
      <h2>Inspección pre-viaje (NOM-068)</h2>
      <div class="fleet-card">
        <label>Unidad</label><select id="i-vehicle">${vehicleOptions}</select>
        <label>Chofer</label><select id="i-driver">${driverOptions}</select>
        <label>Odómetro (km)</label><input id="i-odo" type="number" min="0">

        <h4 style="margin-top:14px">Fotos obligatorias</h4>
        <div class="photo-inputs">
          ${PHOTO_TYPES.map(([key, label]) => `
          <div style="margin-bottom:10px">
            <label style="display:block;margin-bottom:4px;font-size:14px">${label}</label>
            <label style="display:inline-flex;align-items:center;gap:6px;background:var(--asfalto);color:#fff;padding:7px 12px;border-radius:8px;cursor:pointer;font-size:13px">
              📷 Cámara
              <input type="file" accept="image/*" capture="environment" style="display:none" data-photo="${key}">
            </label>
            <label style="display:inline-flex;align-items:center;gap:6px;background:#f0f0f0;color:#333;padding:7px 12px;border-radius:8px;cursor:pointer;font-size:13px;margin-left:6px">
              🖼️ Galería
              <input type="file" accept="image/*" style="display:none" data-photo-gal="${key}">
            </label>
            <span id="photo-name-${key}" style="display:block;font-size:12px;color:var(--gris-texto);margin-top:3px">Sin foto</span>
          </div>`).join("")}
        </div>

        <h4 style="margin-top:14px">Checklist de 10 puntos</h4>
        ${CHECKLIST_ITEMS.map(([key, label]) => `
          <div class="checklist-item">
            <label>${label}</label>
            <select data-check="${key}"><option value="true">OK</option><option value="false">Falla</option></select>
          </div>`).join("")}

        <div class="form-msg" id="i-msg" style="margin-top:12px"></div>
        <button id="i-submit" class="btn-primary">Enviar inspección</button>
      </div>
    </div>`;

  // Sincronizar inputs de galería → mismo data-photo para que el submit los lea
  PHOTO_TYPES.forEach(([key]) => {
    const galInput = document.querySelector(`[data-photo-gal="${key}"]`);
    const nameEl = document.getElementById(`photo-name-${key}`);
    galInput.onchange = function () {
      if (this.files[0]) {
        document.querySelector(`[data-photo="${key}"]`).__galFile = this.files[0];
        nameEl.textContent = this.files[0].name;
      }
    };
    document.querySelector(`[data-photo="${key}"]`).onchange = function () {
      if (this.files[0]) nameEl.textContent = this.files[0].name;
    };
  });

  document.getElementById("i-submit").onclick = async () => {
    const msg = document.getElementById("i-msg");
    if (!document.getElementById("i-vehicle").value) {
      msg.textContent = "Primero registra una unidad en la sección Flota."; msg.className = "form-msg error"; return;
    }
    if (!document.getElementById("i-driver").value) {
      msg.textContent = "Primero registra un chofer en la sección Flota."; msg.className = "form-msg error"; return;
    }
    const submitBtn = document.getElementById("i-submit");
    submitBtn.disabled = true;
    try {
      msg.textContent = "Subiendo evidencia fotográfica…";
      const photos = [];
      for (const [key] of PHOTO_TYPES) {
        const camInput = document.querySelector(`[data-photo="${key}"]`);
        const file = camInput.files[0] || camInput.__galFile;
        if (!file) throw new Error(`Falta la foto: ${key}`);
        const url = await uploadToBucket("trip-evidence", file);
        photos.push({ photo_type: key, url });
      }
      const checklist = CHECKLIST_ITEMS.map(([key]) => ({
        item_key: key,
        ok: document.querySelector(`[data-check="${key}"]`).value === "true"
      }));

      msg.textContent = "Registrando inspección…";
      const { inspection } = await callFn("fleet-submit-inspection", {
        method: "POST",
        body: {
          company_id: state.companyId,
          vehicle_id: document.getElementById("i-vehicle").value,
          driver_id: document.getElementById("i-driver").value,
          odometer_km: Number(document.getElementById("i-odo").value),
          photos,
          checklist
        }
      });
      msg.textContent = inspection.status === "rechazada"
        ? "⚠️ Inspección RECHAZADA: hay una falla crítica. No autorices la salida."
        : "✅ Inspección aprobada. Buen viaje.";
      msg.className = inspection.status === "rechazada" ? "form-msg error" : "form-msg";
      submitBtn.disabled = false;
    } catch (e) { submitBtn.disabled = false; msg.textContent = e.message; msg.className = "form-msg error"; }
  };
}

// ---------- Vista: Cobranza de fletes (Módulo 4) ----------
async function renderCobranza() {
  setNav(true);
  await loadCompanyData();
  const clientOptions = state.clients.length
    ? state.clients.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join("")
    : `<option value="">— Agrega un cliente primero —</option>`;

  const invoiceRows = state.invoices.map((i) => `
    <tr>
      <td>${esc(i.folio)}</td>
      <td>${fmtMoney(i.amount)}</td>
      <td>${esc(i.due_date)}</td>
      <td><span class="badge ${i.computed_status}">${i.computed_status}</span></td>
      <td>${i.computed_status !== "pagada" ? `<button data-pay="${i.id}" class="btn-secondary">Marcar pagada</button>` : ""}</td>
    </tr>`).join("") || `<tr><td colspan="5">Sin facturas registradas.</td></tr>`;

  $app.innerHTML = `
    <div class="fleet-shell">
      ${tabs("/cobranza")}
      <h2>Cobranza de fletes</h2>

      <div class="fleet-card">
        <h3>Nuevo cliente</h3>
        <label>Nombre</label><input id="c-name">
        <label>Teléfono de contacto (para recordatorios)</label><input id="c-phone">
        <div class="form-msg" id="c-msg"></div>
        <button id="c-submit" class="btn-primary">Guardar cliente</button>
      </div>

      <div class="fleet-card" style="margin-top:16px">
        <h3>Nueva factura de flete</h3>
        <label>Cliente</label><select id="f-client">${clientOptions}</select>
        <label>Folio</label><input id="f-folio">
        <label>Monto (MXN)</label><input id="f-amount" type="number" min="0.01" step="0.01">
        <label>Fecha de vencimiento</label><input id="f-due" type="date">
        <label>Foto de remisión/POD firmada (opcional)</label><input id="f-pod" type="file" accept="image/*,.pdf">
        <div class="form-msg" id="f-msg"></div>
        <button id="f-submit" class="btn-primary">Registrar factura</button>
      </div>

      <h3 style="margin-top:26px">Facturas</h3>
      <div class="table-scroll"><table class="fleet-table">
        <thead><tr><th>Folio</th><th>Monto</th><th>Vence</th><th>Estatus</th><th></th></tr></thead>
        <tbody>${invoiceRows}</tbody>
      </table></div>
    </div>`;

  document.getElementById("c-submit").onclick = async () => {
    const msg = document.getElementById("c-msg");
    try {
      msg.textContent = "Guardando…";
      await callFn("fleet-create-client", {
        method: "POST",
        body: {
          company_id: state.companyId,
          name: document.getElementById("c-name").value.trim(),
          contact_phone: document.getElementById("c-phone").value.trim() || undefined
        }
      });
      renderCobranza();
    } catch (e) { msg.textContent = e.message; msg.className = "form-msg error"; }
  };

  document.getElementById("f-submit").onclick = async () => {
    const msg = document.getElementById("f-msg");
    if (!document.getElementById("f-client").value) {
      msg.textContent = "Agrega un cliente primero."; msg.className = "form-msg error"; return;
    }
    try {
      const file = document.getElementById("f-pod").files[0];
      let podUrl;
      if (file) { msg.textContent = "Subiendo remisión…"; podUrl = await uploadToBucket("trip-evidence", file); }
      msg.textContent = "Registrando factura…";
      await callFn("fleet-create-invoice", {
        method: "POST",
        body: {
          company_id: state.companyId,
          client_id: document.getElementById("f-client").value,
          folio: document.getElementById("f-folio").value.trim(),
          amount: Number(document.getElementById("f-amount").value),
          due_date: document.getElementById("f-due").value,
          pod_url: podUrl
        }
      });
      renderCobranza();
    } catch (e) { msg.textContent = e.message; msg.className = "form-msg error"; }
  };

  $app.querySelectorAll("[data-pay]").forEach((btn) => {
    btn.onclick = async () => {
      const orig = btn.textContent;
      try {
        btn.disabled = true; btn.textContent = "Guardando…";
        await callFn("fleet-register-payment", { method: "POST", body: { invoice_id: btn.dataset.pay } });
        renderCobranza();
      } catch (e) {
        btn.disabled = false; btn.textContent = orig;
        document.getElementById("f-msg").textContent = "Error al registrar pago: " + e.message;
        document.getElementById("f-msg").className = "form-msg error";
      }
    };
  });
}

// ---------- Arranque ----------
// Bandera compartida para que el IIFE y onAuthStateChange no dupliquen la
// carga de datos cuando ambos se resuelven para el mismo usuario.
let _dataLoaded = false;

document.getElementById("logout-link").addEventListener("click", async (e) => {
  e.preventDefault();
  await sb.auth.signOut();
  state.session = null;
  _dataLoaded = false;
  resetUserState();
  location.hash = "#/login";
});

sb.auth.onAuthStateChange(async (_event, session) => {
  const wasLogged = !!state.session;
  state.session = session;
  if (session && !wasLogged && !_dataLoaded) {
    _dataLoaded = true;
    try {
      await loadAllUserData();
    } catch (e) {
      console.error("onAuthStateChange: loadAllUserData falló", e);
    }
  }
  if (!session) { resetUserState(); _dataLoaded = false; }
  router();
});

(async () => {
  try {
    const sessionPromise = sb.auth.getSession();
    const timeout = new Promise((resolve) => setTimeout(() => resolve({ data: { session: null }, timedOut: true }), 4000));
    const result = await Promise.race([sessionPromise, timeout]);
    state.session = result?.data?.session || null;
    if (state.session && !_dataLoaded) {
      _dataLoaded = true;
      try {
        await loadAllUserData();
      } catch (e) {
        console.error("Arranque: loadAllUserData falló (sesión sigue siendo válida)", e);
      }
    }
  } catch (e) {
    console.error("Arranque:", e);
    state.session = null;
  }
  router();
})();
