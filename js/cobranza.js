// ============================================================
// cobranza.js — Gestión de Cobros de Fletes
// WhatsApp deep links (sin costo de API)
// ============================================================

let currentUser = null;
let cobros = [];
let cartasPorte = [];
let clientes = [];

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
  await loadCartasPorte();
  await loadCobros();

  // Setup formulario
  document.getElementById('collectionForm').addEventListener('submit', handleCreateCollection);
  document.getElementById('carta_porte_id').addEventListener('change', onCartaPorteChange);
  document.getElementById('amount').addEventListener('input', updateMessagePreview);
  document.getElementById('client_phone').addEventListener('input', updateMessagePreview);
  document.getElementById('notes').addEventListener('input', updateMessagePreview);
});

// ============================================================
// Cargar Datos
// ============================================================

async function loadCartasPorte() {
  try {
    const { data, error } = await supabase
      .from('carta_portes')
      .select('*, clients(name, rfc, phone)')
      .eq('user_id', currentUser.id)
      .in('status', ['ready', 'stamped'])
      .order('created_at', { ascending: false });

    if (error) throw error;
    cartasPorte = data || [];

    // Actualizar select
    const select = document.getElementById('carta_porte_id');
    select.innerHTML = '<option value="">-- Selecciona una Carta Porte --</option>';
    cartasPorte.forEach(cp => {
      select.innerHTML += `
        <option value="${cp.id}" data-client-id="${cp.client_id}" data-client-name="${cp.clients?.name || 'N/A'}" data-client-phone="${cp.clients?.phone || ''}">
          ${cp.folio || 'Sin folio'} → ${cp.destino_nombre || 'Destino N/A'}
        </option>
      `;
    });
  } catch (err) {
    console.error('Error cargando cartas porte:', err);
  }
}

async function loadCobros() {
  try {
    const loading = document.getElementById('loading');
    loading.style.display = 'block';

    const { data, error } = await supabase
      .from('freight_collections')
      .select(`
        *,
        carta_portes(folio, destino_nombre),
        clients(name, phone)
      `)
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    cobros = data || [];

    renderCollectionsList();
    updateStats();
    loading.style.display = 'none';
  } catch (err) {
    console.error('Error cargando cobros:', err);
    showMessage('Error al cargar cobros', 'error');
  }
}

// ============================================================
// Renderizar Lista de Cobros
// ============================================================

