// ============================================================
// Lógica de fleet-qr.html — archivo externo (requisito de la CSP
// estricta: script-src 'self', sin 'unsafe-inline').
// ============================================================

const $result = document.getElementById("qr-result");
const DOC_LABELS = {
  licencia_federal: "Licencia federal", poliza_seguro: "Póliza de seguro",
  tarjeta_circulacion: "Tarjeta de circulación", verificacion: "Verificación vehicular",
  permiso_sct: "Permiso SCT", carta_porte_config: "Configuración Carta Porte", otro: "Documento"
};
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

async function verify() {
  const id = new URLSearchParams(location.search).get("id");
  if (!id) { $result.innerHTML = '<p class="form-msg error">Falta el identificador de la unidad.</p>'; return; }
  try {
    const res = await fetch("/.netlify/functions/fleet-vehicle-qr?id=" + encodeURIComponent(id));
    const data = await res.json();
    if (!res.ok || !data.found) {
      $result.innerHTML = '<div class="result-banner fail" style="padding:20px"><h3 style="color:#fff">Unidad no encontrada</h3></div>';
      return;
    }
    const rows = (data.documents || []).map((d) => `
      <tr><td>${esc(DOC_LABELS[d.doc_type] || d.doc_type)}</td><td>${esc(d.expires_at)}</td>
      <td><span class="badge ${d.semaforo}">${d.semaforo.replace("_", " ")}</span></td></tr>`).join("")
      || '<tr><td colspan="3">Sin documentos registrados.</td></tr>';
    $result.innerHTML = `
      <div class="fleet-card" style="text-align:left">
        <h3>Unidad ${esc(data.vehicle.economic_number)} — ${esc(data.vehicle.plate)}</h3>
        <div class="table-scroll" style="margin-top:12px"><table class="fleet-table">
          <thead><tr><th>Documento</th><th>Vence</th><th>Estatus</th></tr></thead>
          <tbody>${rows}</tbody>
        </table></div>
      </div>`;
  } catch (e) {
    $result.innerHTML = '<p class="form-msg error">No se pudo consultar el registro. Intenta de nuevo.</p>';
  }
}
verify();
