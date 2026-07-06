// ============================================================
// OperadorPro - Configuración pública del cliente
// Estas llaves SÍ pueden ir en el frontend (anon key con RLS).
// Las llaves secretas van SOLO en variables de entorno de Netlify.
// ============================================================

const CONFIG = {
  SUPABASE_URL: "https://siqkkcltkrmdexxlcuat.supabase.co",   // <-- Reemplazar
  SUPABASE_ANON_KEY: "sb_publishable_DY9H6ZXr8AzRWUYIiXInYg_ENWORovL",             // <-- Reemplazar
  SITE_URL: "https://TU-SITIO.netlify.app",          // <-- Reemplazar (sin / final)
  PRECIO_MENSUAL: "$149 MXN/mes"
};
