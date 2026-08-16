// ============================================================
// inspeccion.js — Gestión de Inspecciones Pre-Viaje
// ============================================================

let currentUser = null;
let inspecciones = [];
let unidades = [];
let currentInspectionState = {
  unit_id: null,
  checklist: [],
  latitude: null,
  longitude: null,
  accuracy: null,
  signature: null,
  fotos: {}
};

// Checklist predefinido (30+ puntos)
const DEFAULT_CHECKLIST = [
  // Motor y fluidos
  { category: 'Motor y Fluidos', label: 'Aceite del motor', id: 'oil' },
  { category: 'Motor y Fluidos', label: 'Coolante/Anticongelante', id: 'coolant' },
  { category: 'Motor y Fluidos', label: 'Líquido de frenos', id: 'brake_fluid' },
  { category: 'Motor y Fluidos', label: 'Líquido de dirección hidráulica', id: 'steering_fluid' },

  // Frenos
  { category: 'Frenos', label: 'Pastillas de freno (delantera)', id: 'brake_pads_front' },
  { category: 'Frenos', label: 'Pastillas de freno (trasera)', id: 'brake_pads_rear' },
  { category: 'Frenos', label: 'Cilindros de freno (funcionamiento)', id: 'brake_cylinders' },
  { category: 'Frenos', label: 'Tubería de aire (freno neumático)', id: 'air_lines' },

  // Llantas
  { category: 'Llantas', label: 'Presión de aire (todas)', id: 'tire_pressure' },
  { category: 'Llantas', label: 'Profundidad de dibujo', id: 'tire_depth' },
  { category: 'Llantas', label: 'Grietas o daños visibles', id: 'tire_damage' },
  { category: 'Llantas', label: 'Tuercas de ruedas', id: 'wheel_lugs' },

  // Luces y Señalización
  { category: 'Luces', label: 'Faros delanteros', id: 'headlights' },
  { category: 'Luces', label: 'Luces traseras/freno', id: 'tail_lights' },
  { category: 'Luces', label: 'Direccionales/intermitentes', id: 'turn_signals' },
  { category: 'Luces', label: 'Luz de reversa', id: 'backup_light' },

  // Cabina y Carrocería
  { category: 'Cabina', label: 'Espejo retrovisor (conductor)', id: 'mirror_driver' },
  { category: 'Cabina', label: 'Espejo retrovisor (pasajero)', id: 'mirror_passenger' },
  { category: 'Cabina', label: 'Limpiaparabrisas (funcionan)', id: 'wipers' },
  { category: 'Cabina', label: 'Claxon', id: 'horn' },
  { category: 'Cabina', label: 'Cinturones de seguridad', id: 'seat_belts' },
  { category: 'Cabina', label: 'Parabrisas (sin grietas)', id: 'windshield' },

  // Carrocería
  { category: 'Carrocería', label: 'Puertas (abren/cierran bien)', id: 'doors' },
  { category: 'Carrocería', label: 'Escalerillas (si aplica)', id: 'steps' },
  { category: 'Carrocería', label: 'Caja/platón (sin daños)', id: 'cargo_area' },
  { category: 'Carrocería', label: 'Acoples (enganche)', id: 'couplings' },

  // Equipo de Seguridad
  { category: 'Seguridad', label: 'Extintor de fuego', id: 'fire_extinguisher' },
  { category: 'Seguridad', label: 'Triángulos de advertencia (2)', id: 'warning_triangles' },
  { category: 'Seguridad', label: 'Botiquín de primeros auxilios', id: 'first_aid_kit' },
  { category: 'Seguridad', label: 'Chaleco reflectante (2)', id: 'safety_vests' },
  { category: 'Seguridad', label: 'Linterna/Lámpara', id: 'flashlight' },
];

