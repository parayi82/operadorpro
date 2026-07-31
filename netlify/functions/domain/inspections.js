// ============================================================
// domain/inspections.js — Validación de checklist NOM-068.
// Si cualquier ítem crítico falla, la inspección se rechaza y el
// caso de uso debe alertar al jefe de taller antes de autorizar salida.
// ============================================================

const REQUIRED_PHOTO_TYPES = ["frente", "llantas", "motor", "caja_trasera", "odometro"];
const REQUIRED_CHECKLIST_ITEMS = [
  "frenos", "luces", "llantas_desgaste", "niveles_fluidos", "fugas",
  "espejos", "claxon", "extintor", "triangulos", "cinturon"
];
const CRITICAL_ITEMS = new Set(["frenos", "luces", "fugas", "llantas_desgaste"]);

/** @returns {'aprobada'|'rechazada'} */
function evaluate(checklist) {
  const failed = checklist.filter((item) => item.ok === false);
  const hasCriticalFailure = failed.some((item) => CRITICAL_ITEMS.has(item.item_key));
  return hasCriticalFailure ? "rechazada" : "aprobada";
}

function missingRequirements(photos, checklist) {
  const providedPhotoTypes = new Set(photos.map((p) => p.photo_type));
  const providedItems = new Set(checklist.map((c) => c.item_key));
  return {
    missingPhotos: REQUIRED_PHOTO_TYPES.filter((t) => !providedPhotoTypes.has(t)),
    missingItems: REQUIRED_CHECKLIST_ITEMS.filter((t) => !providedItems.has(t))
  };
}

module.exports = { evaluate, missingRequirements, REQUIRED_PHOTO_TYPES, REQUIRED_CHECKLIST_ITEMS, CRITICAL_ITEMS };
