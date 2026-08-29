// ============================================================
// OperadorPro — Panel de administrador de plataforma.
// App aislada: login, estado y router propios. Acceso cruzado
// entre empresas (service key en las funciones) a propósito;
// separado de panel.js para no mezclar privilegios.
// Dark enterprise theme via css/admin.css.
// ============================================================

const sb = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
const FN = (name) => `/.netlify/functions/${name}`;
const $app = document.getElementById("app");

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "numeric" })
  : "—";
const badge = (status) => {
  const M = {
    active:    ["green", "Activo"],
    past_due:  ["amber", "Vencido"],
    inactive:  ["red", "Inactivo"],
    suspended: ["red", "Suspendido"]
  };
  const [cls, lbl] = M[status] || ["", status || "—"];
  return `<span class="ad-badge ${cls}">${lbl}</span>`;
};

let session = null;

async function callFn(name, { method = "GET", body, query } = {}) {
  const token = session?.access_token;
  const qs = query ? `?${new URLSearchParams(query).toString()}` : "";
  const res = await fetch(FN(name) + qs, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.error?.message || "Error de red");
    err.status = res.status;
    throw err;
  }
  return data;
}

// ── Login ─────────────────────────────────────────────────────
function renderLogin(errMsg) {
  $app.innerHTML = `
    <div class="ad-login-wrap">
      <div class="ad-login-box">
        <div class="ad-login-tag">Plataforma · Acceso restringido</div>
        <h2>Panel de administración</h2>
        <p>Solo para administradores de OperadorPro.</p>
        <label>Correo electrónico</label>
        <input id="li-email" type="email" autocomplete="email">
        <label>Contraseña</label>
        <input id="li-pass" type="password" autocomplete="current-password">
        <div class="ad-msg error" id="li-msg">${esc(errMsg || "")}</div>
        <button id="li-submit" class="ad-btn primary" style="width:100%;padding:12px;font-size:15px;margin-top:14px">
          Entrar
        </button>
      </div>
    </div>`;
  document.getElementById("li-submit").onclick = async () => {
    const msg = document.getElementById("li-msg");
    msg.textContent = "Verificando…"; msg.className = "ad-msg";
    const { error } = await sb.auth.signInWithPassword({
      email: document.getElementById("li-email").value.trim(),
      password: document.getElementById("li-pass").value
    });
    if (error) { msg.className = "ad-msg error"; msg.textContent = "Correo o contraseña incorrectos."; }
  };
}

// ── Rows helpers ──────────────────────────────────────────────
function companyRows(list) {
  if (!list.length) return `<tr><td colspan="9" style="color:var(--ad-muted);text-align:center;padding:24px">Sin empresas</td></tr>`;
  return list.map((c) => `
    <tr>
      <td><strong>${esc(c.name)}</strong></td>
      <td style="color:var(--ad-muted);font-size:13px">${esc(c.owner_email || "—")}</td>
      <td>${c.entity_type === "fisica" ? "Física" : c.entity_type === "moral" ? "Moral" : "—"}</td>
      <td style="font-family:monospace;font-size:12px;color:var(--ad-muted)">${esc(c.rfc || "—")}</td>
      <td>${esc(c.plan || "—")}</td>
      <td>${badge(c.subscription_status)}</td>
      <td style="text-align:center">${c.active_vehicles}</td>
      <td style="color:var(--ad-muted);font-size:12px">${fmtDate(c.created_at)}</td>
      <td></td>
    </tr>`).join("");
}

function userRows(list) {
  if (!list.length) return `<tr><td colspan="6" style="color:var(--ad-muted);text-align:center;padding:24px">Sin usuarios</td></tr>`;
  return list.map((u) => `
    <tr>
      <td>${esc(u.email)}</td>
      <td>${esc(u.full_name || "—")}</td>
      <td>
        ${badge(u.certification_subscription_status)}
        ${u.certification_subscription_status === "active"
          ? `<button class="ad-btn danger" data-sub-off="${esc(u.id)}" style="margin-left:6px">Desactivar</button>`
          : `<button class="ad-btn success" data-sub-on="${esc(u.id)}" style="margin-left:6px">Activar</button>`}
      </td>
      <td style="color:var(--ad-muted);font-size:13px">
        ${(u.companies || []).map((m) =>
          `${esc(m.company_name)} <em style="opacity:.6">(${esc(m.role)})</em>${m.status === "suspended" ? " ⛔" : ""}`
        ).join("<br>") || "—"}
      </td>
      <td style="color:var(--ad-muted);font-size:12px">${fmtDate(u.created_at)}</td>
      <td>
        ${(u.companies || []).map((m) => `
          <button class="ad-btn ${m.status === "active" ? "danger" : "success"}"
            data-member-toggle="${esc(m.company_id)}|${esc(u.id)}|${m.status === "active" ? "suspended" : "active"}">
            ${m.status === "active" ? "Suspender" : "Reactivar"}
          </button>`).join("")}
      </td>
    </tr>`).join("");
}

