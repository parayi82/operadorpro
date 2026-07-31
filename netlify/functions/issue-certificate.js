// ============================================================
// issue-certificate.js — Emite el certificado SOLO si el servidor
// confirma: (1) sesión válida, (2) suscripción activa,
// (3) examen aprobado registrado en la base de datos.
// El folio se genera aquí; el cliente nunca decide si hay certificado.
// ============================================================

const { createClient } = require("@supabase/supabase-js");

// Títulos válidos de cursos (espejo del catálogo del frontend)
const COURSE_TITLES = {
  "carta-porte": "Carta Porte sin errores",
  "nom-087": "NOM-087: tiempos de conducción y descanso",
  "protocolo-accidente": "Protocolo de accidente en carretera",
  "materiales-peligrosos": "Materiales y residuos peligrosos (NOM-002-SCT/2011)",
  "sujecion-carga": "Peso, dimensiones y sujeción de carga (NOM-012-SCT-2)",
  "manejo-defensivo": "Manejo defensivo y prevención de accidentes"
};

function generateFolio() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin caracteres ambiguos
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return `OP-${new Date().getFullYear()}-${code}`;
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Método no permitido" }) };
  }

  try {
    const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    // 1. Validar sesión
    const token = (event.headers.authorization || "").replace("Bearer ", "");
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) {
      return { statusCode: 401, body: JSON.stringify({ error: "Sesión no válida" }) };
    }
    const userId = userData.user.id;

    // 2. Validar curso
    const { course_id } = JSON.parse(event.body || "{}");
    if (!COURSE_TITLES[course_id]) {
      return { statusCode: 400, body: JSON.stringify({ error: "Curso no válido" }) };
    }

    // 3. Validar suscripción activa
    const { data: profile } = await admin
      .from("profiles").select("full_name, subscription_status")
      .eq("id", userId).single();
    if (profile?.subscription_status !== "active") {
      return { statusCode: 403, body: JSON.stringify({ error: "Se requiere suscripción activa" }) };
    }

    // 4. Si ya existe certificado para este curso, devolver el existente
    const { data: existing } = await admin
      .from("certificates").select("*")
      .eq("user_id", userId).eq("course_id", course_id).maybeSingle();
    if (existing) {
      return { statusCode: 200, body: JSON.stringify({ certificate: existing }) };
    }

    // 5. Validar que exista un examen APROBADO en la base (no confiar en el cliente)
    const { data: attempt } = await admin
      .from("exam_attempts")
      .select("score, total")
      .eq("user_id", userId).eq("course_id", course_id).eq("passed", true)
      .order("score", { ascending: false })
      .limit(1).maybeSingle();
    if (!attempt) {
      return { statusCode: 403, body: JSON.stringify({ error: "No hay examen aprobado registrado para este curso" }) };
    }

    // 6. Emitir con folio único (reintentar si colisiona)
    let certificate = null;
    for (let i = 0; i < 5 && !certificate; i++) {
      const { data, error } = await admin
        .from("certificates")
        .insert({
          folio: generateFolio(),
          user_id: userId,
          full_name: profile.full_name || "Operador",
          course_id,
          course_title: COURSE_TITLES[course_id],
          score: attempt.score,
          total: attempt.total
        })
        .select().single();
      if (!error) certificate = data;
      else if (!String(error.message).includes("duplicate")) throw error;
    }
    if (!certificate) throw new Error("No se pudo generar un folio único");

    return { statusCode: 200, body: JSON.stringify({ certificate }) };
  } catch (e) {
    console.error("issue-certificate error:", e);
    return { statusCode: 500, body: JSON.stringify({ error: "No se pudo emitir el certificado" }) };
  }
};