function renderCollectionsList() {
  const container = document.getElementById('collection-list');

  if (cobros.length === 0) {
    container.innerHTML = '<p style="color: #999; text-align: center; padding: 2rem;">No hay cobros registrados. Crea el primero →</p>';
    return;
  }

  container.innerHTML = cobros.map(cobro => {
    const fecha = new Date(cobro.created_at).toLocaleDateString('es-MX');
    const montoFormato = `$${cobro.amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    return `
      <div class="collection-card">
        <div class="collection-card-header">
          <div>
            <div class="collection-folio">Folio: ${cobro.carta_portes?.folio || 'N/A'}</div>
            <div class="collection-client">${cobro.clients?.name || 'Cliente N/A'}</div>
          </div>
          <span class="status-badge status-${cobro.status}">${cobro.status.toUpperCase()}</span>
        </div>
        <div class="amount-display">${montoFormato} ${cobro.currency}</div>
        <div class="collection-meta">
          <div>
            <strong>Destino:</strong> ${cobro.carta_portes?.destino_nombre || '--'}
          </div>
          <div>
            <strong>Vencimiento:</strong> ${cobro.due_date ? new Date(cobro.due_date).toLocaleDateString('es-MX') : 'Sin fecha'}
          </div>
          <div>
            <strong>Creado:</strong> ${fecha}
          </div>
          <div>
            <strong>Recordatorios:</strong> ${cobro.reminders_sent || 0}
          </div>
        </div>
        <div class="collection-actions">
          <button type="button" class="btn-small btn-whatsapp" onclick="sendReminder('${cobro.id}')">📱 Enviar Recordatorio</button>
          <button type="button" class="btn-small btn-primary-small" onclick="markAsPaid('${cobro.id}')">✅ Marcar como Pagado</button>
          <button type="button" class="btn-small btn-secondary-small" onclick="deleteCobro('${cobro.id}')">🗑️ Eliminar</button>
        </div>
      </div>
    `;
  }).join('');
}

// ============================================================
// Crear Cobro
// ============================================================

async function handleCreateCollection(e) {
  e.preventDefault();

  const cartaPorteId = document.getElementById('carta_porte_id').value;
  if (!cartaPorteId) {
    showMessage('Selecciona una Carta Porte', 'error', 'form-message-container');
    return;
  }

  const cartaPorte = cartasPorte.find(cp => cp.id === cartaPorteId);
  if (!cartaPorte) return;

  const data = {
    user_id: currentUser.id,
    carta_porte_id: cartaPorteId,
    client_id: cartaPorte.client_id,
    amount: parseFloat(document.getElementById('amount').value),
    currency: document.getElementById('currency').value,
    due_date: document.getElementById('due_date').value || null,
    notes: document.getElementById('notes').value,
    status: 'pending'
  };

  try {
    const { error } = await supabase
      .from('freight_collections')
      .insert([data]);

    if (error) throw error;

    showMessage('✅ Cobro creado exitosamente', 'success', 'form-message-container');

    document.getElementById('collectionForm').reset();
    await loadCobros();
    switchTab('lista');
  } catch (err) {
    console.error('Error:', err);
    showMessage(`Error: ${err.message}`, 'error', 'form-message-container');
  }
}

// ============================================================
// Cambio de Carta Porte (auto-llenar cliente)
// ============================================================

function onCartaPorteChange(e) {
  const selectedOption = e.target.options[e.target.selectedIndex];
  const clientName = selectedOption.getAttribute('data-client-name');
  const clientPhone = selectedOption.getAttribute('data-client-phone');

  document.getElementById('client_name').value = clientName || '';
  document.getElementById('client_phone').value = clientPhone || '';

  updateMessagePreview();
}

// ============================================================
// Generar Mensaje de WhatsApp
// ============================================================

function buildWhatsAppMessage() {
  const cartaPorteId = document.getElementById('carta_porte_id').value;
  const cartaPorte = cartasPorte.find(cp => cp.id === cartaPorteId);
  if (!cartaPorte) return null;

  const clientName = document.getElementById('client_name').value || 'Cliente';
  const amount = parseFloat(document.getElementById('amount').value) || 0;
  const businessName = 'OperadorPro'; // Se tomaría del perfil del usuario después

  const folio = cartaPorte.folio || 'SIN FOLIO';
  const amountFormatted = amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return {
    message: `Hola ${clientName},

Te escribimos de ${businessName}.

Te recordamos el pago pendiente del flete correspondiente a la Carta Porte *${folio}* por un monto de *$${amountFormatted} MXN*.

Quedamos atentos a tu confirmación de pago.

¡Gracias!`,
    whatsappLink: buildWhatsAppLink()
  };
}

function buildWhatsAppLink() {
  const phone = document.getElementById('client_phone').value.replace(/\D/g, '');
  if (!phone || phone.length < 10) return null;

  const msg = buildWhatsAppMessage();
  if (!msg) return null;

  const encoded = encodeURIComponent(msg.message);

  // Si el teléfono no tiene país, asumir México (+52)
  let fullPhone = phone;
  if (!phone.startsWith('52')) {
    fullPhone = '52' + phone;
  }

  return `https://wa.me/${fullPhone}?text=${encoded}`;
}

function updateMessagePreview() {
  const msg = buildWhatsAppMessage();
  if (!msg) {
    document.getElementById('message-preview').textContent = '⚠️ Completa los campos: Carta Porte, Monto y Teléfono';
    return;
  }

  document.getElementById('message-preview').textContent = msg.message;
}

// ============================================================
// Enviar Recordatorio por WhatsApp
// ============================================================

async function sendReminder(cobroId) {
  const cobro = cobros.find(c => c.id === cobroId);
  if (!cobro) return;

  // Preparar mensaje personalizado
  const clientPhone = cobro.clients?.phone;
  if (!clientPhone) {
    alert('El cliente no tiene teléfono registrado');
    return;
  }

  const clientName = cobro.clients?.name || 'Cliente';
  const folio = cobro.carta_portes?.folio || 'SIN FOLIO';
  const amount = cobro.amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const message = `Hola ${clientName},

Te recordamos el pago pendiente del flete correspondiente a la Carta Porte *${folio}* por un monto de *$${amount} ${cobro.currency}*.

Quedamos atentos a tu confirmación de pago.

¡Gracias!`;

  const encodedMsg = encodeURIComponent(message);
  const phone = clientPhone.replace(/\D/g, '');
  let fullPhone = phone;
  if (!phone.startsWith('52')) {
    fullPhone = '52' + phone;
  }

  const waLink = `https://wa.me/${fullPhone}?text=${encodedMsg}`;

  // Mostrar modal con opción de enviar
  document.getElementById('reminder-content').innerHTML = `
    <p><strong>Cliente:</strong> ${clientName}</p>
    <p><strong>Teléfono:</strong> ${clientPhone}</p>
    <p><strong>Monto:</strong> $${amount} ${cobro.currency}</p>
    <div style="background: #e8f5e9; border: 1px solid #c8e6c9; border-radius: 4px; padding: 1rem; margin: 1rem 0; font-size: 0.9rem; color: #2e7d32; font-family: monospace; white-space: pre-wrap; word-wrap: break-word;">
      ${message}
    </div>
  `;

  document.getElementById('send-whatsapp-btn').onclick = async () => {
    try {
      // Registrar recordatorio en DB
      const { error } = await supabase
        .from('collection_reminders')
        .insert([{
          collection_id: cobroId,
          reminder_type: 'whatsapp',
          status: 'sent'
        }]);

      if (error) throw error;

      // Actualizar contador de recordatorios
      await supabase
        .from('freight_collections')
        .update({
          reminders_sent: (cobro.reminders_sent || 0) + 1,
          last_reminder_sent_at: new Date().toISOString()
        })
        .eq('id', cobroId);

      // Abrir WhatsApp
      window.open(waLink, '_blank');

      showMessage('✅ Recordatorio enviado a WhatsApp', 'success');
      closeReminderModal();
      await loadCobros();
    } catch (err) {
      console.error('Error:', err);
      showMessage(`Error: ${err.message}`, 'error');
    }
  };

  document.getElementById('reminderModal').style.display = 'flex';
}

function closeReminderModal() {
  document.getElementById('reminderModal').style.display = 'none';
}

// ============================================================
// Acciones sobre Cobros
// ============================================================

async function markAsPaid(cobroId) {
  if (!confirm('¿Marcar este cobro como pagado?')) return;

  try {
    const { error } = await supabase
      .from('freight_collections')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString()
      })
      .eq('id', cobroId);

    if (error) throw error;

    showMessage('✅ Cobro marcado como pagado', 'success');
    await loadCobros();
  } catch (err) {
    console.error('Error:', err);
    showMessage(`Error: ${err.message}`, 'error');
  }
}

