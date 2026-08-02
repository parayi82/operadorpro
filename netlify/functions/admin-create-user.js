// ============================================================
// admin-create-user.js — Crear usuario manualmente (para admins)
// Verificar que el usuario actual sea admin de plataforma
// ============================================================

const { createClient } = require("@supabase/supabase-js");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Método no permitido" }) };
  }

  try {
    const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    // 1. Validar que el requester sea un admin de plataforma
    const token = (event.headers.authorization || "").replace("Bearer ", "");
    if (!token) {
      return { statusCode: 401, body: JSON.stringify({ error: "No autenticado" }) };
    }

    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) {
      return { statusCode: 401, body: JSON.stringify({ error: "Token inválido" }) };
    }

    // Verificar si es admin de plataforma (está en la tabla platform_admins)
    const { data: adminCheck } = await admin
      .from("platform_admins")
      .select("id")
      .eq("user_id", userData.user.id)
      .single();

    if (!adminCheck) {
      return { statusCode: 403, body: JSON.stringify({ error: "Solo admins pueden crear usuarios" }) };
    }

    // 2. Parsear datos
    const { email, full_name, plan = "esencial", subscription_status = "inactive" } = JSON.parse(event.body || "{}");

    if (!email || !email.includes("@")) {
      return { statusCode: 400, body: JSON.stringify({ error: "Email no válido" }) };
    }

    if (!["esencial", "protegido"].includes(plan)) {
      return { statusCode: 400, body: JSON.stringify({ error: "Plan no válido (esencial o protegido)" }) };
    }

    // 3. Verificar que no exista ya
    const { data: existingUser } = await admin.auth.admin.listUsers();
    const userExists = existingUser?.users?.some(u => u.email === email.toLowerCase());
    if (userExists) {
      return { statusCode: 400, body: JSON.stringify({ error: "Este email ya está registrado" }) };
    }

    // 4. Crear usuario con contraseña aleatoria (admin debe resetearla después)
    const tempPassword = Math.random().toString(36).slice(-16) + "Aa1!";
    const { data: newUser, error: authError } = await admin.auth.admin.createUser({
      email: email.toLowerCase(),
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        created_by_admin: true,
        admin_created_at: new Date().toISOString()
      }
    });

    if (authError || !newUser) {
      console.error("Error creating auth user:", authError);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Error creando usuario: " + (authError?.message || "desconocido") })
      };
    }

    // 5. Crear perfil
    const { error: profileError } = await admin
      .from("profiles")
      .insert({
        id: newUser.user.id,
        full_name: full_name || email.split("@")[0],
        subscription_status,
        plan,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (profileError) {
      console.error("Error creating profile:", profileError);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Error creando perfil: " + profileError.message })
      };
    }

    // 6. Si es suscripción activa, crear entrada en company_members
    if (subscription_status === "active") {
      // Buscar o crear una empresa por defecto para este usuario
      const { data: company } = await admin
        .from("companies")
        .select("id")
        .eq("user_id", newUser.user.id)
        .single();

      if (!company) {
        // La empresa debería crearse automáticamente por el trigger
        // Pero si no existe, crearla aquí
        const { data: newCompany, error: companyError } = await admin
          .from("companies")
          .insert({
            user_id: newUser.user.id,
            name: full_name || email.split("@")[0],
            entity_type: "persona_fisica",
            plan,
            subscription_status: "active",
            created_at: new Date().toISOString()
          })
          .select("id")
          .single();

        if (!companyError && newCompany) {
          // Agregar como miembro de la empresa
          await admin
            .from("company_members")
            .insert({
              user_id: newUser.user.id,
              company_id: newCompany.id,
              role: "owner",
              status: "active",
              joined_at: new Date().toISOString()
            });
        }
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        user_id: newUser.user.id,
        email: email.toLowerCase(),
        message: `Usuario creado. Contraseña temporal: ${tempPassword} (el usuario debe cambiarla en su próximo login)`
      })
    };
  } catch (e) {
    console.error("admin-create-user error:", e);
    return { statusCode: 500, body: JSON.stringify({ error: "Error interno: " + e.message }) };
  }
};
