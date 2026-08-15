// ============================================================
// flota.js — Gestión de Flota (Unidades + Documentos)
// ============================================================

let currentUser = null;
let unidades = [];
let documentos = [];
let currentUnitId = null;

// Mapeo de tipos de documento
const DOC_TYPES = {
  seguro_resp_civil: { label: 'Seguro Responsabilidad Civil', icon: '📋' },
  permiso_sict: { label: 'Permiso SICT', icon: '📜' },
  verificacion_tecnica: { label: 'Verificación Técnica', icon: '✅' },
  licencia_federal: { label: 'Licencia Federal', icon: '📋' },
  poliza_transporte: { label: 'Póliza de Transporte', icon: '📄' },
  constancia_no_deuda: { label: 'Constancia de No Deuda', icon: '✓' },
  otro: { label: 'Otro', icon: '📎' }
};

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
  await loadDocumentos();

  // Setup formulario
  document.getElementById('unitForm').addEventListener('submit', handleCreateUnit);
  document.getElementById('documentForm').addEventListener('submit', handleAddDocument);
});

// ============================================================
// Cargar Datos
// ============================================================

async function loadUnidades() {
  try {
    const loading = document.getElementById('loading');
    loading.style.display = 'block';

    const { data, error } = await supabase
      .from('units')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    unidades = data || [];

    renderUnitesGrid();
    loading.style.display = 'none';
  } catch (err) {
    console.error('Error cargando unidades:', err);
    showMessage('Error al cargar unidades', 'error');
  }
}

async function loadDocumentos() {
  try {
    const { data, error } = await supabase
      .from('unit_documents')
      .select('*')
      .in('unit_id', unidades.map(u => u.id))
      .order('expires_at', { ascending: true });

    if (error) throw error;
    documentos = data || [];

    renderExpiringAlerts();
  } catch (err) {
    console.error('Error cargando documentos:', err);
  }
}

// ============================================================
// Renderizar Grid de Unidades
// ============================================================

function renderUnitesGrid() {
  const container = document.getElementById('units-grid');

  if (unidades.length === 0) {
    container.innerHTML = '<p style="color: #999; text-align: center; padding: 2rem; grid-column: 1 / -1;">No hay unidades registradas. Crea la primera →</p>';
    return;
  }

  container.innerHTML = unidades.map(unit => {
    const unitDocs = documentos.filter(d => d.unit_id === unit.id);
    const today = new Date();

    // Clasificar documentos por estado
    const expiring30 = unitDocs.filter(d => {
      const expDate = new Date(d.expires_at);
      const days = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
      return days >= 0 && days <= 30;
    });

    const expiring7 = expiring30.filter(d => {
      const expDate = new Date(d.expires_at);
      const days = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
      return days <= 7;
    });

    const expired = unitDocs.filter(d => {
      const expDate = new Date(d.expires_at);
      return expDate < today;
    });

    return `
      <div class="unit-card">
        <div class="unit-card-header">
          <div>
            <div class="unit-name">${unit.name}</div>
            <div class="unit-placa">${unit.placa}</div>
          </div>
          <span class="active-badge ${!unit.active ? 'inactive-badge' : ''}">
            ${unit.active ? '✅ Activa' : '❌ Inactiva'}
          </span>
        </div>

        <div class="unit-meta">
          ${unit.config_vehicular ? `<div class="unit-meta-item"><strong>Tipo:</strong> ${unit.config_vehicular}</div>` : ''}
          ${unit.anio_modelo ? `<div class="unit-meta-item"><strong>Año:</strong> ${unit.anio_modelo}</div>` : ''}
          ${unit.vin ? `<div class="unit-meta-item"><strong>VIN:</strong> ${unit.vin}</div>` : ''}
        </div>

        <div class="documents-section">
          <div class="documents-title">📄 Documentos (${unitDocs.length})</div>
          ${unitDocs.map(doc => {
            const expDate = new Date(doc.expires_at);
            const days = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
            let badgeClass = 'doc-ok';
            let badgeText = '✅';

            if (expDate < today) {
              badgeClass = 'doc-critical';
              badgeText = '❌ Vencido';
            } else if (days <= 7) {
              badgeClass = 'doc-critical';
              badgeText = `⚠️ ${days}d`;
            } else if (days <= 15) {
              badgeClass = 'doc-warning';
              badgeText = `⚠️ ${days}d`;
            } else if (days <= 30) {
              badgeClass = 'doc-warning';
              badgeText = `📍 ${days}d`;
            }

            return `<span class="document-badge ${badgeClass}" title="${DOC_TYPES[doc.type]?.label}">${DOC_TYPES[doc.type]?.icon} ${badgeText}</span>`;
          }).join('')}
        </div>

        <div class="unit-actions">
          <button type="button" class="btn-small btn-primary-small" onclick="openDocumentsModal('${unit.id}')">📄 Documentos</button>
          <button type="button" class="btn-small btn-primary-small" onclick="editUnit('${unit.id}')">✏️ Editar</button>
          <button type="button" class="btn-small btn-secondary-small" onclick="toggleUnitStatus('${unit.id}', ${unit.active})">🔄 ${unit.active ? 'Desactivar' : 'Activar'}</button>
          <button type="button" class="btn-small btn-secondary-small" onclick="deleteUnit('${unit.id}')">🗑️ Eliminar</button>
        </div>
      </div>
    `;
  }).join('');
}