async function deleteCobro(cobroId) {
  if (!confirm('¿Eliminar este cobro?')) return;

  try {
    const { error } = await supabase
      .from('freight_collections')
      .delete()
      .eq('id', cobroId);

    if (error) throw error;

    showMessage('✅ Cobro eliminado', 'success');
    await loadCobros();
  } catch (err) {
    console.error('Error:', err);
    showMessage(`Error: ${err.message}`, 'error');
  }
}

// ============================================================
// Estadísticas
// ============================================================

function updateStats() {
  const pending = cobros.filter(c => c.status === 'pending');
  const partial = cobros.filter(c => c.status === 'partial');
  const paid = cobros.filter(c => c.status === 'paid');

  const pendingAmount = pending.reduce((sum, c) => sum + c.amount, 0);
  const partialAmount = partial.reduce((sum, c) => sum + c.amount, 0);
  const paidAmount = paid.reduce((sum, c) => sum + c.amount, 0);

  document.getElementById('stat-pending').textContent = pending.length;
  document.getElementById('stat-pending-amount').textContent = `$${pendingAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

  document.getElementById('stat-partial').textContent = partial.length;
  document.getElementById('stat-partial-amount').textContent = `$${partialAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

  document.getElementById('stat-paid').textContent = paid.length;
  document.getElementById('stat-paid-amount').textContent = `$${paidAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
}

// ============================================================
// UI Helpers
// ============================================================

function switchTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

  if (tabName === 'lista') {
    document.getElementById('tab-lista').classList.add('active');
  } else {
    document.getElementById('tab-crear').classList.add('active');
  }

  // Activar botón clickeado
  event.target.classList.add('active');
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
