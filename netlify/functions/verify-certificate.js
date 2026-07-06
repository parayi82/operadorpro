// ============================================================
// verify-certificate.js — Verificación pública por folio.
// Devuelve solo los datos necesarios del certificado (nunca el
// user_id ni datos de contacto). La tabla certificates permanece
// cerrada por RLS; esta función usa la service role key.
// ============================================================

const { createClient } = require("@supabase/supabase-js");

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: JSON.stringify({ error: "Método no permitido" }) };
  }

  const folio = (event.queryStringParameters?.folio || "").trim().toUpperCase();
  // Formato estricto: evita consultas basura y enumeración
  if (!/^OP-\d{4}-[A-Z0-9]{6}$/.test(folio)) {
    return { statusCode: 200, body: JSON.stringify({ found: false }) };
  }

  try {
    const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data } = await admin
      .from("certificates")
      .select("folio, full_name, course_title, score, total, issued_at, valid_until, status")
      .eq("folio", folio)
      .maybeSingle();

    if (!data) {
      return { statusCode: 200, body: JSON.stringify({ found: false }) };
    }
    return {
      statusCode: 200,
      headers: { "Cache-Control": "public, max-age=60" },
      body: JSON.stringify({ found: true, certificate: data })
    };
  } catch (e) {
    console.error("verify-certificate error:", e);
    return { statusCode: 500, body: JSON.stringify({ error: "Error de consulta" }) };
  }
};
