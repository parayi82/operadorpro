// ============================================================
// validate.js — Única fuente de verdad de validación de entrada.
// El frontend puede replicar reglas para UX, pero el backend NUNCA
// confía en ello: todo payload pasa por aquí antes de tocar dominio/BD.
// ============================================================

const { z } = require("zod");
const { ValidationError } = require("./errors");

function parseJsonBody(event) {
  try {
    return JSON.parse(event.body || "{}");
  } catch {
    throw new ValidationError("El cuerpo de la solicitud no es JSON válido");
  }
}

function validate(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ValidationError("Datos de entrada inválidos", result.error.flatten());
  }
  return result.data;
}

// Esquemas reutilizables del módulo de flota
const schemas = {
  uuid: z.string().uuid(),

  createVehicle: z.object({
    company_id: z.string().uuid(),
    economic_number: z.string().trim().min(1).max(30),
    plate: z.string().trim().min(5).max(15),
    vin: z.string().trim().max(17).optional(),
    brand: z.string().trim().max(40).optional(),
    model: z.string().trim().max(40).optional(),
    year: z.number().int().min(1980).max(2100).optional()
  }),

  createDriver: z.object({
    company_id: z.string().uuid(),
    full_name: z.string().trim().min(2).max(120),
    phone: z.string().trim().regex(/^\+?[0-9]{10,15}$/, "Teléfono inválido (10 a 15 dígitos)"),
    curp: z.string().trim().length(18).optional(),
    license_number: z.string().trim().max(30).optional(),
    license_category: z.enum(["A", "B", "C", "D", "E", "F"]).optional(),
    license_expiry: z.string().date().optional()
  }),

  createComplianceDoc: z.object({
    company_id: z.string().uuid(),
    vehicle_id: z.string().uuid().optional(),
    driver_id: z.string().uuid().optional(),
    doc_type: z.enum([
      "licencia_federal", "poliza_seguro", "tarjeta_circulacion",
      "verificacion", "permiso_sct", "carta_porte_config", "otro"
    ]),
    doc_number: z.string().trim().max(60).optional(),
    file_url: z.string().url(),
    issued_at: z.string().date().optional(),
    expires_at: z.string().date()
  }).refine((d) => d.vehicle_id || d.driver_id, {
    message: "Se requiere vehicle_id o driver_id"
  }),

  createExpense: z.object({
    trip_id: z.string().uuid(),
    category: z.enum(["diesel", "caseta", "comida", "taller", "otro"]),
    amount: z.number().positive().max(1_000_000),
    merchant_rfc: z.string().trim().max(13).optional(),
    receipt_url: z.string().url(),
    expense_date: z.string().date().optional()
  }),

  createInspection: z.object({
    company_id: z.string().uuid(),
    vehicle_id: z.string().uuid(),
    driver_id: z.string().uuid(),
    trip_id: z.string().uuid().optional(),
    odometer_km: z.number().int().min(0).max(9_999_999),
    gps_lat: z.number().min(-90).max(90).optional(),
    gps_lng: z.number().min(-180).max(180).optional(),
    photos: z.array(z.object({
      photo_type: z.enum(["frente", "llantas", "motor", "caja_trasera", "odometro"]),
      url: z.string().url(),
      gps_lat: z.number().min(-90).max(90).optional(),
      gps_lng: z.number().min(-180).max(180).optional()
    })).min(5),
    checklist: z.array(z.object({
      item_key: z.enum([
        "frenos", "luces", "llantas_desgaste", "niveles_fluidos", "fugas",
        "espejos", "claxon", "extintor", "triangulos", "cinturon"
      ]),
      ok: z.boolean(),
      notes: z.string().trim().max(300).optional()
    })).min(10)
  }),

  createInvoice: z.object({
    company_id: z.string().uuid(),
    client_id: z.string().uuid(),
    trip_id: z.string().uuid().optional(),
    folio: z.string().trim().min(1).max(40),
    amount: z.number().positive().max(10_000_000),
    pod_url: z.string().url().optional(),
    issued_at: z.string().date().optional(),
    due_date: z.string().date()
  })
};

module.exports = { validate, parseJsonBody, schemas, z };
