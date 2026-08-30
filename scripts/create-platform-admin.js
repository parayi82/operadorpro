#!/usr/bin/env node
// ============================================================
// Crea (o actualiza) la cuenta de administrador de plataforma.
// Uso:
//   SUPABASE_SERVICE_ROLE_KEY=<tu-key> node scripts/create-platform-admin.js
//
// El service role key está en:
//   Supabase Dashboard → Project Settings → API → service_role (secret)
// ============================================================

const https = require("https");

const SUPABASE_URL = "https://siqkkcltkrmdexxlcuat.supabase.co";
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_EMAIL  = process.env.ADMIN_EMAIL  || "serjuemsa@gmail.com";
const ADMIN_PASS   = process.env.ADMIN_PASS   || generatePassword();

if (!SERVICE_KEY) {
  console.error(
    "\nFalta SUPABASE_SERVICE_ROLE_KEY.\n\n" +
    "Cópiala de: Supabase Dashboard → Project Settings → API → service_role\n" +
    "Luego corre:\n\n" +
    "  SUPABASE_SERVICE_ROLE_KEY=tu-key node scripts/create-platform-admin.js\n"
  );
  process.exit(1);
}

function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
  return Array.from({ length: 16 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function request(method, path, body, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(SUPABASE_URL + path);
    const data = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers: {
        "Content-Type": "application/json",
        "apikey": SERVICE_KEY,
        "Authorization": `Bearer ${SERVICE_KEY}`,
        ...(data ? { "Content-Length": Buffer.byteLength(data) } : {}),
        ...extraHeaders
      }
    }, (res) => {
      let raw = "";
      res.on("data", (d) => (raw += d));
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, body: raw }); }
      });
    });
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  console.log(`\n— OperadorPro: Configurando administrador de plataforma —`);
  console.log(`  Email : ${ADMIN_EMAIL}`);

  // 1. Buscar si ya existe el usuario
  const list = await request("GET", `/auth/v1/admin/users?email=${encodeURIComponent(ADMIN_EMAIL)}`);
  let userId;

  if (list.body?.users?.length) {
    userId = list.body.users[0].id;
    console.log(`\n✓ Usuario ya existe (id: ${userId})`);
    // Actualizar contraseña
    const upd = await request("PUT", `/auth/v1/admin/users/${userId}`, { password: ADMIN_PASS });
    if (upd.status >= 300) {
      console.error("Error actualizando contraseña:", upd.body);
      process.exit(1);
    }
    console.log("✓ Contraseña actualizada");
  } else {
    // 2. Crear el usuario
    const create = await request("POST", "/auth/v1/admin/users", {
      email: ADMIN_EMAIL,
      password: ADMIN_PASS,
      email_confirm: true,
      user_metadata: { full_name: "Admin OperadorPro" }
    });
    if (create.status >= 300) {
      console.error("Error creando usuario:", create.body);
      process.exit(1);
    }
    userId = create.body.id;
    console.log(`\n✓ Usuario creado (id: ${userId})`);
  }

  // 3. Crear tabla platform_admins si no existe y agregar al usuario
  const sql = `
    CREATE TABLE IF NOT EXISTS public.platform_admins (
      user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;
    INSERT INTO public.platform_admins (user_id) VALUES ('${userId}')
    ON CONFLICT (user_id) DO NOTHING;
  `;

  const pg = await request("POST", "/rest/v1/rpc/exec_sql", { sql }, {
    "Prefer": "return=minimal"
  });

  // exec_sql puede no existir; usar la API de consulta directa
  if (pg.status >= 300) {
    // Fallback: insertar directamente vía REST
    const ins = await request("POST", "/rest/v1/platform_admins", { user_id: userId }, {
      "Prefer": "return=minimal,resolution=ignore-duplicates"
    });
    if (ins.status >= 300 && ins.status !== 409) {
      console.log("\n⚠ No se pudo insertar automáticamente en platform_admins.");
      console.log("  Ejecuta esto en el SQL Editor de Supabase:\n");
      console.log(`  CREATE TABLE IF NOT EXISTS public.platform_admins (`);
      console.log(`    user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,`);
      console.log(`    created_at timestamptz NOT NULL DEFAULT now()`);
      console.log(`  );`);
      console.log(`  ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;`);
      console.log(`  INSERT INTO public.platform_admins (user_id) VALUES ('${userId}')`);
      console.log(`  ON CONFLICT (user_id) DO NOTHING;\n`);
    } else {
      console.log("✓ Agregado a platform_admins");
    }
  } else {
    console.log("✓ Tabla platform_admins lista y usuario agregado");
  }

  console.log("\n════════════════════════════════════════");
  console.log("  ACCESO AL PANEL DE ADMINISTRACIÓN");
  console.log("════════════════════════════════════════");
  console.log(`  URL      : https://operadorpro.netlify.app/admin.html`);
  console.log(`  Email    : ${ADMIN_EMAIL}`);
  console.log(`  Contraseña: ${ADMIN_PASS}`);
  console.log("════════════════════════════════════════");
  console.log("  Guarda esta contraseña — no se muestra de nuevo.\n");
}

main().catch((e) => { console.error(e); process.exit(1); });
