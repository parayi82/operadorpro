// ============================================================
// domain/compliance.js — Reglas de negocio puras del Módulo 1.
// Sin I/O: fácil de testear con Node nativo (node --test).
// ============================================================

const DOC_TYPE_LABELS = {
  licencia_federal: "Licencia federal",
  poliza_seguro: "Póliza de seguro",
  tarjeta_circulacion: "Tarjeta de circulación",
  verificacion: "Verificación vehicular",
  permiso_sct: "Permiso SCT",
  carta_porte_config: "Configuración Carta Porte",
  otro: "Documento"
};

/** @returns {'vigente'|'por_vencer'|'vencido'} */
function semaforo(expiresAt, today = new Date()) {
  const expires = new Date(`${expiresAt}T00:00:00Z`);
  const diffDays = Math.floor((expires - today) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "vencido";
  if (diffDays <= 15) return "por_vencer";
  return "vigente";
}

function reminderMessage({ docType, expiresAt, unitLabel }) {
  const label = DOC_TYPE_LABELS[docType] || "Documento";
  return `⚠️ OperadorPro: el ${label} de ${unitLabel} vence el ${expiresAt}. Renuévalo para evitar arrastre/corralón.`;
}

// Nombre exacto de la plantilla aprobada en Meta WhatsApp Manager. Cuerpo
// sugerido (variables en el mismo orden que templateParams):
// "OperadorPro: el {{1}} de {{2}} vence el {{3}}. Renueva a tiempo para
// evitar arrastre o corralón."
const COMPLIANCE_REMINDER_TEMPLATE = "operadorpro_vencimiento_documento";

function reminderTemplate({ docType, expiresAt, unitLabel }) {
  return {
    templateName: COMPLIANCE_REMINDER_TEMPLATE,
    templateParams: [DOC_TYPE_LABELS[docType] || "Documento", unitLabel, expiresAt]
  };
}

module.exports = { semaforo, reminderMessage, reminderTemplate, DOC_TYPE_LABELS, COMPLIANCE_REMINDER_TEMPLATE };
