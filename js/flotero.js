// ============================================================
// flotero.js — Panel analítico para gestores de flota.
// SPA independiente: auth, estado y router propios.
// Lee datos directamente de Supabase (RLS garantiza el scope
// por empresa). No comparte estado con panel.js ni admin-app.js.
// ============================================================

const sb = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
const $app = document.getElementById("app");
const $nav = document.getElementById("ft-nav");

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmtMXN = (n) => `$${Number(n || 0).toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "numeric" })
  : "—";

let session = null;
let companyId = null;
let companies = [];
let chartInstances = {};

// ── Cleanup chart instances before re-render ──────────────────
function destroyCharts() {
  Object.values(chartInstances).forEach((c) => { try { c.destroy(); } catch (_) {} });
  chartInstances = {};
}

// ── Authenticated Supabase fetch helper ───────────────────────
// (direct queries; RLS enforces company scope automatically)

// ── Nav ───────────────────────────────────────────────────────
function renderNav(loggedIn) {
  if (!loggedIn) { $nav.innerHTML = ""; return; }
  $nav.innerHTML = `
    <a href="app.html">App operadores</a>
    <a href="admin.html">Admin</a>
    <a href="#" id="ft-logout">Salir</a>`;
  document.getElementById("ft-logout").onclick = async (e) => {
    e.preventDefault(); destroyCharts(); await sb.auth.signOut();
  };
}

// ── Login ─────────────────────────────────────────────────────
function renderLogin(errMsg) {
  renderNav(false);
  $app.innerHTML = `
    <div class="ft-shell" style="display:flex;align-items:center;min-height:calc(100vh - 62px)">
      <div class="ft-login fleet-card" style="margin:0 auto">
        <h2>Acceso Flotero</h2>
        <p>Panel analítico de tu flota — choferes, gastos y cumplimiento.</p>
        <label>Correo electrónico</label>
        <input id="ft-em" type="email" autocomplete="email">
        <label>Contraseña</label>
        <input id="ft-pw" type="password" autocomplete="current-password">
        <div class="ft-msg error" id="ft-li-msg">${esc(errMsg || "")}</div>
        <button id="ft-li-go" class="ft-login-btn">Entrar</button>
        <p style="margin-top:16px;font-size:13px;color:var(--gris-texto)">
          ¿Eres operador? <a href="app.html">Ir a la app de operadores →</a>
        </p>
      </div>
    </div>`;
  document.getElementById("ft-li-go").onclick = async () => {
    const msg = document.getElementById("ft-li-msg");
    msg.textContent = "Verificando…"; msg.className = "ft-msg";
    const { error } = await sb.auth.signInWithPassword({
      email: document.getElementById("ft-em").value.trim(),
      password: document.getElementById("ft-pw").value
    });
    if (error) { msg.className = "ft-msg error"; msg.textContent = "Correo o contraseña incorrectos."; }
  };
}

// ── Load companies the user manages ───────────────────────────
async function loadMyCompanies() {
  const { data } = await sb
    .from("company_members")
    .select("role, companies:company_id (id, name)")
    .eq("user_id", session.user.id)
    .eq("status", "active")
    .in("role", ["owner", "admin"]);
  return (data || []).map((m) => ({
    id: m.companies.id,
    name: m.companies.name,
    role: m.role
  }));
}

// ── Company selector screen ───────────────────────────────────
function renderCompanySelect(cos) {
  $app.innerHTML = `
    <div class="ft-shell">
      <h2 style="margin-bottom:4px">Selecciona la empresa</h2>
      <p style="color:var(--gris-texto);margin-bottom:20px">Tienes acceso a varias empresas.</p>
      <div class="fleet-grid">
        ${cos.map((c) => `
          <button class="ft-co-card" data-cid="${esc(c.id)}">
            <strong>${esc(c.name)}</strong>
            <br><small style="color:var(--gris-texto)">${c.role === "owner" ? "Dueño" : "Administrador"}</small>
          </button>`).join("")}
      </div>
    </div>`;
  $app.querySelectorAll("[data-cid]").forEach((btn) => {
    btn.onclick = () => { companyId = btn.dataset.cid; renderDashboard(); };
  });
}

// ── Main analytics dashboard ──────────────────────────────────
async function renderDashboard() {
  destroyCharts();
  $app.innerHTML = `
    <div class="ft-shell">
      <p style="color:var(--gris-texto);padding:60px 0;text-align:center">Cargando datos de flota…</p>
    </div>`;

  // ── Parallel data fetch ────────────────────────────────────
  const [tripsRes, vehiclesRes, driversRes, invoicesRes, complianceRes] = await Promise.all([
    sb.from("trips")
      .select("id, origin, destination, budget_amount, vehicle_id, driver_id, status, started_at, closed_at")
      .eq("company_id", companyId)
      .order("started_at", { ascending: false })
      .limit(200),
    sb.from("vehicles")
      .select("id, economic_number, plate, status")
      .eq("company_id", companyId),
    sb.from("drivers")
      .select("id, full_name, status")
      .eq("company_id", companyId),
    sb.from("invoices")
      .select("id, amount, status, invoice_date")
      .eq("company_id", companyId)
      .order("invoice_date", { ascending: false })
      .limit(50),
    sb.from("compliance_status_v")
      .select("*")
      .eq("company_id", companyId)
  ]);

  const trips     = tripsRes.data || [];
  const vehicles  = vehiclesRes.data || [];
  const drivers   = driversRes.data || [];
  const invoices  = invoicesRes.data || [];
  const compliance = complianceRes.data || [];

  // Fetch expenses for the most recent 100 trips
  let expenses = [];
  const tripIds = trips.slice(0, 100).map((t) => t.id);
  if (tripIds.length) {
    const { data: expData } = await sb.from("expenses")
      .select("trip_id, category, amount, expense_date")
      .in("trip_id", tripIds);
    expenses = expData || [];
  }

  // ── KPIs ──────────────────────────────────────────────────
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const tripsThisMonth  = trips.filter((t) => t.started_at >= monthStart).length;
  const activeVehicles  = vehicles.filter((v) => v.status === "activa").length;
  const activeDrivers   = drivers.filter((d) => d.status === "activo").length;
  const totalExpenses   = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const dieselExpenses  = expenses
    .filter((e) => e.category === "diesel")
    .reduce((s, e) => s + Number(e.amount || 0), 0);
  const pendingInvoices = invoices.filter((i) => i.status === "pendiente");
  const pendingAmount   = pendingInvoices.reduce((s, i) => s + Number(i.amount || 0), 0);
  const criticalDocs    = compliance.filter((d) => d.semaforo === "rojo").length;
  const warnDocs        = compliance.filter((d) => d.semaforo === "amarillo").length;

  // ── Chart data: expenses by category ──────────────────────
  const CAT_LABELS = { diesel: "Diesel", caseta: "Casetas", comida: "Comida", taller: "Taller", otro: "Otro" };
  const catTotals = {};
  expenses.forEach((e) => { catTotals[e.category] = (catTotals[e.category] || 0) + Number(e.amount || 0); });

  // ── Chart data: monthly expenses + trips (last 6 months) ──
  const last6 = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    last6.push(d.toISOString().slice(0, 7));
  }
  const monthExp   = Object.fromEntries(last6.map((k) => [k, 0]));
  const monthTrips = Object.fromEntries(last6.map((k) => [k, 0]));
  expenses.forEach((e) => {
    const k = (e.expense_date || "").slice(0, 7);
    if (monthExp[k] !== undefined) monthExp[k] += Number(e.amount || 0);
  });
  trips.forEach((t) => {
    const k = (t.started_at || "").slice(0, 7);
    if (monthTrips[k] !== undefined) monthTrips[k]++;
  });

  // ── Per-vehicle table data ─────────────────────────────────
  const tripVehicle = {};
  trips.forEach((t) => { tripVehicle[t.id] = t.vehicle_id; });
  const vehExp = {};
  const vehDiesel = {};
  expenses.forEach((e) => {
    const vid = tripVehicle[e.trip_id];
    if (!vid) return;
    vehExp[vid] = (vehExp[vid] || 0) + Number(e.amount || 0);
    if (e.category === "diesel") vehDiesel[vid] = (vehDiesel[vid] || 0) + Number(e.amount || 0);
  });
  const vehTrips = {};
  trips.forEach((t) => { if (t.vehicle_id) vehTrips[t.vehicle_id] = (vehTrips[t.vehicle_id] || 0) + 1; });
  const vehStats = vehicles.map((v) => ({
    ...v,
    tripCount: vehTrips[v.id] || 0,
    expTotal:  vehExp[v.id]   || 0,
    diesel:    vehDiesel[v.id] || 0
  })).sort((a, b) => b.tripCount - a.tripCount);

  // ── Alerts ─────────────────────────────────────────────────
  const alerts = compliance
    .filter((d) => d.semaforo !== "verde")
    .sort((a, b) => (a.days_to_expire ?? 999) - (b.days_to_expire ?? 999))
    .slice(0, 8);
  const dot = (s) => ({ verde: "🟢", amarillo: "🟡", rojo: "🔴" }[s] || "⚫");

  // ── Company switcher HTML ─────────────────────────────────
  const switcherHtml = companies.length > 1 ? `
    <div class="ft-co-switcher">
      <label>Empresa:</label>
      <select id="ft-co-sel">
        ${companies.map((c) =>
          `<option value="${esc(c.id)}" ${c.id === companyId ? "selected" : ""}>${esc(c.name)}</option>`
        ).join("")}
      </select>
    </div>` : "";

  // ── Render ─────────────────────────────────────────────────
  $app.innerHTML = `
    <div class="ft-shell">
      ${switcherHtml}

      <!-- KPIs -->
      <div class="ft-kpis">
        <div class="ft-kpi">
          <div class="ft-kpi-label">Viajes este mes</div>
          <div class="ft-kpi-value">${tripsThisMonth}</div>
          <div class="ft-kpi-sub">de ${trips.length} totales cargados</div>
        </div>
        <div class="ft-kpi amber">
          <div class="ft-kpi-label">Gasto total</div>
          <div class="ft-kpi-value">${fmtMXN(totalExpenses)}</div>
          <div class="ft-kpi-sub">Diesel: ${fmtMXN(dieselExpenses)}</div>
        </div>
        <div class="ft-kpi">
          <div class="ft-kpi-label">Unidades activas</div>
          <div class="ft-kpi-value">${activeVehicles}</div>
          <div class="ft-kpi-sub">${activeDrivers} choferes activos</div>
        </div>
        <div class="ft-kpi ${pendingAmount > 0 ? "amber" : ""}">
          <div class="ft-kpi-label">Facturas pendientes</div>
          <div class="ft-kpi-value">${fmtMXN(pendingAmount)}</div>
          <div class="ft-kpi-sub">${pendingInvoices.length} documentos</div>
        </div>
        <div class="ft-kpi ${criticalDocs > 0 ? "red" : warnDocs > 0 ? "amber" : ""}">
          <div class="ft-kpi-label">Alertas de cumplimiento</div>
          <div class="ft-kpi-value">${criticalDocs + warnDocs}</div>
          <div class="ft-kpi-sub">${criticalDocs} vencidos · ${warnDocs} por vencer</div>
        </div>
      </div>

      <!-- Charts -->
      <div class="ft-section-title">Análisis de gastos</div>
      <div class="ft-chart-grid">
        <div class="ft-chart-card">
          <div class="ft-chart-title">Distribución por categoría</div>
          <div class="ft-chart-wrap">
            ${Object.values(catTotals).some((v) => v > 0)
              ? `<canvas id="ch-cat"></canvas>`
              : `<div class="ft-empty ft-empty-msg" style="padding:40px 0">Sin gastos registrados</div>`}
          </div>
        </div>
        <div class="ft-chart-card">
          <div class="ft-chart-title">Gasto mensual (6 meses)</div>
          <div class="ft-chart-wrap"><canvas id="ch-month"></canvas></div>
        </div>
      </div>

      <!-- Per-vehicle table -->
      <div class="ft-section-title">Rendimiento por unidad</div>
      <div class="ft-table-wrap">
        <table class="fleet-table">
          <thead><tr>
            <th>Unidad</th><th>Placa</th><th>Estado</th>
            <th>Viajes</th><th>Gasto total</th><th>Diesel</th>
          </tr></thead>
          <tbody>
            ${vehStats.length
              ? vehStats.map((v) => `
                <tr>
                  <td><strong>${esc(v.economic_number)}</strong></td>
                  <td>${esc(v.plate)}</td>
                  <td>
                    <span class="badge ${v.status === "activa" ? "vigente" : "vencida"}">
                      ${v.status === "activa" ? "Activa" : esc(v.status)}
                    </span>
                  </td>
                  <td>${v.tripCount}</td>
                  <td>${fmtMXN(v.expTotal)}</td>
                  <td>${fmtMXN(v.diesel)}</td>
                </tr>`).join("")
              : `<tr><td colspan="6" style="color:var(--gris-texto);text-align:center;padding:24px">
                  Sin unidades registradas. <a href="app.html#/flota">Ir a Flota →</a>
                </td></tr>`}
          </tbody>
        </table>
      </div>

      <!-- Driver table -->
      ${drivers.length ? `
        <div class="ft-section-title">Choferes</div>
        <div class="ft-table-wrap">
          <table class="fleet-table">
            <thead><tr><th>Nombre</th><th>Estado</th><th>Viajes</th></tr></thead>
            <tbody>
              ${drivers.map((d) => {
                const dTrips = trips.filter((t) => t.driver_id === d.id).length;
                return `
                  <tr>
                    <td><strong>${esc(d.full_name)}</strong></td>
                    <td>
                      <span class="badge ${d.status === "activo" ? "vigente" : "vencida"}">
                        ${d.status === "activo" ? "Activo" : esc(d.status)}
                      </span>
                    </td>
                    <td>${dTrips}</td>
                  </tr>`;
              }).join("")}
            </tbody>
          </table>
        </div>` : ""}

      <!-- Compliance alerts -->
      ${alerts.length ? `
        <div class="ft-section-title">Alertas de cumplimiento</div>
        <div class="ft-alert-list">
          ${alerts.map((a) => `
            <div class="ft-alert-item">
              <span class="ft-alert-dot">${dot(a.semaforo)}</span>
              <div class="ft-alert-text">
                <div class="ft-alert-name">${esc((a.doc_type || "").replace(/_/g, " ").toUpperCase())}</div>
                <div class="ft-alert-sub">${esc(a.entity_name || a.vehicle_plate || "")}</div>
              </div>
              <div class="ft-alert-days ${(a.days_to_expire ?? 1) < 0 ? "red" : "amber"}">
                ${(a.days_to_expire ?? 0) < 0
                  ? `Vencido ${Math.abs(a.days_to_expire)}d`
                  : `${a.days_to_expire}d`}
              </div>
            </div>`).join("")}
        </div>` : ""}

      <!-- Pending invoices -->
      ${pendingInvoices.length ? `
        <div class="ft-section-title">Facturas pendientes de cobro</div>
        <div class="ft-table-wrap">
          <table class="fleet-table">
            <thead><tr><th>Fecha</th><th>Monto</th><th>Estado</th></tr></thead>
            <tbody>
              ${pendingInvoices.map((i) => `
                <tr>
                  <td>${fmtDate(i.invoice_date)}</td>
                  <td>${fmtMXN(i.amount)}</td>
                  <td><span class="badge pendiente">Pendiente</span></td>
                </tr>`).join("")}
            </tbody>
          </table>
        </div>` : ""}

      <p style="text-align:center;margin-top:24px;padding-top:24px;border-top:2px solid var(--niebla)">
        <a href="app.html#/flota" class="btn-secondary">Ir al panel de flota →</a>
      </p>
    </div>`;

  // ── Company switcher ───────────────────────────────────────
  document.getElementById("ft-co-sel")?.addEventListener("change", (e) => {
    companyId = e.target.value; renderDashboard();
  });

  // ── Charts ────────────────────────────────────────────────
  const catKeys   = Object.keys(CAT_LABELS);
  const catValues = catKeys.map((k) => Math.round(catTotals[k] || 0));
  const catColors = ["#FFC400", "#05603A", "#EF4444", "#3B82F6", "#8B5CF6"];

  if (catValues.some((v) => v > 0)) {
    chartInstances.cat = new Chart(document.getElementById("ch-cat"), {
      type: "doughnut",
      data: {
        labels: catKeys.map((k) => CAT_LABELS[k]),
        datasets: [{ data: catValues, backgroundColor: catColors, borderWidth: 2, hoverOffset: 8 }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "right", labels: { boxWidth: 12, font: { size: 11 } } },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.label}: $${ctx.parsed.toLocaleString("es-MX")}`
            }
          }
        }
      }
    });
  }

  chartInstances.month = new Chart(document.getElementById("ch-month"), {
    type: "bar",
    data: {
      labels: last6.map((k) => {
        const [y, m] = k.split("-");
        return new Date(Number(y), Number(m) - 1).toLocaleDateString("es-MX", { month: "short" });
      }),
      datasets: [
        {
          label: "Gasto ($)",
          data: last6.map((k) => Math.round(monthExp[k] || 0)),
          backgroundColor: "#05603A",
          borderRadius: 6,
          yAxisID: "y"
        },
        {
          label: "Viajes",
          data: last6.map((k) => monthTrips[k] || 0),
          type: "line",
          borderColor: "#FFC400",
          backgroundColor: "rgba(255,196,0,.15)",
          pointBackgroundColor: "#FFC400",
          borderWidth: 2,
          tension: 0.3,
          yAxisID: "y1"
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { boxWidth: 12, font: { size: 11 } } } },
      scales: {
        y: {
          position: "left",
          ticks: { callback: (v) => `$${v.toLocaleString("es-MX")}`, font: { size: 10 } }
        },
        y1: {
          position: "right",
          grid: { drawOnChartArea: false },
          ticks: { font: { size: 10 } }
        }
      }
    }
  });
}

// ── Auth flow ─────────────────────────────────────────────────
async function initAfterLogin() {
  renderNav(true);
  companies = await loadMyCompanies();
  if (!companies.length) {
    $app.innerHTML = `
      <div class="ft-shell">
        <div class="ft-empty">
          <div class="ft-empty-icon">🚫</div>
          <div class="ft-empty-msg">Tu cuenta no tiene rol de administrador en ninguna empresa.</div>
          <p style="margin-top:12px"><a href="app.html">Ir a la app de operadores →</a></p>
        </div>
      </div>`;
    return;
  }
  companyId = companies[0].id;
  if (companies.length > 1) {
    renderCompanySelect(companies);
  } else {
    renderDashboard();
  }
}

sb.auth.onAuthStateChange(async (_ev, newSession) => {
  session = newSession;
  if (!session) { destroyCharts(); renderLogin(); return; }
  await initAfterLogin();
});

(async () => {
  const { data } = await sb.auth.getSession();
  session = data.session;
  if (!session) { renderLogin(); return; }
  await initAfterLogin();
})();
