// ============================================================
// OperadorPro - Configuración pública del cliente (v2)
// ============================================================

const CONFIG = {
  SUPABASE_URL: "https://siqkkcltkrmdexxlcuat.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_DY9H6ZXr8AzRWUYIiXInYg_ENWORovL",
  SITE_URL: "https://operadorpro.netlify.app",

  // Número WhatsApp del servicio de asesoría legal (con código de país, sin +).
  // Ejemplo: "5214771234567". Dejar vacío para abrir WhatsApp sin destinatario fijo.
  LEGAL_WA: "",

  PLANES: {
    esencial:  { nombre: "Esencial",  precio: "$249 MXN/mes" },
    protegido: { nombre: "Protegido", precio: "$349 MXN/mes" }
  }
};