// ============================================================
// Inicialización
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
  // Verificar autenticación
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    window.location.href = 'index.html';
    return;
  }

  currentUser = data.session.user;

  // Cargar datos
  await loadUnidades();
  await loadInspecciones();

  // Setup canvas para firma
  setupSignatureCanvas();
});

// ============================================================
// Cargar Datos
// ============================================================

async function loadUnidades() {
  try {
    // Por ahora usamos unidades ficticias. Se conectará con tabla "units" después
    // En MVP podemos dejar hardcodeado o llamar a DB si existe
    unidades = [
      { id: 'unit-001', name: 'Torton 01 - ABC123' },
      { id: 'unit-002', name: 'Torton 02 - DEF456' },
      { id: 'unit-003', name: 'Trailer 01 - GHI789' }
    ];

    const select = document.getElementById('unit_id');
    select.innerHTML = '<option value="">-- Seleccionar unidad --</option>';
    unidades.forEach(u => {
      select.innerHTML += `<option value="${u.id}">${u.name}</option>`;
    });
  } catch (err) {
    console.error('Error cargando unidades:', err);
  }
}

async function loadInspecciones() {
  try {
    const loading = document.getElementById('loading');
    loading.style.display = 'block';

    const { data, error } = await supabase
      .from('inspections')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    inspecciones = data || [];

    renderInspectionsList();
    loading.style.display = 'none';
  } catch (err) {
    console.error('Error cargando inspecciones:', err);
    showMessage('Error al cargar inspecciones', 'error');
  }
}

// ============================================================
// Renderizar Lista de Inspecciones
// ============================================================

function renderInspectionsList() {
  const container = document.getElementById('inspection-list');

  if (inspecciones.length === 0) {
    container.innerHTML = '<p style="color: #999; text-align: center; padding: 2rem;">No hay inspecciones. Crea la primera →</p>';
    return;
  }

  container.innerHTML = inspecciones.map(insp => {
    const fecha = new Date(insp.created_at).toLocaleDateString('es-MX');
    const okCount = (insp.checklist || []).filter(c => c.status === 'ok').length;
    const failCount = (insp.checklist || []).filter(c => c.status === 'fail').length;
    const naCount = (insp.checklist || []).filter(c => c.status === 'na').length;

    return `
      <div class="inspection-card" onclick="viewInspectionDetail('${insp.id}')">
        <div class="inspection-card-header">
          <div>
            <div style="font-weight: bold; font-size: 1rem;">Unidad: ${insp.unit_id}</div>
            <div style="font-size: 0.9rem; color: #666; margin-top: 0.25rem;">${fecha}</div>
          </div>
          <span class="status-badge status-${insp.status}">${insp.status.toUpperCase()}</span>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; font-size: 0.9rem;">
          <div>✅ OK: <strong>${okCount}</strong></div>
          <div>❌ Fallas: <strong>${failCount}</strong></div>
          <div>⏸️ N/A: <strong>${naCount}</strong></div>
        </div>
        ${insp.qr_public_id ? `<div style="margin-top: 0.5rem; font-size: 0.85rem; color: #d4a574;">🔗 Verificable públicamente</div>` : ''}
      </div>
    `;
  }).join('');
}

// ============================================================
// Flujo de Inspección (Step by Step)
// ============================================================

function startInspection() {
  const unitId = document.getElementById('unit_id').value;
  if (!unitId) {
    alert('Selecciona una unidad primero');
    return;
  }

  currentInspectionState.unit_id = unitId;
  currentInspectionState.checklist = DEFAULT_CHECKLIST.map(item => ({
    ...item,
    status: null, // null | 'ok' | 'fail' | 'na'
    notes: '',
    photo_url: null
  }));

  // Obtener ubicación
  getLocation();

  // Renderizar checklist
  renderChecklist();

  // Mostrar paso de checklist
  showStep('step-checklist');

  // Renderizar barra de progreso
  renderProgressBar();
}

