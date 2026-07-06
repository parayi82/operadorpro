// ============================================================
// OperadorPro - Lógica del panel del operador (SPA con rutas #)
// ============================================================

const sb = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

const state = {
  session: null,
  profile: null,
  progress: [],      // filas de course_progress
  certificates: [],  // certificados del usuario
  examDraft: {}      // respuestas seleccionadas del examen en curso
};

const $app = document.getElementById("app");

// ---------- Utilidades ----------
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const course = (id) => COURSES.find((c) => c.id === id);
const isSubscribed = () => state.profile?.subscription_status === "active";
const lessonsDone = (courseId) => state.progress.filter((p) => p.course_id === courseId).map((p) => p.lesson_id);
const certFor = (courseId) => state.certificates.find((c) => c.course_id === courseId);
const fmtDate = (d) => new Date(d).toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" });

function setNav(loggedIn) {
  document.getElementById("logout-link").classList.toggle("hidden", !loggedIn);
  document.querySelectorAll("#app-nav a:not(#logout-link)").forEach((a) => a.classList.toggle("hidden", !loggedIn));
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

// ---------- Router ----------
const routes = {
  "": renderDashboard,
  "/dashboard": renderDashboard,
  "/login": renderLogin,
  "/registro": renderRegistro,
  "/certificados": renderCertificados,
  "/perfil": renderPerfil,
  "/suscripcion-exito": renderSuscripcionExito
};

async function router() {
  const hash = location.hash.replace(/^#/, "") || "/dashboard";
  const publicRoutes = ["/login", "/registro"];

  if (!state.session && !publicRoutes.includes(hash)) { location.hash = "#/login"; return; }
  if (state.session && publicRoutes.includes(hash)) { location.hash = "#/dashboard"; return; }

  const parts = hash.split("/").filter(Boolean);
  if (parts[0] === "curso" && parts[1]) return renderCurso(parts[1]);
  if (parts[0] === "leccion" && parts[1] && parts[2] !== undefined) return renderLeccion(parts[1], parseInt(parts[2], 10));
  if (parts[0] === "examen" && parts[1]) return renderExamen(parts[1]);

  const view = routes["/" + (parts[0] || "dashboard")] || renderDashboard;
  view();
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
  $app.innerHTML = `
    <div class="form-card">
      <h2>Crear tu cuenta</h2>
      <label for="rg-name">Nombre completo</label>
      <input id="rg-name" type="text" autocomplete="name" placeholder="Como aparecerá en tu certificado">
      <label for="rg-email">Correo electrónico</label>
      <input id="rg-email" type="email" autocomplete="email" placeholder="tucorreo@ejemplo.com">
      <label for="rg-pass">Contraseña (mínimo 8 caracteres)</label>
      <input id="rg-pass" type="password" autocomplete="new-password" placeholder="••••••••">
      <div class="form-msg" id="rg-msg"></div>
      <button class="btn btn-primary btn-block" id="rg-btn">Crear cuenta</button>
      <p class="switch-auth">¿Ya tienes cuenta? <a href="#/login">Entra aquí</a></p>
    </div>`;
  document.getElementById("rg-btn").onclick = async () => {
    const msg = document.getElementById("rg-msg");
    const name = document.getElementById("rg-name").value.trim();
    const pass = document.getElementById("rg-pass").value;
    if (name.length < 5) { msg.className = "form-msg error"; msg.textContent = "Escribe tu nombre completo."; return; }
    if (pass.length < 8) { msg.className = "form-msg error"; msg.textContent = "La contraseña necesita al menos 8 caracteres."; return; }
    msg.className = "form-msg"; msg.textContent = "Creando cuenta…";
    const { error } = await sb.auth.signUp({
      email: document.getElementById("rg-email").value.trim(),
      password: pass,
      options: { data: { full_name: name } }
    });
    if (error) { msg.className = "form-msg error"; msg.textContent = error.message; return; }
    msg.className = "form-msg ok";
    msg.textContent = "Cuenta creada. Si tu proyecto pide confirmación por correo, revisa tu bandeja y vuelve a entrar.";
  };
}

// ---------- Vista: Dashboard ----------
function renderDashboard() {
  setNav(true);
  const subBanner = isSubscribed() ? "" : `
    <div class="locked-banner" style="margin-bottom:26px">
      <div><strong>Modo gratuito:</strong> puedes leer la primera lección de cada curso. Para el curso completo, el examen y tu certificado, activa tu suscripción.</div>
      <button class="btn btn-primary" id="go-checkout">Activar por ${esc(CONFIG.PRECIO_MENSUAL)}</button>
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
    <h1 class="view-title">Hola, ${esc((state.profile?.full_name || "operador").split(" ")[0])}</h1>
    <p class="view-sub">Tu ruta de certificación. Cada curso aprobado suma un certificado verificable a tu perfil.</p>
    ${subBanner}
    <div class="grid grid-3">${cards}</div>`;

  const btn = document.getElementById("go-checkout");
  if (btn) btn.onclick = startCheckout;
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

  $app.querySelectorAll("[data-locked]").forEach((b) => (b.onclick = startCheckout));
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

  $app.innerHTML = `
    <h1 class="view-title">Tu perfil de operador</h1>
    <p class="view-sub">Estos datos aparecen en tus certificados y en tu expediente profesional. Suscripción: <strong>${esc(subLabel)}</strong>${!isSubscribed() ? ` — <a href="#" id="perfil-checkout">activar ahora</a>` : ""}</p>
    <div class="lesson-body">
      <div class="profile-grid">
        <div>
          <label for="pf-name">Nombre completo</label>
          <input id="pf-name" value="${esc(p.full_name)}">
        </div>
        <div>
          <label for="pf-phone">Teléfono / WhatsApp</label>
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
    </div>`;

  const co = document.getElementById("perfil-checkout");
  if (co) co.onclick = (e) => { e.preventDefault(); startCheckout(); };

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
      experiencia_anios: parseInt(document.getElementById("pf-exp").value, 10) || 0,
      unidades: document.getElementById("pf-unidades").value.split(",").map((s) => s.trim()).filter(Boolean),
      updated_at: new Date().toISOString()
    };
    const { error } = await sb.from("profiles").update(update).eq("id", state.session.user.id);
    if (error) { msg.className = "form-msg error"; msg.textContent = "No se pudo guardar: " + error.message; return; }
    Object.assign(state.profile, update);
    msg.className = "form-msg ok"; msg.textContent = "Perfil guardado.";
  };
}

