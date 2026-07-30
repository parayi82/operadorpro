// ============================================================
// Lógica de verificar.html — extraída a archivo externo para que
// la Content-Security-Policy del sitio no requiera 'unsafe-inline'.
// ============================================================

const $folio = document.getElementById("vf-folio");
const $btn = document.getElementById("vf-btn");
const $result = document.getElementById("vf-result");

async function verify() {
  const folio = $folio.value.trim().toUpperCase();
  if (!folio) { $result.innerHTML = '<p class="form-msg error">Escribe un folio.</p>'; return; }
  $result.innerHTML = '<p style="color:var(--gris-texto)">Consultando…</p>';
  try {
    const res = await fetch("/.netlify/functions/verify-certificate?folio=" + encodeURIComponent(folio));
    const data = await res.json();
    if (!res.ok || !data.found) {
      $result.innerHTML = `
        <div class="result-banner fail" style="padding:20px">
          <h3 style="color:#fff">Folio no encontrado</h3>
          <p>No existe un certificado con el folio <strong>${folio.replace(/[^A-Z0-9\-]/g,"")}</strong>. Revisa que esté escrito exactamente como aparece en el documento.</p>
        </div>`;
      return;
    }
    const c = data.certificate;
    const vigente = c.status === "vigente" && new Date(c.valid_until) >= new Date();
    const fecha = (d) => new Date(d).toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" });
    $result.innerHTML = `
      <div class="result-banner ${vigente ? "pass" : "fail"}" style="padding:22px">
        <h3 style="color:#fff">${vigente ? "✓ Certificado auténtico y vigente" : "Certificado " + (c.status === "revocado" ? "revocado" : "vencido")}</h3>
      </div>
      <div class="card" style="text-align:left">
        <p><strong>Folio:</strong> <span class="plate" style="font-size:18px;padding:3px 12px">${c.folio}</span></p>
        <p><strong>Operador:</strong> ${c.full_name}</p>
        <p><strong>Curso:</strong> ${c.course_title}</p>
        <p><strong>Calificación:</strong> ${c.score}/${c.total}</p>
        <p><strong>Emitido:</strong> ${fecha(c.issued_at)}</p>
        <p><strong>Vigente hasta:</strong> ${fecha(c.valid_until)}</p>
      </div>`;
  } catch (e) {
    $result.innerHTML = '<p class="form-msg error">No se pudo consultar el registro. Intenta de nuevo en unos momentos.</p>';
  }
}

$btn.onclick = verify;
$folio.addEventListener("keydown", (e) => { if (e.key === "Enter") verify(); });

// Autoverificar si el folio viene en la URL (QR)
const params = new URLSearchParams(location.search);
if (params.get("folio")) { $folio.value = params.get("folio"); verify(); }
