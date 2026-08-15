// ============================================================
// carta-porte.js — Gestión de Cartas Porte 3.1
// ============================================================

let currentUser = null;
let cartasPorte = [];
let clientes = [];
let mercancias = [];
let editingCartaId = null;

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

  // Cargar datos iniciales
  await loadClientes();
  await loadCartasPorte();

  // Preparar form
  document.getElementById('cartaForm').addEventListener('submit', handleSaveCartaPorte);
  document.getElementById('clientForm').addEventListener('submit', handleCreateClient);

  // Inicializar mercancías
  addMercancia();
});

// ============================================================
// Cargar Datos
// ============================================================

async function loadClientes() {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('name');

    if (error) throw error;
    clientes = data || [];

    // Actualizar select de clientes
    const select = document.getElementById('client_id');
    select.innerHTML = '<option value="">-- Seleccionar cliente --</option>';
    select.innerHTML += '<option value="new">➕ Crear nuevo cliente</option>';
    clientes.forEach(c => {
      select.innerHTML += `<option value="${c.id}">${c.name} (${c.rfc || 'Sin RFC'})</option>`;
    });

    select.addEventListener('change', (e) => {
      if (e.target.value === 'new') {
        openClientModal();
        e.target.value = '';
      }
    });
  } catch (err) {
    console.error('Error cargando clientes:', err);
  }
}

async function loadCartasPorte() {
  try {
    const loading = document.getElementById('loading');
    loading.style.display = 'block';

    const { data, error } = await supabase
      .from('carta_portes')
      .select('*, clients(name, rfc)')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    cartasPorte = data || [];

    renderCartasList();
    loading.style.display = 'none';
  } catch (err) {
    console.error('Error cargando cartas porte:', err);
    showMessage('Error al cargar cartas porte', 'error');
  }
}

// ============================================================
// Renderizar Lista
// ============================================================

function renderCartasList() {
  const container = document.getElementById('carta-list');

  if (cartasPorte.length === 0) {
    container.innerHTML = '<p style="color: #999; text-align: center; padding: 2rem;">No hay cartas porte. Crea la primera →</p>';
    return;
  }

  container.innerHTML = cartasPorte.map(carta => `
    <div class="carta-card" onclick="viewCarta('${carta.id}')">
      <div class="carta-card-header">
        <div>
          <div class="carta-folio">Folio: ${carta.folio || '(Sin folio - Draft)'}</div>
          <div style="font-size: 0.9rem; color: #666; margin-top: 0.25rem;">
            ${carta.clients?.name || 'Cliente no especificado'}
          </div>
        </div>
        <span class="status-badge status-${carta.status}">${carta.status.toUpperCase()}</span>
      </div>
      <div class="carta-card-meta">
        <div>
          <strong>Origen:</strong> ${carta.origen_nombre || '--'}
        </div>
        <div>
          <strong>Destino:</strong> ${carta.destino_nombre || '--'}
        </div>
        <div>
          <strong>Vehículo:</strong> ${carta.placa_vm || '--'}
        </div>
        <div>
          <strong>Creada:</strong> ${new Date(carta.created_at).toLocaleDateString('es-MX')}
        </div>
      </div>
      <div class="carta-card-actions">
        <button type="button" class="btn-small btn-primary-small" onclick="editCarta(event, '${carta.id}')">✏️ Editar</button>
        <button type="button" class="btn-small btn-primary-small" onclick="duplicateCarta(event, '${carta.id}')">📋 Duplicar</button>
        <button type="button" class="btn-small btn-primary-small" onclick="generatePdf(event, '${carta.id}')">📄 PDF + QR</button>
        <button type="button" class="btn-small btn-secondary-small" onclick="deleteCarta(event, '${carta.id}')">🗑️ Eliminar</button>
      </div>
    </div>
  `).join('');
}

// ============================================================
// Crear/Editar Carta Porte
// ============================================================

