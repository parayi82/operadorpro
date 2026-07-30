// ============================================================
// supabaseAdmin.js — Único punto de creación del cliente con
// service role key. Se reutiliza la conexión entre invocaciones
// del mismo contenedor (patrón "cliente frío" de Netlify Functions).
// ============================================================

const { createClient } = require("@supabase/supabase-js");

let cached = null;

function getSupabaseAdmin() {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Faltan variables de entorno SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  }
  cached = createClient(url, key, { auth: { persistSession: false } });
  return cached;
}

module.exports = { getSupabaseAdmin };
