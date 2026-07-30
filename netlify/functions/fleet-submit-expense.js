// ============================================================
// fleet-submit-expense.js — Módulo 2 (Viáticos Express): el chofer
// sube la foto del ticket (ya almacenada en Storage por el frontend)
// y aquí se ejecuta OCR best-effort para precargar monto/RFC.
//
// Cualquier miembro de la empresa (incluido el chofer autenticado
// con su propia cuenta) puede registrar un gasto sobre un viaje de
// su empresa — la política RLS "gastos: insertar via viaje" ya
// restringe esto a miembros activos de esa empresa.
// ============================================================

const { withHandler } = require("./_lib/handler");
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

    // Verifica pertenencia del viaje a una empresa donde el usuario es miembro
    // (RLS lo re-verifica en el INSERT; esto da un 403/404 explícito antes).
    const { data: trip } = await admin
      .from("trips")
      .select("id, company_id, budget_amount, status")
      .eq("id", input.trip_id)
      .maybeSingle();
    if (!trip) throw new NotFoundError("Viaje no encontrado");
    if (trip.status !== "abierto") throw new ForbiddenError("El viaje ya está cerrado");

    const ocr = await extractReceipt(input.receipt_url);

    const { data: expense, error } = await admin
      .from("expenses")
      .insert({
        trip_id: input.trip_id,
        category: input.category,
        amount: input.amount,
        merchant_rfc: input.merchant_rfc || ocr.raw?.rfc || null,
        receipt_url: input.receipt_url,
        ocr_raw: ocr.raw,
        ocr_confidence: ocr.confidence,
        review_status: ocr.needsManualReview ? "revision_manual" : "pendiente",
        expense_date: input.expense_date || new Date().toISOString().slice(0, 10),
        created_by: user.id
      })
      .select()
      .single();
    if (error) throw error;

    const { data: spentRows } = await admin.from("expenses").select("amount").eq("trip_id", input.trip_id);
    const spent = (spentRows || []).reduce((sum, r) => sum + Number(r.amount), 0);
    if (isNearingBudget(trip.budget_amount, spent)) {
      logger.warn("expenses.nearing_budget", { tripId: trip.id, spent, budget: trip.budget_amount });
    }

    return created({ expense, ocr_applied: Boolean(ocr.raw) });
  }
);