async function handleSaveCartaPorte(e) {
  e.preventDefault();

  const formData = new FormData(document.getElementById('cartaForm'));
  const data = {
    user_id: currentUser.id,
    client_id: formData.get('client_id') || null,
    origen_rfc: formData.get('origen_rfc'),
    origen_nombre: formData.get('origen_nombre'),
    origen_domicilio: formData.get('origen_domicilio'),
    origen_fecha_hora: formData.get('origen_fecha_hora'),
    destino_rfc: formData.get('destino_rfc'),
    destino_nombre: formData.get('destino_nombre'),
    destino_domicilio: formData.get('destino_domicilio'),
    destino_fecha_hora: formData.get('destino_fecha_hora'),
    mercancias: mercancias,
    placa_vm: formData.get('placa_vm'),
    anio_modelo_vm: formData.get('anio_modelo_vm') ? parseInt(formData.get('anio_modelo_vm')) : null,
    permiso_sict: formData.get('permiso_sict'),
    config_vehicular: formData.get('config_vehicular'),
    asegura_resp_civil: formData.get('asegura_resp_civil'),
    poliza_resp_civil: formData.get('poliza_resp_civil'),
    operador_rfc: formData.get('operador_rfc'),
    operador_nombre: formData.get('operador_nombre'),
    operador_licencia: formData.get('operador_licencia'),
    operador_residencia: formData.get('operador_residencia'),
    observaciones: formData.get('observaciones'),
    status: 'draft'
  };

  try {
    let result;
    if (editingCartaId) {
      result = await supabase
        .from('carta_portes')
        .update(data)
        .eq('id', editingCartaId);
    } else {
      result = await supabase
        .from('carta_portes')
        .insert([data]);
    }

    if (result.error) throw result.error;

    showMessage(editingCartaId ? 'Carta Porte actualizada ✅' : 'Carta Porte creada ✅', 'success', 'form-message-container');

    editingCartaId = null;
    document.getElementById('cartaForm').reset();
    mercancias = [];
    addMercancia();

    await loadCartasPorte();
    switchTab('lista');
  } catch (err) {
    console.error('Error guardando:', err);
    showMessage(`Error: ${err.message}`, 'error', 'form-message-container');
  }
}

// ============================================================
// Acciones sobre Cartas
// ============================================================

function editCarta(e, cartaId) {
  e.stopPropagation();
  const carta = cartasPorte.find(c => c.id === cartaId);
  if (!carta) return;

  editingCartaId = cartaId;
  mercancias = carta.mercancias || [];

  // Llenar form
  document.getElementById('client_id').value = carta.client_id || '';
  document.getElementById('origen_rfc').value = carta.origen_rfc || '';
  document.getElementById('origen_nombre').value = carta.origen_nombre || '';
  document.getElementById('origen_domicilio').value = carta.origen_domicilio || '';
  document.getElementById('origen_fecha_hora').value = carta.origen_fecha_hora ? carta.origen_fecha_hora.slice(0, 16) : '';
  document.getElementById('destino_rfc').value = carta.destino_rfc || '';
  document.getElementById('destino_nombre').value = carta.destino_nombre || '';
  document.getElementById('destino_domicilio').value = carta.destino_domicilio || '';
  document.getElementById('destino_fecha_hora').value = carta.destino_fecha_hora ? carta.destino_fecha_hora.slice(0, 16) : '';
  document.getElementById('placa_vm').value = carta.placa_vm || '';
  document.getElementById('anio_modelo_vm').value = carta.anio_modelo_vm || '';
  document.getElementById('permiso_sict').value = carta.permiso_sict || '';
  document.getElementById('config_vehicular').value = carta.config_vehicular || '';
  document.getElementById('asegura_resp_civil').value = carta.asegura_resp_civil || '';
  document.getElementById('poliza_resp_civil').value = carta.poliza_resp_civil || '';
  document.getElementById('operador_rfc').value = carta.operador_rfc || '';
  document.getElementById('operador_nombre').value = carta.operador_nombre || '';
  document.getElementById('operador_licencia').value = carta.operador_licencia || '';
  document.getElementById('operador_residencia').value = carta.operador_residencia || '';
  document.getElementById('observaciones').value = carta.observaciones || '';

  renderMercancias();
  switchTab('crear');
  window.scrollTo(0, 0);
}

