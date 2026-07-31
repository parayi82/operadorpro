#!/usr/bin/env node
// ============================================================
// check-rpc-contracts.js — Verificación estática: cada llamada
// admin.rpc("fn_x", { p_a: ..., p_b: ... }) en netlify/functions/*.js
// debe pasar EXACTAMENTE el mismo conjunto de parámetros que declara
// la función en supabase/schema_fleet.sql.
//
// Existe porque un desajuste aquí no truena en `node --check` (es
// sintaxis válida) ni en la validación de zod (que corre antes) —
// solo se descubre en producción cuando Postgres/PostgREST devuelve
// un error de función no encontrada o de parámetro faltante. Ya nos
// pasó una vez (auth.uid() NULL + firma vieja); este script evita
// que el mismo tipo de desfase pase inadvertido en un PR futuro.
// ============================================================

const fs = require("fs");
const path = require("path");

const FUNCTIONS_DIR = path.join(__dirname, "..", "netlify", "functions");
const SCHEMA_FILE = path.join(__dirname, "..", "supabase", "schema_fleet.sql");

function extractSqlFunctionParams(sql) {
  const params = new Map(); // fn_name -> Set(param_names) — última definición gana (create or replace)
  const fnRegex = /create or replace function public\.(\w+)\s*\(([\s\S]*?)\)\s*\n?\s*returns/gi;
  let match;
  while ((match = fnRegex.exec(sql))) {
    const [, name, paramList] = match;
    const names = new Set();
    const segments = paramList.split(",").map((s) => s.trim()).filter(Boolean);
    for (const seg of segments) {
      const paramName = seg.split(/\s+/)[0];
      if (paramName) names.add(paramName);
    }
    params.set(name, names); // se sobreescribe si aparece más de una vez (create or replace)
  }
  return params;
}

function extractJsRpcCalls(jsSource, filePath) {
  const calls = [];
  const rpcRegex = /admin\.rpc\(\s*["'](\w+)["']\s*,\s*\{([\s\S]*?)\n\s*\}\s*\)/g;
  let match;
  while ((match = rpcRegex.exec(jsSource))) {
    const [, name, body] = match;
    const keyRegex = /(?:^|[{,\s])(\w+)\s*:/g;
    const names = new Set();
    let keyMatch;
    while ((keyMatch = keyRegex.exec(body))) names.add(keyMatch[1]);
    calls.push({ name, params: names, filePath });
  }
  return calls;
}

function main() {
  const sql = fs.readFileSync(SCHEMA_FILE, "utf8");
  const sqlFunctions = extractSqlFunctionParams(sql);

  const jsFiles = fs.readdirSync(FUNCTIONS_DIR).filter((f) => f.endsWith(".js") && f.startsWith("fleet-"));
  const errors = [];

  for (const file of jsFiles) {
    const filePath = path.join(FUNCTIONS_DIR, file);
    const source = fs.readFileSync(filePath, "utf8");
    const calls = extractJsRpcCalls(source, file);

    for (const call of calls) {
      const declared = sqlFunctions.get(call.name);
      if (!declared) {
        errors.push(`${call.filePath}: llama a RPC "${call.name}" que no existe en schema_fleet.sql`);
        continue;
      }
      const missing = [...declared].filter((p) => !call.params.has(p));
      const extra = [...call.params].filter((p) => !declared.has(p));
      if (missing.length) {
        errors.push(`${call.filePath}: la llamada a "${call.name}" no envía: ${missing.join(", ")}`);
      }
      if (extra.length) {
        errors.push(`${call.filePath}: la llamada a "${call.name}" envía parámetros que no existen: ${extra.join(", ")}`);
      }
    }
  }

  if (errors.length) {
    console.error("❌ Desajuste entre llamadas RPC y funciones de schema_fleet.sql:\n");
    errors.forEach((e) => console.error(`  - ${e}`));
    console.error(`\n${errors.length} problema(s) encontrado(s).`);
    process.exit(1);
  }

  console.log("✅ Todas las llamadas admin.rpc(...) coinciden con las funciones declaradas en schema_fleet.sql");
}

main();
