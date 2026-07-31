const { test } = require("node:test");
const assert = require("node:assert/strict");

const compliance = require("../netlify/functions/domain/compliance");
const expenses = require("../netlify/functions/domain/expenses");
const inspections = require("../netlify/functions/domain/inspections");
const invoicing = require("../netlify/functions/domain/invoicing");

test("compliance.semaforo: vencido cuando la fecha ya pasó", () => {
  const past = new Date(Date.now() - 5 * 86_400_000).toISOString().slice(0, 10);
  assert.equal(compliance.semaforo(past), "vencido");
});

test("compliance.semaforo: por_vencer dentro de 15 días", () => {
  const soon = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10);
  assert.equal(compliance.semaforo(soon), "por_vencer");
});

test("compliance.semaforo: vigente más allá de 15 días", () => {
  const far = new Date(Date.now() + 40 * 86_400_000).toISOString().slice(0, 10);
  assert.equal(compliance.semaforo(far), "vigente");
});

test("compliance.reminderTemplate: nombre y orden de variables correctos", () => {
  const { templateName, templateParams } = compliance.reminderTemplate({
    docType: "poliza_seguro", expiresAt: "2026-08-15", unitLabel: "la unidad 12"
  });
  assert.equal(templateName, "operadorpro_vencimiento_documento");
  assert.deepEqual(templateParams, ["Póliza de seguro", "la unidad 12", "2026-08-15"]);
});

test("expenses.reconcile: detecta sobregiro de presupuesto", () => {
  const result = expenses.reconcile(1000, 1200);
  assert.equal(result.overBudget, true);
  assert.equal(result.remaining, -200);
});

test("expenses.reconcile: dentro de presupuesto", () => {
  const result = expenses.reconcile(1000, 400);
  assert.equal(result.overBudget, false);
  assert.equal(result.remaining, 600);
});

test("expenses.isNearingBudget: alerta al cruzar el umbral", () => {
  assert.equal(expenses.isNearingBudget(1000, 900), true);
  assert.equal(expenses.isNearingBudget(1000, 500), false);
});

test("inspections.evaluate: rechaza por falla crítica (frenos)", () => {
  const checklist = [{ item_key: "frenos", ok: false }, { item_key: "claxon", ok: true }];
  assert.equal(inspections.evaluate(checklist), "rechazada");
});

test("inspections.evaluate: aprueba si solo falla un ítem no crítico", () => {
  const checklist = [{ item_key: "frenos", ok: true }, { item_key: "claxon", ok: false }];
  assert.equal(inspections.evaluate(checklist), "aprobada");
});

test("inspections.missingRequirements: detecta fotos y checklist faltantes", () => {
  const { missingPhotos, missingItems } = inspections.missingRequirements(
    [{ photo_type: "frente" }],
    [{ item_key: "frenos" }]
  );
  assert.ok(missingPhotos.includes("llantas"));
  assert.ok(missingItems.includes("luces"));
});

test("invoicing.computeStatus: vencida cuando pasó la fecha límite", () => {
  const invoice = { status: "pendiente", due_date: "2020-01-01" };
  assert.equal(invoicing.computeStatus(invoice, new Date("2020-02-01")), "vencida");
});

test("invoicing.computeStatus: respeta estados terminales", () => {
  assert.equal(invoicing.computeStatus({ status: "pagada", due_date: "2020-01-01" }), "pagada");
  assert.equal(invoicing.computeStatus({ status: "cancelada", due_date: "2020-01-01" }), "cancelada");
});

test("invoicing.reminderTemplate: plantilla de vencido vs próximo", () => {
  const soon = invoicing.reminderTemplate({ folio: "F-1", amount: 500, dueDate: "2026-01-10", daysOverdue: 0 });
  assert.equal(soon.templateName, "operadorpro_pago_proximo");
  assert.deepEqual(soon.templateParams, ["F-1", 500, "2026-01-10"]);

  const overdue = invoicing.reminderTemplate({ folio: "F-1", amount: 500, dueDate: "2026-01-10", daysOverdue: 3 });
  assert.equal(overdue.templateName, "operadorpro_pago_vencido");
  assert.deepEqual(overdue.templateParams, ["F-1", 500, 3, "2026-01-10"]);
});