function renderChecklist() {
  const container = document.getElementById('checklist-items');
  const checklist = currentInspectionState.checklist;

  container.innerHTML = checklist.map((item, idx) => `
    <div class="checklist-item" id="checklist-${idx}">
      <div class="checklist-item-header">
        <div>
          <span class="checklist-category">${item.category}</span>
          <div class="checklist-label">${item.label}</div>
        </div>
      </div>

      <div class="status-buttons">
        <button type="button" class="status-btn ok" onclick="setChecklistStatus(${idx}, 'ok')">✅ OK</button>
        <button type="button" class="status-btn fail" onclick="setChecklistStatus(${idx}, 'fail')">❌ Falla</button>
        <button type="button" class="status-btn na" onclick="setChecklistStatus(${idx}, 'na')">⏸️ N/A</button>
      </div>

      <div class="photo-section" id="photo-${idx}">
        <h4>📷 Foto (requerida si hay falla)</h4>
        <div class="photo-input">
          <label style="display:inline-flex;align-items:center;gap:6px;background:#1a1a2e;color:#fff;padding:8px 14px;border-radius:8px;cursor:pointer;font-size:14px">
            📷 Tomar foto
            <input type="file" accept="image/*" capture="environment" style="display:none" onchange="handlePhotoCapture(${idx}, this)">
          </label>
          <label style="display:inline-flex;align-items:center;gap:6px;background:#f0f0f0;color:#333;padding:8px 14px;border-radius:8px;cursor:pointer;font-size:14px;margin-left:6px">
            🖼️ Galería
            <input type="file" accept="image/*" style="display:none" onchange="handlePhotoCapture(${idx}, this)">
          </label>
        </div>
        <img id="photo-preview-${idx}" class="photo-preview" style="display:none;">
      </div>

      <div style="margin-top: 1rem;">
        <label style="display: block; font-size: 0.9rem; margin-bottom: 0.5rem; color: #666;">Notas:</label>
        <textarea class="notes-input" onchange="currentInspectionState.checklist[${idx}].notes = this.value" placeholder="Ej: Llanta trasera izquierda con poco dibujo..."></textarea>
      </div>
    </div>
  `).join('');
}

function setChecklistStatus(idx, status) {
  currentInspectionState.checklist[idx].status = status;

  // Mostrar sección de foto si es falla
  const photoSection = document.getElementById(`photo-${idx}`);
  if (status === 'fail') {
    photoSection.classList.add('active');
  } else {
    photoSection.classList.remove('active');
  }

  // Actualizar UI del item
  const item = document.getElementById(`checklist-${idx}`);
  item.classList.remove('fail', 'ok');
  if (status === 'fail') {
    item.classList.add('fail');
  } else if (status === 'ok') {
    item.classList.add('ok');
  }

  updateProgressBar();
}

function handlePhotoCapture(idx, input) {
  const file = input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    currentInspectionState.checklist[idx].photo_url = e.target.result; // base64
    const preview = document.getElementById(`photo-preview-${idx}`);
    preview.src = e.target.result;
    preview.style.display = 'block';
  };
  reader.readAsDataURL(file);
}

// ============================================================
// Firma
// ============================================================

let signatureCanvas, signatureCtx;
let isDrawing = false;

function setupSignatureCanvas() {
  signatureCanvas = document.getElementById('signature-canvas');
  if (!signatureCanvas) return;

  signatureCtx = signatureCanvas.getContext('2d');
  const rect = signatureCanvas.getBoundingClientRect();
  signatureCanvas.width = rect.width;
  signatureCanvas.height = rect.height;

  signatureCanvas.addEventListener('mousedown', startDrawing);
  signatureCanvas.addEventListener('mousemove', draw);
  signatureCanvas.addEventListener('mouseup', stopDrawing);
  signatureCanvas.addEventListener('touchstart', handleTouch);
  signatureCanvas.addEventListener('touchmove', handleTouch);
  signatureCanvas.addEventListener('touchend', stopDrawing);
}

