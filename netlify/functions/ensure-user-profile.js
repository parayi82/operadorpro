// ============================================================
// ensure-user-profile.js — Asegura que existe el perfil del usuario
// Llamado por:
//   1. OTP signup (después de verifyOtp)
//   2. Alta manual (cuando admin crea usuario sin pagar)
//   3. Cualquier flujo que necesite garantizar perfil
// ============================================================

const { createClient } = require("@supabase/supabase-js");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Método no permitido" }) };
  }

  try {
    const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    // 1. Validar al usuario con su token
    const token = (event.headers.authorization || "").replace("Bearer ", "");
    if (!token) {
      return { statusCode: 401, body: JSON.stringify({ error: "No autenticado" }) };
    }

    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) {
      return { statusCode: 401, body: JSON.stringify({ error: "Token inválido" }) };
    }

    const user = userData.user;
    const userId = user.id;

    // 2. Verificar si el perfil ya existe
    const { data: existingProfile, error: selectErr } = await admin
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .single();

    if (existingProfile) {
      // Perfil ya existe, listo
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, message: "Perfil ya existía" })
      };
    }

    // 3. Si no existe, crearlo
    // Usar full_name del user_metadata si está disponible, si no usar parte del email
    const fullName =
      user.user_metadata?.full_name ||
      user.email?.split("@")[0] ||
      "Usuario";

    const { error: insertErr } = await admin
      .from("profiles")
      .insert({
        id: userId,
        full_name: fullName,
        phone: user.user_metadata?.phone || null,
        subscription_status: "inactive",
        plan: "esencial",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (insertErr) {
      console.error("Error creando perfil:", insertErr);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Error creando perfil: " + insertErr.message })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: "Perfil creado exitosamente" })
    };
  } catch (e) {
    console.error("ensure-user-profile error:", e);
    return { statusCode: 500, body: JSON.stringify({ error: "Error interno" }) };
  }
};