// ── Wire interactive elements ─────────────────────────────────
function wireActionButtons() {
  $app.querySelectorAll("[data-sub-on]").forEach((btn) => {
    btn.onclick = async () => {
      btn.disabled = true; btn.textContent = "Activando…";
      try {
        await callFn("fleet-admin-set-subscription", {
          method: "POST",
          body: { user_id: btn.dataset.subOn, subscription_status: "active", plan: "esencial" }
        });
        renderDashboard();
      } catch (e) { alert(e.message); btn.disabled = false; btn.textContent = "Activar"; }
    };
  });
  $app.querySelectorAll("[data-sub-off]").forEach((btn) => {
    btn.onclick = async () => {
      if (!confirm("¿Desactivar el plan de este usuario?")) return;
      btn.disabled = true; btn.textContent = "Desactivando…";
      try {
        await callFn("fleet-admin-set-subscription", {
          method: "POST",
          body: { user_id: btn.dataset.subOff, subscription_status: "inactive" }
        });
        renderDashboard();
      } catch (e) { alert(e.message); btn.disabled = false; btn.textContent = "Desactivar"; }
    };
  });
  $app.querySelectorAll("[data-member-toggle]").forEach((btn) => {
    btn.onclick = async () => {
      const [company_id, user_id, status] = btn.dataset.memberToggle.split("|");
      if (status === "suspended" && !confirm("¿Suspender a este usuario en esta empresa?")) return;
      btn.disabled = true;
      try {
        await callFn("fleet-admin-set-member-status", { method: "POST", body: { company_id, user_id, status } });
        renderDashboard();
      } catch (e) { alert(e.message); btn.disabled = false; }
    };
  });
}