function startDrawing(e) {
  isDrawing = true;
  const rect = signatureCanvas.getBoundingClientRect();
  signatureCtx.beginPath();
  signatureCtx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
}

function draw(e) {
  if (!isDrawing) return;
  const rect = signatureCanvas.getBoundingClientRect();
  signatureCtx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
  signatureCtx.stroke();
}

function stopDrawing() {
  isDrawing = false;
}

function handleTouch(e) {
  e.preventDefault();
  const touch = e.touches[0];
  const mouseEvent = new MouseEvent(e.type === 'touchstart' ? 'mousedown' : 'mousemove', {
    clientX: touch.clientX,
    clientY: touch.clientY
  });
  signatureCanvas.dispatchEvent(mouseEvent);
}

function clearSignature() {
  signatureCtx.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
  currentInspectionState.signature = null;
}

// ============================================================
// Geolocalización
// ============================================================

function getLocation() {
  if ('geolocation' in navigator) {
    const statusEl = document.getElementById('location-status');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        currentInspectionState.latitude = position.coords.latitude;
        currentInspectionState.longitude = position.coords.longitude;
        currentInspectionState.accuracy = position.coords.accuracy;

        statusEl.innerHTML = `✅ Ubicación obtenida (Precisión: ${Math.round(position.coords.accuracy)}m)`;
        statusEl.classList.remove('error');
      },
      (error) => {
        statusEl.innerHTML = `⚠️ No se pudo obtener ubicación (${error.message})`;
        statusEl.classList.add('error');
      }
    );
  }
}

// ============================================================
// Navegación entre pasos
// ============================================================

function showStep(stepId) {
  document.querySelectorAll('.step-container').forEach(s => s.classList.remove('active'));
  document.getElementById(stepId).classList.add('active');
  window.scrollTo(0, 0);
}

function goToSignature() {
  // Capturar firma
  currentInspectionState.signature = signatureCanvas.toDataURL('image/png');
  showStep('step-signature');
}

function goToSummary() {
  showStep('step-summary');
  updateSummary();
}

function goBack() {
  const activeStep = document.querySelector('.step-container.active').id;
  if (activeStep === 'step-checklist') {
    showStep('step-select-unit');
  } else if (activeStep === 'step-signature') {
    showStep('step-checklist');
  } else if (activeStep === 'step-summary') {
    showStep('step-signature');
  }
}

// ============================================================
// Resumen
// ============================================================

function renderProgressBar() {
  const total = currentInspectionState.checklist.length;
  const progressBar = document.getElementById('progress-bar');
  progressBar.innerHTML = Array(total).fill(null).map(() => '<div class="progress-step"></div>').join('');
  updateProgressBar();
}

function updateProgressBar() {
  const checklist = currentInspectionState.checklist;
  const total = checklist.length;
  const answered = checklist.filter(c => c.status !== null).length;

  document.querySelectorAll('.progress-step').forEach((step, idx) => {
    step.classList.remove('active', 'completed');
    if (idx < answered) {
      step.classList.add('completed');
    } else if (idx === answered) {
      step.classList.add('active');
    }
  });
}

function updateSummary() {
  const checklist = currentInspectionState.checklist;
  const okCount = checklist.filter(c => c.status === 'ok').length;
  const failCount = checklist.filter(c => c.status === 'fail').length;
  const naCount = checklist.filter(c => c.status === 'na').length;

  document.getElementById('stat-ok').textContent = okCount;
  document.getElementById('stat-fail').textContent = failCount;
  document.getElementById('stat-na').textContent = naCount;

  const statusSummary = document.getElementById('inspection-status-summary');
  if (failCount === 0) {
    statusSummary.innerHTML = '<span style="color: #27ae60;">✅ APTO PARA VIAJE</span>';
  } else {
    statusSummary.innerHTML = `<span style="color: #e74c3c;">⚠️ ${failCount} FALLA(S) DETECTADA(S)</span>`;
  }
}

