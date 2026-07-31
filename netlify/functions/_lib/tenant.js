// ============================================================
// tenant.js — Valida que un recurso referenciado por el cliente
// (vehicle_id, driver_id, client_id, trip_id, ...) pertenezca
// realmente a la empresa (company_id) que ya se autorizó.
//
// Por qué existe: requireCompanyRole() confirma que el usuario tiene
// el rol correcto EN company_id, pero eso no implica que los demás
// IDs del payload (que el cliente controla) también sean de esa
// empresa. Sin esta verificación, un usuario de la Empresa A podría
// adjuntar datos a una unidad/cliente/viaje de la Empresa B con solo
// adivinar o conseguir su UUID (aislamiento multi-tenant roto).
// ============================================================

const { ValidationError } = require("./errors");

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {string} table
 * @param {string} id
 * @param {string} companyId
 * @param {string} label texto para el mensaje de error (ej. "La unidad")
 */
async function assertBelongsToCompany(admin, table, id, companyId, label) {
  const { data, error } = await admin
    .from(table)
    .select("id")
    .eq("id", id)
    .eq("company_id", companyId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new ValidationError(`${label} no pertenece a esta empresa`);
}

module.exports = { assertBelongsToCompany };