async function duplicateCarta(e, cartaId) {
  e.stopPropagation();
  const carta = cartasPorte.find(c => c.id === cartaId);
  if (!carta) return;

  try {
    const newCarta = { ...carta };
    delete newCarta.id;
    delete newCarta.created_at;
    delete newCarta.updated_at;
    delete newCarta.folio;
    delete newCarta.qr_data;
    delete newCarta.pdf_url;
    newCarta.status = 'draft';

    const { error } = await supabase
      .from('carta_portes')
      .insert([newCarta]);

    if (error) throw error;

    showMessage('Carta Porte duplicada ✅', 'success');
    await loadCartasPorte();
  } catch (err) {
    console.error('Error duplicando:', err);
    showMessage(`Error: ${err.message}`, 'error');
  }
}

async function deleteCarta(e, cartaId) {
  e.stopPropagation();
  if (!confirm('¿Eliminar esta Carta Porte?')) return;

  try {
    const { error } = await supabase
      .from('carta_portes')
      .delete()
      .eq('id', cartaId);

    if (error) throw error;

    showMessage('Carta Porte eliminada ✅', 'success');
    await loadCartasPorte();
  } catch (err) {
    console.error('Error eliminando:', err);
    showMessage(`Error: ${err.message}`, 'error');
  }
}

function viewCarta(cartaId) {
  editCarta({ stopPropagation: () => {} }, cartaId);
}

// ============================================================
// Mercancías
// ============================================================

function addMercancia() {
  mercancias.push({
    descripcion: '',
    cantidad: 1,
    unidad: 'KG',
    peso_kg: 0
  });
  renderMercancias();
}

function renderMercancias() {
  const container = document.getElementById('mercancias-list');
  container.innerHTML = mercancias.map((m, i) => `
    <div class="mercancia-item">
      <input type="text" placeholder="Descripción (ej: Cajas de plátano)" value="${m.descripcion}"
        onchange="mercancias[${i}].descripcion = this.value">
      <input type="number" placeholder="Cantidad" value="${m.cantidad}"
        onchange="mercancias[${i}].cantidad = parseInt(this.value)">
      <select onchange="mercancias[${i}].unidad = this.value">
        <option value="KG" ${m.unidad === 'KG' ? 'selected' : ''}>KG</option>
        <option value="TON" ${m.unidad === 'TON' ? 'selected' : ''}>TON</option>
        <option value="PZAS" ${m.unidad === 'PZAS' ? 'selected' : ''}>PZAS</option>
        <option value="CAJAS" ${m.unidad === 'CAJAS' ? 'selected' : ''}>CAJAS</option>
      </select>
      <input type="number" placeholder="Peso (kg)" value="${m.peso_kg}"
        onchange="mercancias[${i}].peso_kg = parseFloat(this.value)">
      <button type="button" class="btn-small btn-secondary-small" onclick="removeMercancia(${i})">🗑️</button>
    </div>
  `).join('');
}

function removeMercancia(index) {
  mercancias.splice(index, 1);
  renderMercancias();
}

// ============================================================
// Generar PDF + QR
// ============================================================