// ============================================================
// Enviar Inspección
// ============================================================

async function submitInspection() {
  try {
    // Generar QR público ID
    const qrPublicId = `INS-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    const data = {
      user_id: currentUser.id,
      unit_id: currentInspectionState.unit_id,
      checklist: currentInspectionState.checklist,
      latitude: currentInspectionState.latitude,
      longitude: currentInspectionState.longitude,
      accuracy: currentInspectionState.accuracy,
      operator_signature: currentInspectionState.signature,
      status: currentInspectionState.checklist.some(c => c.status === 'fail') ? 'failed' : 'completed',
      qr_public_id: qrPublicId,
      completed_at: new Date().toISOString()
    };

    const { data: result, error } = await supabase
      .from('inspections')
      .insert([data])
      .select()
      .single();

    if (error) throw error;

    showMessage('✅ Inspección completada y guardada', 'success', 'form-message-container');

    // Generar PDF
    setTimeout(() => {
      generateInspectionPdf(result);
    }, 1000);

    // Limpiar y volver a lista
    resetInspectionForm();
    await loadInspecciones();
    switchTab('lista');
  } catch (err) {
    console.error('Error:', err);
    showMessage(`Error: ${err.message}`, 'error', 'form-message-container');
  }
}

function resetInspectionForm() {
  currentInspectionState = {
    unit_id: null,
    checklist: [],
    latitude: null,
    longitude: null,
    accuracy: null,
    signature: null,
    fotos: {}
  };
  clearSignature();
  document.getElementById('unit_id').value = '';
  showStep('step-select-unit');
}

// ============================================================
// Generar PDF
// ============================================================

function generateInspectionPdf(insp) {
  const htmlContent = generateInspectionHtml(insp);

  const opt = {
    margin: 10,
    filename: `Inspeccion_${insp.qr_public_id}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
  };

  const element = document.createElement('div');
  element.innerHTML = htmlContent;
  document.body.appendChild(element);

  html2pdf().set(opt).from(element).save();
  document.body.removeChild(element);
}

function generateInspectionHtml(insp) {
  const fecha = new Date(insp.completed_at || insp.created_at).toLocaleDateString('es-MX');
  const okCount = (insp.checklist || []).filter(c => c.status === 'ok').length;
  const failCount = (insp.checklist || []).filter(c => c.status === 'fail').length;

  const checklist = insp.checklist || [];
  const categories = [...new Set(checklist.map(c => c.category))];

  return `
    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 800px;">
      <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px;">
        <h2 style="margin: 0;">REPORTE DE INSPECCIÓN PRE-VIAJE</h2>
        <p style="margin: 5px 0; color: #666; font-size: 12px;">NOM-012-SCT-2-2017</p>
      </div>

      <table style="width: 100%; margin-bottom: 15px; font-size: 11px;">
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px;">
            <strong>ID Inspección:</strong> ${insp.qr_public_id}
          </td>
          <td style="border: 1px solid #ddd; padding: 8px;">
            <strong>Fecha:</strong> ${fecha}
          </td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">
            <div id="qr-container-${insp.id}" style="width: 60px; height: 60px; display: inline-block;"></div>
          </td>
        </tr>
      </table>

      <div style="margin-bottom: 15px; font-size: 11px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="background: #f0f0f0;">
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Unidad</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Apto</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Fallas</th>
          </tr>
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px;">${insp.unit_id}</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;"><strong>${okCount}</strong></td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;"><strong>${failCount}</strong></td>
          </tr>
        </table>
      </div>

      <h3 style="font-size: 12px; margin-top: 15px; margin-bottom: 10px;">Checklist Detallado</h3>
      ${categories.map(cat => `
        <div style="margin-bottom: 15px;">
          <h4 style="font-size: 11px; background: #d4a574; color: white; padding: 5px; margin: 0 0 5px 0;">${cat}</h4>
          <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
            ${checklist.filter(c => c.category === cat).map(item => `
              <tr>
                <td style="border: 1px solid #ddd; padding: 5px; width: 60%;">${item.label}</td>
                <td style="border: 1px solid #ddd; padding: 5px; text-align: center; width: 15%;">
                  ${item.status === 'ok' ? '✅' : item.status === 'fail' ? '❌' : '⏸️'}
                </td>
                <td style="border: 1px solid #ddd; padding: 5px; width: 25%; font-size: 9px;">${item.notes || '--'}</td>
              </tr>
            `).join('')}
          </table>
        </div>
      `).join('')}

      <div style="margin-top: 20px; padding-top: 10px; border-top: 1px solid #ddd; font-size: 10px; color: #666;">
        <p style="margin: 5px 0;">Generado por OperadorPro</p>
        <p style="margin: 5px 0;">Ubicación: ${insp.latitude ? insp.latitude.toFixed(6) : 'N/A'}, ${insp.longitude ? insp.longitude.toFixed(6) : 'N/A'}</p>
      </div>
    </div>

    <script>
      setTimeout(() => {
        new QRCode(document.getElementById('qr-container-${insp.id}'), {
          text: '${insp.qr_public_id}',
          width: 60,
          height: 60
        });
      }, 500);
    </script>
  `;
}