function wireTabNav() {
  $app.querySelectorAll(".ad-tab").forEach((tab) => {
    tab.onclick = () => {
      $app.querySelectorAll(".ad-tab").forEach((t) => t.classList.remove("active"));
      $app.querySelectorAll(".ad-panel").forEach((p) => p.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(`panel-${tab.dataset.tab}`)?.classList.add("active");
    };
  });
}

// ── Dashboard ──────────────────────────────────────────────────
async function renderDashboard() {
  $app.innerHTML = `<div class="ad-shell"><p style="color:var(--ad-muted);padding:60px 0;text-align:center">Cargando datos de plataforma…</p></div>`;

  let companiesData, usersData;
  try {
    [companiesData, usersData] = await Promise.all([
      callFn("fleet-admin-list-companies"),
      callFn("fleet-admin-list-users", { query: { page: 1 } })
    ]);
  } catch (e) {
    if (e.status === 403) {
      $app.innerHTML = `<div class="ad-shell"><div class="ad-msg error">Tu cuenta no tiene acceso de administrador de plataforma.</div></div>`;
      return;
    }
    $app.innerHTML = `<div class="ad-shell"><div class="ad-msg error">${esc(e.message)}</div></div>`;
    return;
  }

  const companies = companiesData.companies || [];
  const users     = usersData.users || [];

  // ── KPI computation ────────────────────────────────────────
  const activeCos    = companies.filter((c) => c.subscription_status === "active").length;
  const pastDueCos   = companies.filter((c) => c.subscription_status === "past_due").length;
  const activeUsers  = users.filter((u) => u.certification_subscription_status === "active").length;
  const totalVehicles= companies.reduce((s, c) => s + (c.active_vehicles || 0), 0);
  const now = new Date(); const msStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const newThisMonth = companies.filter((c) => new Date(c.created_at) >= msStart).length;

  $app.innerHTML = `
    <div class="ad-shell">

      <!-- KPIs -->
      <div class="ad-kpis">
        <div class="ad-kpi">
          <div class="ad-kpi-label">Total empresas</div>
          <div class="ad-kpi-value blue">${companies.length}</div>
          <div class="ad-kpi-sub">${newThisMonth} nuevas este mes</div>
        </div>
        <div class="ad-kpi">
          <div class="ad-kpi-label">Con plan activo</div>
          <div class="ad-kpi-value green">${activeCos}</div>
          <div class="ad-kpi-sub">${companies.length ? Math.round(activeCos / companies.length * 100) : 0}% del total</div>
        </div>
        <div class="ad-kpi">
          <div class="ad-kpi-label">Plan vencido</div>
          <div class="ad-kpi-value ${pastDueCos > 0 ? "amber" : "green"}">${pastDueCos}</div>
          <div class="ad-kpi-sub">Requieren seguimiento</div>
        </div>
        <div class="ad-kpi">
          <div class="ad-kpi-label">Usuarios totales</div>
          <div class="ad-kpi-value blue">${users.length}</div>
          <div class="ad-kpi-sub">${activeUsers} con plan activo</div>
        </div>
        <div class="ad-kpi">
          <div class="ad-kpi-label">Unidades activas</div>
          <div class="ad-kpi-value green">${totalVehicles}</div>
          <div class="ad-kpi-sub">en toda la plataforma</div>
        </div>
      </div>

      <!-- Tab navigation -->
      <div class="ad-tabs">
        <button class="ad-tab active" data-tab="resumen">Resumen</button>
        <button class="ad-tab" data-tab="empresas">Empresas (${companies.length})</button>
        <button class="ad-tab" data-tab="usuarios">Usuarios (${users.length})</button>
        <button class="ad-tab" data-tab="cuenta">Nueva cuenta</button>
      </div>

      <!-- Panel: Resumen -->
      <div class="ad-panel active" id="panel-resumen">
        <div class="ad-section-hd">Suscripciones de empresa (últimas 20)</div>
        <div class="ad-tscroll">
          <table class="ad-tbl">
            <thead><tr>
              <th>Empresa</th><th>Dueño</th><th>Plan</th>
              <th>Estado</th><th>Unidades</th><th>Alta</th>
            </tr></thead>
            <tbody>
              ${companies.slice(0, 20).map((c) => `
                <tr>
                  <td><strong>${esc(c.name)}</strong></td>
                  <td style="color:var(--ad-muted);font-size:13px">${esc(c.owner_email || "—")}</td>
                  <td>${esc(c.plan || "—")}</td>
                  <td>${badge(c.subscription_status)}</td>
                  <td style="text-align:center">${c.active_vehicles}</td>
                  <td style="color:var(--ad-muted);font-size:12px">${fmtDate(c.created_at)}</td>
                </tr>`).join("") ||
                `<tr><td colspan="6" style="color:var(--ad-muted);text-align:center;padding:24px">Sin empresas registradas</td></tr>`
              }
            </tbody>
          </table>
        </div>
        ${usersData.total > users.length
          ? `<p style="color:var(--ad-muted);font-size:13px;margin-top:10px">Mostrando ${users.length} de ${usersData.total} usuarios (paginación futura)</p>`
          : ""}
      </div>

      <!-- Panel: Empresas -->
      <div class="ad-panel" id="panel-empresas">
        <div class="ad-toolbar">
          <input class="ad-search" id="co-search" placeholder="Buscar empresa, RFC, correo…">
          <span id="co-count" style="color:var(--ad-muted);font-size:13px"></span>
        </div>
        <div class="ad-tscroll">
          <table class="ad-tbl">
            <thead><tr>
              <th>Empresa</th><th>Dueño</th><th>Tipo</th><th>RFC</th>
              <th>Plan</th><th>Estado</th><th>Unidades</th><th>Alta</th><th></th>
            </tr></thead>
            <tbody id="co-tbody">${companyRows(companies)}</tbody>
          </table>
        </div>
      </div>

      <!-- Panel: Usuarios -->
      <div class="ad-panel" id="panel-usuarios">
        <div class="ad-toolbar">
          <input class="ad-search" id="usr-search" placeholder="Buscar por correo o nombre…">
          <span id="usr-count" style="color:var(--ad-muted);font-size:13px"></span>
        </div>
        <div class="ad-tscroll">
          <table class="ad-tbl">
            <thead><tr>
              <th>Correo</th><th>Nombre</th><th>Certificación</th>
              <th>Empresas</th><th>Registro</th><th>Acciones</th>
            </tr></thead>
            <tbody id="usr-tbody">${userRows(users)}</tbody>
          </table>
        </div>
      </div>

      <!-- Panel: Nueva cuenta -->
      <div class="ad-panel" id="panel-cuenta">
        <div class="ad-form-card">
          <div class="ad-section-hd">Dar de alta manualmente</div>
          <label>Correo electrónico</label>
          <input id="na-email" type="email" placeholder="correo@ejemplo.com">
          <label>Nombre completo</label>
          <input id="na-name" type="text" placeholder="Nombre Apellido">
          <label>Tipo de contribuyente</label>
          <select id="na-tipo">
            <option value="">— sin definir —</option>
            <option value="fisica">Persona física</option>
            <option value="moral">Persona moral</option>
          </select>
          <div class="ad-cbk">
            <input id="na-activar" type="checkbox">
            <label for="na-activar" style="margin:0;text-transform:none;letter-spacing:0;font-family:var(--font-body);font-size:14px;color:var(--ad-text)">
              Activar plan manualmente (trato negociado, sin Stripe) — incluye cursos y Flota
            </label>
          </div>
          <label>Plan a activar</label>
          <select id="na-plan">
            <option value="esencial">Esencial</option>
            <option value="protegido">Protegido</option>
          </select>
          <div class="ad-msg" id="na-msg"></div>
          <button id="na-submit" class="ad-btn primary" style="margin-top:16px;padding:10px 20px">Crear cuenta</button>
        </div>
      </div>

    </div>`;

  // ── Tabs wiring ────────────────────────────────────────────
  wireTabNav();

  // ── Company search ─────────────────────────────────────────
  const coSearch = document.getElementById("co-search");
  const coCount  = document.getElementById("co-count");
  coCount.textContent = `${companies.length} empresas`;
  coSearch.oninput = () => {
    const q = coSearch.value.toLowerCase();
    const f = companies.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      (c.rfc || "").toLowerCase().includes(q) ||
      (c.owner_email || "").toLowerCase().includes(q)
    );
    document.getElementById("co-tbody").innerHTML = companyRows(f);
    coCount.textContent = `${f.length} de ${companies.length}`;
    wireActionButtons();
  };

  // ── User search ────────────────────────────────────────────
  const usrSearch = document.getElementById("usr-search");
  const usrCount  = document.getElementById("usr-count");
  usrCount.textContent = `${users.length} usuarios`;
  usrSearch.oninput = () => {
    const q = usrSearch.value.toLowerCase();
    const f = users.filter((u) =>
      u.email.toLowerCase().includes(q) ||
      (u.full_name || "").toLowerCase().includes(q)
    );
    document.getElementById("usr-tbody").innerHTML = userRows(f);
    usrCount.textContent = `${f.length} de ${users.length}`;
    wireActionButtons();
  };

  // ── Create account ─────────────────────────────────────────
  document.getElementById("na-submit").onclick = async () => {
    const msg = document.getElementById("na-msg");
    try {
      msg.className = "ad-msg"; msg.textContent = "Creando cuenta…";
      const { temp_password, user: newUser } = await callFn("fleet-admin-create-account", {
        method: "POST",
        body: {
          email: document.getElementById("na-email").value.trim(),
          full_name: document.getElementById("na-name").value.trim(),
          entity_type: document.getElementById("na-tipo").value || undefined,
          activate_subscription: document.getElementById("na-activar").checked,
          plan: document.getElementById("na-plan").value
        }
      });
      msg.className = "ad-msg ok";
      msg.innerHTML = `Cuenta creada: <strong>${esc(newUser.email)}</strong><br>
        Contraseña temporal (compártela de inmediato, solo se muestra una vez):<br>
        <code>${esc(temp_password)}</code><br>
        <button id="na-done" class="ad-btn primary" style="margin-top:12px">Ya la copié — actualizar lista</button>`;
      document.getElementById("na-done").onclick = () => renderDashboard();
    } catch (e) { msg.className = "ad-msg error"; msg.textContent = e.message; }
  };

  wireActionButtons();
}

// ── Auth ──────────────────────────────────────────────────────
document.getElementById("logout-link").addEventListener("click", async (e) => {
  e.preventDefault(); await sb.auth.signOut();
});

sb.auth.onAuthStateChange((_ev, newSession) => {
  session = newSession;
  document.getElementById("logout-link").classList.toggle("hidden", !session);
  if (session) renderDashboard(); else renderLogin();
});

(async () => {
  const { data } = await sb.auth.getSession();
  session = data.session;
  document.getElementById("logout-link").classList.toggle("hidden", !session);
  if (session) renderDashboard(); else renderLogin();
})();