// ---------- Vista: éxito de suscripción ----------
async function renderSuscripcionExito() {
  setNav(true);
  $app.innerHTML = `<p style="text-align:center;padding:60px 0">Confirmando tu pago…</p>`;
  // El webhook de Stripe tarda unos segundos en actualizar el perfil
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

// ---------- Stripe checkout ----------
async function startCheckout() {
  try {
    const res = await fetch("/.netlify/functions/create-checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + state.session.access_token
      },
      body: JSON.stringify({})
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

  // Fondo y marco tipo señal
  doc.setFillColor(242, 243, 240); doc.rect(0, 0, W, H, "F");
  doc.setFillColor(...verde); doc.roundedRect(10, 10, W - 20, H - 20, 8, 8, "F");
  doc.setDrawColor(255, 255, 255); doc.setLineWidth(2.4);
  doc.roundedRect(14, 14, W - 28, H - 28, 6, 6, "S");

  // Raya de carril superior
  doc.setDrawColor(...amarillo); doc.setLineWidth(2); doc.setLineDashPattern([9, 6], 0);
  doc.line(26, 34, W - 26, 34);
  doc.setLineDashPattern([], 0);

  // Encabezado
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

  // Placa con folio
  const plateW = 86, plateH = 16, plateX = W / 2 - plateW / 2, plateY = 128;
  doc.setFillColor(255, 255, 255); doc.roundedRect(plateX, plateY, plateW, plateH, 3, 3, "F");
  doc.setDrawColor(...asfalto); doc.setLineWidth(1.4); doc.roundedRect(plateX, plateY, plateW, plateH, 3, 3, "S");
  doc.setDrawColor(...amarillo); doc.setLineWidth(0.8); doc.roundedRect(plateX + 1.6, plateY + 1.6, plateW - 3.2, plateH - 3.2, 2, 2, "S");
  doc.setTextColor(...asfalto); doc.setFont("courier", "bold"); doc.setFontSize(17);
  doc.text(cert.folio, W / 2, plateY + 11, { align: "center" });

  // QR de verificación
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

// ---------- Arranque ----------
document.getElementById("logout-link").onclick = async (e) => {
  e.preventDefault();
  await sb.auth.signOut();
  location.hash = "#/login";
};

sb.auth.onAuthStateChange(async (_event, session) => {
  const wasLogged = !!state.session;
  state.session = session;
  if (session && !wasLogged) {
    await loadUserData();
  }
  if (!session) { state.profile = null; state.progress = []; state.certificates = []; }
  router();
});

(async () => {
  const { data } = await sb.auth.getSession();
  state.session = data.session;
  if (state.session) await loadUserData();
  router();
})();
