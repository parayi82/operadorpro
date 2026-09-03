const { test } = require("node:test");
const assert = require("node:assert/strict");

const trips = require("../netlify/functions/domain/trips");

test("trips.tripSummary: flete − gastos = lo que quedó, con costo por km y rendimiento", () => {
  const s = trips.tripSummary({
    freight_amount: 18000, spent_amount: 11000, distance_km: 800, diesel_liters: 320, diesel_amount: 8000
  });
  assert.equal(s.profit, 7000);
  assert.equal(s.margin, 38.9);
  assert.equal(s.costPerKm, 13.75);
  assert.equal(s.kmPerLiter, 2.5);
  assert.equal(s.dieselShare, 72.7);
});

test("trips.tripSummary: sin km ni litros no inventa rendimiento", () => {
  const s = trips.tripSummary({ freight_amount: 5000, spent_amount: 6000 });
  assert.equal(s.profit, -1000);
  assert.equal(s.costPerKm, null);
  assert.equal(s.kmPerLiter, null);
});

test("trips.periodSummary: acumula la semana", () => {
  const p = trips.periodSummary([
    { freight_amount: 10000, spent_amount: 4000, distance_km: 500, diesel_liters: 200, diesel_amount: 3000 },
    { freight_amount: 8000, spent_amount: 5000, distance_km: null, diesel_liters: 0, diesel_amount: 0 }
  ]);
  assert.equal(p.trips, 2);
  assert.equal(p.profit, 9000);
  assert.equal(p.km, 500);
  assert.equal(p.costPerKm, 18);
  assert.equal(p.kmPerLiter, 2.5);
});

test("trips.maintenanceStatus: por km — ok, pronto, vencido", () => {
  const item = { every_km: 10000, last_km: 100000 };
  assert.equal(trips.maintenanceStatus(item, 105000).status, "ok");
  assert.equal(trips.maintenanceStatus(item, 109500).status, "pronto");
  assert.equal(trips.maintenanceStatus(item, 111000).status, "vencido");
  assert.equal(trips.maintenanceStatus(item, 111000).kmLeft, -1000);
});

test("trips.maintenanceStatus: por fecha y sin datos", () => {
  const soon = new Date(Date.now() + 5 * 86_400_000).toISOString().slice(0, 10);
  assert.equal(trips.maintenanceStatus({ due_date: soon }, null).status, "pronto");
  assert.equal(trips.maintenanceStatus({ due_date: "2020-01-01" }, null).status, "vencido");
  assert.equal(trips.maintenanceStatus({ label: "x" }, 5000).status, "sin_dato");
});

test("trips.maintenanceStatus: gana el peor entre km y fecha", () => {
  const soon = new Date(Date.now() + 5 * 86_400_000).toISOString().slice(0, 10);
  const r = trips.maintenanceStatus({ every_km: 10000, last_km: 0, due_date: soon }, 20000);
  assert.equal(r.status, "vencido");
});
