// ============================================================
// OperadorPro — Panel de administrador de plataforma.
// App aislada a propósito (login, estado y router propios): el
// acceso cruzado entre empresas que necesita este panel es distinto
// del modelo normal de la app (donde cada usuario solo ve lo suyo),
// así que se mantiene separado del panel unificado (panel.js) en vez
// de mezclarlo con esa superficie de menor privilegio.
// ============================================================

const sb = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
const FN = (name) => `/.netlify/functions/${name}`;
const $app = document.getElementById("app");
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmtMoney = (n) => `$${Number(n || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "numeric" }) : "—";

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

function renderLogin(errorMsg) {
  $app.innerHTML = `
    <div class="form-card" style="max-width:420px;margin:60px auto">
      <h2>Acceso de administrador</h2>
      <label for="li-email">Correo electrónico</label>
      <input id="li-email" type="email" autocomplete="email">
      <label for="li-pass">Contraseña</label>
      <input id="li-pass" type="password" autocomplete="current-password">
      <div class="form-msg error" id="li-msg">${esc(errorMsg || "")}</div>
      <button id="li-submit" class="btn-primary">Entrar</button>
    </div>`;
  document.getElementById("li-submit").onclick = async () => {
    const msg = document.getElementById("li-msg");
    msg.textContent = "Verificando…"; msg.className = "form-msg";
    const { error } = await sb.auth.signInWithPassword({
      email: document.getElementById("li-email").value.trim(),
      password: document.getElementById("li-pass").value
    });
    if (error) { msg.className = "form-msg error"; msg.textContent = "Correo o contraseña incorrectos."; }
  };
}

function subActionButtons(u) {
  if (u.certification_subscription_status === "active") {
    return `<button data-sub-off="${u.id}" class="btn-secondary">Desactivar plan</button>`;
  }
  return `<button data-sub-on="${u.id}" class="btn-secondary">Activar plan</button>`;
}

async function renderDashboard() {
  $app.innerHTML = `<p style="text-align:center;padding:60px 0;color:var(--gris-texto)">Cargando…</p>`;
  let companiesData, usersData;
  try {
    [companiesData, usersData] = await Promise.all([
      callFn("fleet-admin-list-companies"),
      callFn("fleet-admin-list-users", { query: { page: 1 } })
    ]);
  } catch (e) {
    if (e.status === 403) {
      $app.innerHTML = `<div class="form-card" style="max-width:480px;margin:60px auto"><p class="form-msg error">Tu cuenta no tiene acceso de administrador de plataforma.</p></div>`;
      return;
    }
    $app.innerHTML = `<div class="form-card" style="max-width:480px;margin:60px auto"><p class="form-msg error">${esc(e.message)}</p></div>`;
    return;
  }

  const companies = companiesData.companies || [];
  const users = usersData.users || [];

  const companyRows = companies.map((c) => `
    <tr>
      <td>${esc(c.name)}</td>
      <td>${esc(c.owner_email || "—")}</td>
      <td>${c.entity_type ? (c.entity_type === "fisica" ? "Física" : "Moral") : "—"}</td>
      <td>${esc(c.rfc || "—")}</td>
      <td>${c.active_vehicles}</td>
      <td>${fmtDate(c.created_at)}</td>
    </tr>`).join("") || `<tr><td colspan="6">Sin empresas registradas.</td></tr>`;

  const userRows = users.map((u) => `
    <tr>
      <td>${esc(u.email)}</td>
      <td>${esc(u.full_name || "—")}</td>
      <td><span class="badge ${u.certification_subscription_status === "active" ? "pagada" : u.certification_subscription_status === "past_due" ? "pendiente" : "vencida"}">${esc(u.certification_subscription_status || "inactive")}</span> · ${subActionButtons(u)}</td>
      <td>${(u.companies || []).map((m) => `${esc(m.company_name)} (${esc(m.role)}${m.status === "suspended" ? " · suspendido" : ""})`).join(", ") || "—"}</td>
      <td>${fmtDate(u.created_at)}</td>
      <td>${(u.companies || []).map((m) => `
        <button data-member-toggle="${m.company_id}|${u.id}|${m.status === "active" ? "suspended" : "active"}" class="btn-secondary" style="margin:2px">
          ${m.status === "active" ? "Suspender" : "Reactivar"} en ${esc(m.company_name)}
        </button>`).join("")}</td>
    </tr>`).join("") || `<tr><td colspan="6">Sin usuarios registrados.</td></tr>`;

  $app.innerHTML = `
    <div class="fleet-shell">
      <h2>Dar de alta una cuenta manualmente</h2>
      <div class="fleet-card">
        <label>Correo electrónico</label><input id="na-email" type="email">
        <label>Nombre completo</label><input id="na-name">
        <label>Tipo de contribuyente (opcional)</label>
        <select id="na-tipo">
          <option value="">— sin definir —</option>
          <option value="fisica">Persona física</option>
          <option value="moral">Persona moral</option>
        </select>
        <label style="display:flex;align-items:center;gap:8px;margin-top:10px">
          <input id="na-activar" type="checkbox" style="width:auto">
          Activar su plan manualmente (trato negociado, sin Stripe) — incluye cursos y Flota
        </label>
        <label>Plan a activar</label>
        <select id="na-plan">
          <option value="esencial">Esencial</option>
          <option value="protegido">Protegido</option>
        </select>
        <div class="form-msg" id="na-msg"></div>
        <button id="na-submit" class="btn-primary" style="margin-top:10px">Crear cuenta</button>
      </div>

      <h2 style="margin-top:30px">Empresas (${companies.length})</h2>
      <div class="table-scroll"><table class="fleet-table">
        <thead><tr><th>Nombre</th><th>Dueño</th><th>Tipo</th><th>RFC</th><th>Unidades</th><th>Alta</th></tr></thead>
        <tbody>${companyRows}</tbody>
      </table></div>

      <h2 style="margin-top:30px">Usuarios (${users.length}${usersData.total > users.length ? ` de ${usersData.total}` : ""})</h2>
      <div class="table-scroll"><table class="fleet-table">
        <thead><tr><th>Correo</th><th>Nombre</th><th>Certificación</th><th>Empresas</th><th>Registro</th><th>Acciones</th></tr></thead>
        <tbody>${userRows}</tbody>
      </table></div>
    </div>`;

  document.getElementById("na-submit").onclick = async () => {
    const msg = document.getElementById("na-msg");
    try {
      msg.className = "form-msg"; msg.textContent = "Creando…";
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
      msg.className = "form-msg ok";
      // OJO: no se refresca el dashboard aquí — haría desaparecer la
      // contraseña temporal antes de que el admin alcance a copiarla.
      // Se refresca solo cuando el admin confirma que ya la guardó.
      msg.innerHTML = `Cuenta creada para <strong>${esc(newUser.email)}</strong>. Contraseña temporal (compártela tú, solo se muestra una vez):
        <div class="plate" style="font-size:16px;padding:6px 12px;margin:8px 0;display:inline-block">${esc(temp_password)}</div>
        <br><button id="na-done" class="btn-primary" style="margin-top:8px">Ya la copié — actualizar lista</button>`;
      document.getElementById("na-done").onclick = () => renderDashboard();
    } catch (e) { msg.className = "form-msg error"; msg.textContent = e.message; }
  };

  $app.querySelectorAll("[data-sub-on]").forEach((btn) => {
    btn.onclick = async () => {
      await callFn("fleet-admin-set-subscription", { method: "POST", body: { user_id: btn.dataset.subOn, subscription_status: "active", plan: "esencial" } });
      renderDashboard();
    };
  });
  $app.querySelectorAll("[data-sub-off]").forEach((btn) => {
    btn.onclick = async () => {
      await callFn("fleet-admin-set-subscription", { method: "POST", body: { user_id: btn.dataset.subOff, subscription_status: "inactive" } });
      renderDashboard();
    };
  });
  $app.querySelectorAll("[data-member-toggle]").forEach((btn) => {
    btn.onclick = async () => {
      const [company_id, user_id, status] = btn.dataset.memberToggle.split("|");
      await callFn("fleet-admin-set-member-status", { method: "POST", body: { company_id, user_id, status } });
      renderDashboard();
    };
  });
}

document.getElementById("logout-link").addEventListener("click", async (e) => {
  e.preventDefault();
  await sb.auth.signOut();
});

sb.auth.onAuthStateChange((_event, newSession) => {
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