// ============================================================
// Alertas de Vencimiento
// ============================================================

function renderExpiringAlerts() {
  const container = document.getElementById('expiring-alerts');
  const today = new Date();

  // Documentos próximos a vencer (7 días)
  const criticalDocs = documentos.filter(d => {
    const expDate = new Date(d.expires_at);
    const days = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
    return days >= 0 && days <= 7;
  });

  if (criticalDocs.length === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = `
    <div class="alert-box">
      <div class="alert-title">⚠️ ${criticalDocs.length} Documento(s) por Vencer en 7 días</div>
      ${criticalDocs.map(doc => {
        const unit = unidades.find(u => u.id === doc.unit_id);
        const expDate = new Date(doc.expires_at);
        const days = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
        return `
          <div style="margin-top: 0.5rem; font-size: 0.9rem;">
            • <strong>${unit?.name} (${unit?.placa})</strong>: ${DOC_TYPES[doc.type]?.label} vence en ${days} días (${expDate.toLocaleDateString('es-MX')})
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// ============================================================
// Crear Unidad
// ============================================================

async function handleCreateUnit(e) {
  e.preventDefault();

  const data = {
    user_id: currentUser.id,
    name: document.getElementById('name').value,
    placa: document.getElementById('placa').value,
    config_vehicular: document.getElementById('config_vehicular').value || null,
    anio_modelo: document.getElementById('anio_modelo').value ? parseInt(document.getElementById('anio_modelo').value) : null,
    vin: document.getElementById('vin').value || null,
    notes: document.getElementById('notes').value || null,
    active: true
  };

  try {
    const { error } = await supabase
      .from('units')
      .insert([data]);

    if (error) throw error;

    showMessage('✅ Unidad creada exitosamente', 'success', 'form-message-container');

    document.getElementById('unitForm').reset();
    await loadUnidades();
    switchTab('lista');
  } catch (err) {
    console.error('Error:', err);
    showMessage(`Error: ${err.message}`, 'error', 'form-message-container');
  }
}

// ============================================================
// Editar Unidad
// ============================================================

function editUnit(unitId) {
  const unit = unidades.find(u => u.id === unitId);
  if (!unit) return;

  document.getElementById('name').value = unit.name;
  document.getElementById('placa').value = unit.placa;
  document.getElementById('config_vehicular').value = unit.config_vehicular || '';
  document.getElementById('anio_modelo').value = unit.anio_modelo || '';
  document.getElementById('vin').value = unit.vin || '';
  document.getElementById('notes').value = unit.notes || '';

  const form = document.getElementById('unitForm');
  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.textContent = '💾 Guardar Cambios';

  form.onsubmit = async (e) => {
    e.preventDefault();

    const updateData = {
      name: document.getElementById('name').value,
      placa: document.getElementById('placa').value,
      config_vehicular: document.getElementById('config_vehicular').value || null,
      anio_modelo: document.getElementById('anio_modelo').value ? parseInt(document.getElementById('anio_modelo').value) : null,
      vin: document.getElementById('vin').value || null,
      notes: document.getElementById('notes').value || null
    };

    try {
      const { error } = await supabase
        .from('units')
        .update(updateData)
        .eq('id', unitId);

      if (error) throw error;

      showMessage('✅ Unidad actualizada', 'success', 'form-message-container');
      document.getElementById('unitForm').reset();
      submitBtn.textContent = '💾 Crear Unidad';
      form.onsubmit = handleCreateUnit;
      await loadUnidades();
      switchTab('lista');
    } catch (err) {
      console.error('Error:', err);
      showMessage(`Error: ${err.message}`, 'error', 'form-message-container');
    }
  };

  switchTab('crear');
  window.scrollTo(0, 0);
}

// ============================================================
// Cambiar Status de Unidad
// ============================================================

async function toggleUnitStatus(unitId, currentActive) {
  try {
    const { error } = await supabase
      .from('units')
      .update({ active: !currentActive })
      .eq('id', unitId);

    if (error) throw error;

    showMessage(currentActive ? '✅ Unidad desactivada' : '✅ Unidad activada', 'success');
    await loadUnidades();
  } catch (err) {
    console.error('Error:', err);
    showMessage(`Error: ${err.message}`, 'error');
  }
}

// ============================================================
// Eliminar Unidad
// ============================================================

async function deleteUnit(unitId) {
  if (!confirm('¿Eliminar esta unidad y todos sus documentos?')) return;

  try {
    const { error } = await supabase
      .from('units')
      .delete()
      .eq('id', unitId);

    if (error) throw error;

    showMessage('✅ Unidad eliminada', 'success');
    await loadUnidades();
  } catch (err) {
    console.error('Error:', err);
    showMessage(`Error: ${err.message}`, 'error');
  }
}

// ============================================================
// Gestión de Documentos
// ============================================================

function openDocumentsModal(unitId) {
  currentUnitId = unitId;
  const unit = unidades.find(u => u.id === unitId);
  const unitDocs = documentos.filter(d => d.unit_id === unitId);

  document.getElementById('modal-title').textContent = `Documentos - ${unit?.name} (${unit?.placa})`;

  let html = '<div class="documents-list">';
  if (unitDocs.length === 0) {
    html += '<p style="color: #999;">No hay documentos registrados.</p>';
  } else {
    html += unitDocs.map(doc => {
      const expDate = new Date(doc.expires_at);
      const today = new Date();
      const days = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
      const daysText = days < 0 ? `Vencido hace ${Math.abs(days)} días` : `Vence en ${days} días`;

      return `
        <div class="document-item">
          <div class="document-item-info">
            <div>
              <strong>${DOC_TYPES[doc.type]?.label}</strong>
              <div style="margin-top: 0.25rem; color: #666; font-size: 0.85rem;">${daysText}</div>
            </div>
            <div>
              <strong>Vencimiento:</strong> ${expDate.toLocaleDateString('es-MX')}
              ${doc.number ? `<br><strong>Número:</strong> ${doc.number}` : ''}
            </div>
          </div>
          <div class="document-item-actions">
            <button type="button" class="btn-small btn-secondary-small" onclick="deleteDocument('${doc.id}')">🗑️ Eliminar</button>
          </div>
        </div>
      `;
    }).join('');
  }
  html += '</div>';

  document.getElementById('documents-content').innerHTML = html;
  document.getElementById('documentsModal').style.display = 'block';
}

function closeDocumentsModal() {
  document.getElementById('documentsModal').style.display = 'none';
  currentUnitId = null;
  document.getElementById('documentForm').reset();
}

async function handleAddDocument(e) {
  e.preventDefault();

  if (!currentUnitId) return;

  const data = {
    unit_id: currentUnitId,
    type: document.getElementById('doc_type').value,
    number: document.getElementById('doc_number').value || null,
    issuer: document.getElementById('doc_issuer').value || null,
    expires_at: document.getElementById('doc_expires_at').value
  };

  try {
    const { error } = await supabase
      .from('unit_documents')
      .insert([data]);

    if (error) throw error;

    showMessage('✅ Documento agregado', 'success');
    document.getElementById('documentForm').reset();
    await loadDocumentos();
    openDocumentsModal(currentUnitId); // Recargar modal
  } catch (err) {
    console.error('Error:', err);
    showMessage(`Error: ${err.message}`, 'error');
  }
}

async function deleteDocument(docId) {
  if (!confirm('¿Eliminar este documento?')) return;

  try {
    const { error } = await supabase
      .from('unit_documents')
      .delete()
      .eq('id', docId);

    if (error) throw error;

    showMessage('✅ Documento eliminado', 'success');
    await loadDocumentos();
    openDocumentsModal(currentUnitId); // Recargar modal
  } catch (err) {
    console.error('Error:', err);
    showMessage(`Error: ${err.message}`, 'error');
  }
}

// ============================================================
// UI Helpers
// ============================================================

function switchTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

  const isLista = tabName === 'lista';
  document.getElementById(isLista ? 'tab-lista' : 'tab-crear').classList.add('active');
  const btns = document.querySelectorAll('.tab-btn');
  if (btns[isLista ? 0 : 1]) btns[isLista ? 0 : 1].classList.add('active');
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