// ============================================================
// Ver Detalle
// ============================================================

function viewInspectionDetail(inspId) {
  const insp = inspecciones.find(i => i.id === inspId);
  if (!insp) return;

  const okCount = (insp.checklist || []).filter(c => c.status === 'ok').length;
  const failCount = (insp.checklist || []).filter(c => c.status === 'fail').length;

  const html = `
    <h2>Detalle de Inspección</h2>
    <p><strong>ID:</strong> ${insp.qr_public_id}</p>
    <p><strong>Fecha:</strong> ${new Date(insp.created_at).toLocaleDateString('es-MX')}</p>
    <p><strong>Unidad:</strong> ${insp.unit_id}</p>
    <p><strong>Status:</strong> ${insp.status.toUpperCase()}</p>
    <p><strong>OK:</strong> ${okCount} | <strong>Fallas:</strong> ${failCount}</p>
    ${insp.qr_public_id ? `<p><strong>Verificable:</strong> ${insp.qr_public_id}</p>` : ''}
    <div style="margin-top: 1.5rem;">
      <button class="btn btn-primary" onclick="generateInspectionPdf({id: '${insp.id}', qr_public_id: '${insp.qr_public_id}', checklist: ${JSON.stringify(insp.checklist)}, unit_id: '${insp.unit_id}', completed_at: '${insp.completed_at}'})">📄 Descargar PDF</button>
      <button class="btn btn-secondary" onclick="closeDetailModal()" style="margin-left: 0.5rem;">Cerrar</button>
    </div>
  `;

  document.getElementById('detail-content').innerHTML = html;
  document.getElementById('detailModal').style.display = 'block';
}

function closeDetailModal() {
  document.getElementById('detailModal').style.display = 'none';
}

// ============================================================
// UI Helpers
// ============================================================

function switchTab(tabName) {
  if (tabName === 'lista') {
    document.getElementById('tab-lista').style.display = 'block';
    document.getElementById('tab-crear').style.display = 'none';
  } else {
    document.getElementById('tab-lista').style.display = 'none';
    document.getElementById('tab-crear').style.display = 'block';
  }
  window.scrollTo(0, 0);
}

function showMessage(msg, type = 'info', containerId = 'message-container') {
  const container = document.getElementById(containerId);
  const msgEl = document.createElement('div');
  msgEl.className = type;
  msgEl.textContent = msg;
  container.innerHTML = '';
  container.appendChild(msgEl);

  setTimeout(() => {
    msgEl.remove();
  }, 3000);
}

function logout() {
  supabase.auth.signOut().then(() => {
    window.location.href = 'index.html';
  });
}