async function generatePdf(e, cartaId) {
  e.stopPropagation();
  const carta = cartasPorte.find(c => c.id === cartaId);
  if (!carta) return;

  try {
    // Generar folio si no existe
    if (!carta.folio) {
      const folio = `CP-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 999999)).padStart(6, '0')}`;
      await supabase
        .from('carta_portes')
        .update({ folio })
        .eq('id', cartaId);
      carta.folio = folio;
    }

    // Generar QR data
    const qrData = JSON.stringify({
      folio: carta.folio,
      origen: carta.origen_nombre,
      destino: carta.destino_nombre,
      placa: carta.placa_vm,
      fecha: new Date().toISOString()
    });

    // Generar HTML del PDF
    const htmlContent = generateCartaPorteHtml(carta, qrData);

    // Convertir a PDF
    const element = document.createElement('div');
    element.innerHTML = htmlContent;
    document.body.appendChild(element);

    const opt = {
      margin: 10,
      filename: `CartaPorte_${carta.folio}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
    };

    html2pdf().set(opt).from(element).save();
    document.body.removeChild(element);

    showMessage('PDF generado ✅', 'success');
  } catch (err) {
    console.error('Error generando PDF:', err);
    showMessage(`Error: ${err.message}`, 'error');
  }
}

function generateCartaPorteHtml(carta, qrData) {
  const fecha = new Date(carta.created_at).toLocaleDateString('es-MX');

  return `
    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto;">
      <!-- Encabezado -->
      <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px;">
        <h2 style="margin: 0;">CARTA PORTE 3.1</h2>
        <p style="margin: 5px 0; color: #666; font-size: 12px;">Sistema de Autotransporte Terrestre de Carga</p>
      </div>

      <!-- Información Básica -->
      <table style="width: 100%; margin-bottom: 15px; font-size: 11px;">
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px;">
            <strong>Folio:</strong> ${carta.folio || 'N/A'}
          </td>
          <td style="border: 1px solid #ddd; padding: 8px;">
            <strong>Fecha Emisión:</strong> ${fecha}
          </td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">
            <div id="qrcode-container" style="width: 60px; height: 60px; display: inline-block;"></div>
          </td>
        </tr>
      </table>

      <!-- Origen y Destino -->
      <table style="width: 100%; margin-bottom: 15px; font-size: 10px;">
        <tr>
          <td style="width: 50%; border: 1px solid #ddd; padding: 10px; vertical-align: top;">
            <strong>ORIGEN (Remitente)</strong>
            <p style="margin: 5px 0;">
              <strong>RFC:</strong> ${carta.origen_rfc || '--'}<br>
              <strong>Nombre:</strong> ${carta.origen_nombre || '--'}<br>
              <strong>Domicilio:</strong> ${carta.origen_domicilio || '--'}<br>
              <strong>Fecha/Hora:</strong> ${carta.origen_fecha_hora ? new Date(carta.origen_fecha_hora).toLocaleString('es-MX') : '--'}
            </p>
          </td>
          <td style="width: 50%; border: 1px solid #ddd; padding: 10px; vertical-align: top;">
            <strong>DESTINO (Destinatario)</strong>
            <p style="margin: 5px 0;">
              <strong>RFC:</strong> ${carta.destino_rfc || '--'}<br>
              <strong>Nombre:</strong> ${carta.destino_nombre || '--'}<br>
              <strong>Domicilio:</strong> ${carta.destino_domicilio || '--'}<br>
              <strong>Fecha/Hora EST.:</strong> ${carta.destino_fecha_hora ? new Date(carta.destino_fecha_hora).toLocaleString('es-MX') : '--'}
            </p>
          </td>
        </tr>
      </table>

      <!-- Mercancías -->
      <div style="margin-bottom: 15px;">
        <strong style="font-size: 11px;">MERCANCÍAS</strong>
        <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
          <tr style="background: #f0f0f0;">
            <th style="border: 1px solid #ddd; padding: 5px; text-align: left;">Descripción</th>
            <th style="border: 1px solid #ddd; padding: 5px; text-align: center;">Cant.</th>
            <th style="border: 1px solid #ddd; padding: 5px; text-align: center;">Unidad</th>
            <th style="border: 1px solid #ddd; padding: 5px; text-align: right;">Peso (kg)</th>
          </tr>
          ${(carta.mercancias || []).map(m => `
            <tr>
              <td style="border: 1px solid #ddd; padding: 5px;">${m.descripcion || '--'}</td>
              <td style="border: 1px solid #ddd; padding: 5px; text-align: center;">${m.cantidad || 0}</td>
              <td style="border: 1px solid #ddd; padding: 5px; text-align: center;">${m.unidad || '--'}</td>
              <td style="border: 1px solid #ddd; padding: 5px; text-align: right;">${m.peso_kg || 0}</td>
            </tr>
          `).join('')}
        </table>
      </div>

      <!-- Vehículo y Operador -->
      <table style="width: 100%; margin-bottom: 15px; font-size: 10px;">
        <tr>
          <td style="width: 50%; border: 1px solid #ddd; padding: 10px; vertical-align: top;">
            <strong>VEHÍCULO</strong>
            <p style="margin: 5px 0;">
              <strong>Placa:</strong> ${carta.placa_vm || '--'}<br>
              <strong>Config.:</strong> ${carta.config_vehicular || '--'}<br>
              <strong>Año:</strong> ${carta.anio_modelo_vm || '--'}<br>
              <strong>Permiso SICT:</strong> ${carta.permiso_sict || '--'}
            </p>
          </td>
          <td style="width: 50%; border: 1px solid #ddd; padding: 10px; vertical-align: top;">
            <strong>OPERADOR</strong>
            <p style="margin: 5px 0;">
              <strong>RFC:</strong> ${carta.operador_rfc || '--'}<br>
              <strong>Nombre:</strong> ${carta.operador_nombre || '--'}<br>
              <strong>Licencia:</strong> ${carta.operador_licencia || '--'}<br>
              <strong>Residencia:</strong> ${carta.operador_residencia || '--'}
            </p>
          </td>
        </tr>
      </table>

      <!-- Status -->
      <div style="text-align: center; margin-top: 20px; padding-top: 10px; border-top: 1px solid #ddd; font-size: 10px; color: #666;">
        <p>Status: <strong>${carta.status.toUpperCase()}</strong></p>
        <p style="margin: 5px 0;">Documento generado automáticamente por OperadorPro</p>
      </div>
    </div>

    <script>
      setTimeout(() => {
        new QRCode(document.getElementById('qrcode-container'), {
          text: '${qrData}',
          width: 60,
          height: 60
        });
      }, 500);
    </script>
  `;
}

// ============================================================
// Gestión de Clientes
// ============================================================

function openClientModal() {
  document.getElementById('clientModal').style.display = 'flex';
}

function closeClientModal() {
  document.getElementById('clientModal').style.display = 'none';
  document.getElementById('clientForm').reset();
}

async function handleCreateClient(e) {
  e.preventDefault();

  const data = {
    user_id: currentUser.id,
    name: document.getElementById('newClientName').value,
    rfc: document.getElementById('newClientRfc').value,
    email: document.getElementById('newClientEmail').value,
    phone: document.getElementById('newClientPhone').value
  };

  const modalMsg = document.getElementById('client-modal-msg');
  modalMsg.style.display = 'none';

  try {
    const { error } = await supabase
      .from('clients')
      .insert([data]);

    if (error) throw error;

    closeClientModal();
    showMessage('Cliente creado ✅', 'success', 'form-message-container');
    await loadClientes();
  } catch (err) {
    console.error('Error creando cliente:', err);
    modalMsg.textContent = `Error: ${err.message}`;
    modalMsg.style.display = 'block';
  }
}

// ============================================================
// UI Helpers
// ============================================================

function switchTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

  document.getElementById(`tab-${tabName}`).classList.add('active');
  const btns = document.querySelectorAll('.tab-btn');
  const idx = tabName === 'lista' ? 0 : 1;
  if (btns[idx]) btns[idx].classList.add('active');
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
