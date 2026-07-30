// ============================================================
// OperadorPro Flota — SPA del panel del dueño/administrador.
// Reutiliza el mismo proyecto Supabase (Auth compartido con el
// panel de certificación): un operador certificado puede además
// ser dueño de flota con la misma cuenta.
// ============================================================

const sb = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
const FN = (name) => `/.netlify/functions/${name}`;

const state = {
  session: null,
  companies: [],       // [{id, name, role}]
  companyId: null,
  company: null,       // fila completa de la empresa activa (incluye subscription_status)
  vehicles: [],
  drivers: [],
  complianceDocs: [],
  trips: [],
  clients: [],
  invoices: []
};

const $app = document.getElementById("app");
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmtMoney = (n) => `$${Number(n || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN`;

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
  const path = `${state.companyId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
  const { error } = await sb.storage.from(bucket).upload(path, file, { upsert: false });
  if (error) throw error;
  // Bucket privado: se genera URL firmada de larga duración (1 año) para
  // que quede referenciada en la BD sin exponer el bucket como público.
  const { data, error: signErr } = await sb.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 365);
  if (signErr) throw signErr;
  return data.signedUrl;
}

// ---------- Carga de datos de la empresa activa ----------
async function loadCompanyData() {
  if (!state.companyId) return;
  const [{ data: company }, { data: vehicles }, { data: drivers }, { data: trips }, { data: clients }, { data: invoices }] = await Promise.all([
    sb.from("companies").select("id, name, plan, subscription_status").eq("id", state.companyId).single(),
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

  const { documents } = await callFn("fleet-compliance-dashboard", { query: { company_id: state.companyId } });
  state.complianceDocs = documents || [];
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

function setNav(loggedIn) {
  document.getElementById("logout-link").classList.toggle("hidden", !loggedIn);
  document.querySelectorAll("#app-nav a:not(#logout-link)").forEach((a) => a.classList.toggle("hidden", !loggedIn));
}

// ---------- Router ----------
const routes = {
  "/flota": renderFlota,
  "/viajes": renderViajes,
  "/inspecciones": renderInspecciones,
  "/cobranza": renderCobranza
};

async function router() {
  const hash = location.hash.replace(/^#/, "") || "/flota";
  const publicRoutes = ["/login", "/registro"];

  if (!state.session && !publicRoutes.includes(hash)) { location.hash = "#/login"; return; }
  if (state.session && publicRoutes.includes(hash)) { location.hash = "#/flota"; return; }

  if (state.session && !state.companies.length && hash !== "/onboarding") { location.hash = "#/onboarding"; return; }

  const view = routes[hash] || (hash === "/onboarding" ? renderOnboarding : renderFlota);
  try {
    await view();
  } catch (e) {
    $app.innerHTML = `<div class="form-card"><p class="form-msg error">${esc(e.message)}</p></div>`;
  }
  window.scrollTo(0, 0);
}
window.addEventListener("hashchange", router);

// ---------- Vistas: autenticación ----------
function renderLogin() {
  setNav(false);
  $app.innerHTML = `
    <div class="form-card">
      <h2>Entrar — Panel de flota</h2>
      <label for="li-email">Correo electrónico</label>
      <input id="li-email" type="email" autocomplete="email">
      <label for="li-pass">Contraseña</label>
      <input id="li-pass" type="password" autocomplete="current-password">
      <div class="form-msg" id="li-msg"></div>
      <button id="li-submit" class="btn-primary">Entrar</button>
      <p style="margin-top:14px">¿No tienes cuenta? <a href="#/registro">Regístrate</a></p>
    </div>`;
  document.getElementById("li-submit").onclick = async () => {
    const email = document.getElementById("li-email").value.trim();
    const password = document.getElementById("li-pass").value;
    const msg = document.getElementById("li-msg");
    msg.textContent = "Entrando…";
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) { msg.textContent = error.message; msg.className = "form-msg error"; return; }
    state.session = data.session;
    await loadMemberships();
    location.hash = "#/flota";
  };
}

function renderRegistro() {
  setNav(false);
  $app.innerHTML = `
    <div class="form-card">
      <h2>Crear cuenta</h2>
      <label for="re-email">Correo electrónico</label>
      <input id="re-email" type="email" autocomplete="email">
      <label for="re-pass">Contraseña (mín. 8 caracteres)</label>
      <input id="re-pass" type="password" autocomplete="new-password">
      <div class="form-msg" id="re-msg"></div>
      <button id="re-submit" class="btn-primary">Registrarme</button>
    </div>`;
  document.getElementById("re-submit").onclick = async () => {
    const email = document.getElementById("re-email").value.trim();
    const password = document.getElementById("re-pass").value;
    const msg = document.getElementById("re-msg");
    if (password.length < 8) { msg.textContent = "La contraseña debe tener al menos 8 caracteres"; msg.className = "form-msg error"; return; }
    msg.textContent = "Creando cuenta…";
    const { data, error } = await sb.auth.signUp({ email, password });
    if (error) { msg.textContent = error.message; msg.className = "form-msg error"; return; }
    state.session = data.session;
    if (state.session) { await loadMemberships(); location.hash = "#/onboarding"; }
    else { msg.textContent = "Revisa tu correo para confirmar tu cuenta."; msg.className = "form-msg"; }
  };
}

async function renderOnboarding() {
  setNav(true);
  $app.innerHTML = `
    <div class="form-card">
      <h2>Da de alta tu empresa</h2>
      <p style="color:var(--gris-texto)">Un camión o una flota completa: así empiezas a controlar cumplimiento, viáticos, inspecciones y cobranza desde el celular.</p>
      <label for="on-name">Nombre de la empresa / razón social</label>
      <input id="on-name" placeholder="Transportes García">
      <label for="on-rfc">RFC (opcional)</label>
      <input id="on-rfc" maxlength="13">
      <div class="form-msg" id="on-msg"></div>
      <button id="on-submit" class="btn-primary">Crear empresa</button>
    </div>`;
  document.getElementById("on-submit").onclick = async () => {
    const msg = document.getElementById("on-msg");
    try {
      msg.textContent = "Creando…";
      await callFn("fleet-create-company", {
        method: "POST",
        body: { name: document.getElementById("on-name").value.trim(), rfc: document.getElementById("on-rfc").value.trim() || undefined }
      });
      await loadMemberships();
      location.hash = "#/flota";
    } catch (e) { msg.textContent = e.message; msg.className = "form-msg error"; }
  };
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
      <p>Placa: ${esc(v.plate)} · ${esc(v.status)}</p>
      <a href="fleet-qr.html?id=${v.id}" target="_blank">Ver QR de verificación →</a>
    </div>`).join("") || "<p>Aún no registras unidades.</p>";

  const driverCards = state.drivers.map((d) => `
    <div class="fleet-card">
      <h3>${esc(d.full_name)}</h3>
      <p>${esc(d.phone)} · ${esc(d.status)}</p>
    </div>`).join("") || "<p>Aún no registras choferes.</p>";

  const myRole = state.companies.find((c) => c.id === state.companyId)?.role;
  const subStatus = state.company?.subscription_status || "inactive";
  const subBadgeClass = subStatus === "active" ? "pagada" : subStatus === "past_due" ? "pendiente" : "vencida";
  const subLabel = { active: "activa", past_due: "pago pendiente", canceled: "cancelada", inactive: "sin activar" }[subStatus] || subStatus;
  const billingCard = `
    <div class="fleet-card" style="margin-bottom:18px">
      <h3>Suscripción — ${esc(state.company?.name || "")}</h3>
      <p>Estatus: <span class="badge ${subBadgeClass}">${subLabel}</span> · ${state.vehicles.length} unidad(es) activa(s)</p>
      ${myRole === "owner" ? `
        <div class="form-msg" id="sub-msg"></div>
        ${subStatus === "active"
          ? `<button id="sub-manage" class="btn-primary">Gestionar mi suscripción</button>`
          : `<button id="sub-activate" class="btn-primary">Activar suscripción</button>`}
      ` : `<p style="color:var(--gris-texto)">Solo el dueño de la empresa puede gestionar la facturación.</p>`}
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
        <label>Teléfono (10 dígitos, para recibir avisos por WhatsApp)</label><input id="dr-phone" placeholder="5512345678">
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
      <table class="fleet-table">
        <thead><tr><th>Documento</th><th>Vence</th><th>Estatus</th><th>Faltan</th></tr></thead>
        <tbody>${docsRows}</tbody>
      </table>
    </div>`;

  if (myRole === "owner") {
    const subBtn = document.getElementById(subStatus === "active" ? "sub-manage" : "sub-activate");
    subBtn.onclick = async () => {
      const msg = document.getElementById("sub-msg");
      try {
        msg.textContent = "Abriendo Stripe…";
        const { url } = await callFn(subStatus === "active" ? "fleet-billing-portal" : "fleet-create-checkout", {
          method: "POST",
          body: { company_id: state.companyId }
        });
        location.href = url;
      } catch (e) { msg.textContent = e.message; msg.className = "form-msg error"; }
    };
  }

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
  const vehicleOptions = state.vehicles.map((v) => `<option value="${v.id}">${esc(v.economic_number)}</option>`).join("");
  const driverOptions = state.drivers.map((d) => `<option value="${d.id}">${esc(d.full_name)}</option>`).join("");

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
      <table class="fleet-table">
        <thead><tr><th>Ruta</th><th>Presupuesto</th><th>Gastado</th><th>Restante</th><th>Estatus</th><th></th></tr></thead>
        <tbody>${tripRows}</tbody>
      </table>

      <div class="fleet-card" style="margin-top:20px">
        <h3>Registrar gasto (ticket)</h3>
        <label>Viaje</label>
        <select id="e-trip">${state.trips.filter((t) => t.status === "abierto").map((t) => `<option value="${t.id}">${esc(t.origin)} → ${esc(t.destination)}</option>`).join("")}</select>
        <label>Categoría</label>
        <select id="e-category"><option value="diesel">Diésel</option><option value="caseta">Caseta</option><option value="comida">Comida</option><option value="taller">Taller</option><option value="otro">Otro</option></select>
        <label>Monto (MXN)</label><input id="e-amount" type="number" min="0.01" step="0.01">
        <label>Foto del ticket</label><input id="e-file" type="file" accept="image/*">
        <div class="form-msg" id="e-msg"></div>
        <button id="e-submit" class="btn-primary">Guardar gasto</button>
      </div>
    </div>`;

  document.getElementById("t-submit").onclick = async () => {
    const msg = document.getElementById("t-msg");
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

  document.getElementById("e-submit").onclick = async () => {
    const msg = document.getElementById("e-msg");
    const file = document.getElementById("e-file").files[0];
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
      await callFn("fleet-close-trip", { method: "POST", body: { trip_id: btn.dataset.close } });
      renderViajes();
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
  const vehicleOptions = state.vehicles.map((v) => `<option value="${v.id}">${esc(v.economic_number)}</option>`).join("");
  const driverOptions = state.drivers.map((d) => `<option value="${d.id}">${esc(d.full_name)}</option>`).join("");

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
          ${PHOTO_TYPES.map(([key, label]) => `<div><label>${label}</label><input type="file" accept="image/*" data-photo="${key}"></div>`).join("")}
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

  document.getElementById("i-submit").onclick = async () => {
    const msg = document.getElementById("i-msg");
    try {
      msg.textContent = "Subiendo evidencia fotográfica…";
      const photos = [];
      for (const [key] of PHOTO_TYPES) {
        const input = document.querySelector(`[data-photo="${key}"]`);
        const file = input.files[0];
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
    } catch (e) { msg.textContent = e.message; msg.className = "form-msg error"; }
  };
}

// ---------- Vista: Cobranza de fletes (Módulo 4) ----------
async function renderCobranza() {
  setNav(true);
  await loadCompanyData();
  const clientOptions = state.clients.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join("");

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
      <table class="fleet-table">
        <thead><tr><th>Folio</th><th>Monto</th><th>Vence</th><th>Estatus</th><th></th></tr></thead>
        <tbody>${invoiceRows}</tbody>
      </table>
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
      await callFn("fleet-register-payment", { method: "POST", body: { invoice_id: btn.dataset.pay } });
      renderCobranza();
    };
  });
}

// ---------- Arranque ----------
document.getElementById("logout-link").addEventListener("click", async (e) => {
  e.preventDefault();
  await sb.auth.signOut();
  state.session = null;
  state.companies = [];
  state.companyId = null;
  location.hash = "#/login";
});

routes["/login"] = renderLogin;
routes["/registro"] = renderRegistro;
routes["/onboarding"] = renderOnboarding;

(async function init() {
  const { data } = await sb.auth.getSession();
  state.session = data.session;
  if (state.session) await loadMemberships();

  sb.auth.onAuthStateChange((_event, session) => { state.session = session; });

  router();
})();
