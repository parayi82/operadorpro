// ============================================================
// fleet-submit-expense.js — Registra un gasto del viaje (diésel,
// caseta, comida, hospedaje, maniobras, taller, otro). La foto del
// ticket es recomendada pero NO obligatoria; si viene, se corre OCR
// best-effort para precargar RFC. En diésel se guardan litros y
// odómetro para calcular el rendimiento (km/L) de la unidad.
//
// Cualquier miembro de la empresa (incluido el chofer autenticado
// con su propia cuenta) puede registrar un gasto sobre un viaje de
// su empresa. IMPORTANTE: esta función usa el cliente admin (service
// role key), que IGNORA RLS por completo — la pertenencia a la empresa
// se valida aquí explícitamente con requireCompanyRole.
// ============================================================

const { withHandler } = require("./_lib/handler");
const { requireCompanyRole, requireActiveSubscription } = require("./_lib/auth");
const { validate, parseJsonBody, schemas } = require("./_lib/validate");
const { created } = require("./_lib/response");
const { NotFoundError, ForbiddenError } = require("./_lib/errors");
const { extractReceipt } = require("./_lib/ocr");
const { isNearingBudget } = require("./domain/expenses");
const logger = require("./_lib/logger");

exports.handler = withHandler(
  { name: "fleet-submit-expense", methods: ["POST"], rateLimit: { limit: 20, windowMs: 60_000 } },
  async ({ event, admin, user }) => {
    const input = validate(schemas.createExpense, parseJsonBody(event));

    const { data: trip } = await admin
      .from("trips")
      .select("id, company_id, vehicle_id, budget_amount, status")
      .eq("id", input.trip_id)
      .maybeSingle();
    if (!trip) throw new NotFoundError("Viaje no encontrado");

    // Se valida DESPUÉS de resolver el viaje (para no revelar si un
    // trip_id existe a alguien fuera de la empresa) y ANTES de tocar
    // la tabla de gastos.
    await requireActiveSubscription(admin, user.id, trip.company_id);
    await requireCompanyRole(admin, user.id, trip.company_id, null);
    if (trip.status !== "abierto") throw new ForbiddenError("El viaje ya está cerrado");

    const ocr = input.receipt_url
      ? await extractReceipt(input.receipt_url)
      : { raw: null, confidence: null, needsManualReview: false };

    const { data: expense, error } = await admin
      .from("expenses")
      .insert({
        trip_id: input.trip_id,
        category: input.category,
        amount: input.amount,
        liters: input.category === "diesel" ? (input.liters ?? null) : null,
        odometer_km: input.odometer_km ?? null,
        merchant_rfc: input.merchant_rfc || ocr.raw?.rfc || null,
        receipt_url: input.receipt_url || null,
        ocr_raw: ocr.raw,
        ocr_confidence: ocr.confidence,
        review_status: ocr.needsManualReview ? "revision_manual" : "pendiente",
        expense_date: input.expense_date || new Date().toISOString().slice(0, 10),
        created_by: user.id
      })
      .select()
      .single();
    if (error) throw error;

    // El odómetro que se captura al cargar diésel es el dato más fresco
    // del kilometraje de la unidad: se propaga si es mayor al actual.
    if (input.odometer_km != null) {
      await admin.from("vehicles")
        .update({ odometer_km: input.odometer_km })
        .eq("id", trip.vehicle_id)
        .or(`odometer_km.is.null,odometer_km.lt.${input.odometer_km}`);
    }

    const { data: spentRows } = await admin.from("expenses").select("amount").eq("trip_id", input.trip_id);
    const spent = (spentRows || []).reduce((sum, r) => sum + Number(r.amount), 0);
    if (isNearingBudget(trip.budget_amount, spent)) {
      logger.warn("expenses.nearing_budget", { tripId: trip.id, spent, budget: trip.budget_amount });
    }

    return created({ expense, ocr_applied: Boolean(ocr.raw) });
  }
);
