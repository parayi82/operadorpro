// ============================================================
// domain/trips.js — "Cuentas claras" del camionero. Reglas puras,
// sin I/O: lo mismo que calcula la app en el celular, testeable con
// Node nativo. Si cambia una fórmula aquí, cambia en el frontend
// (js/operador-ui.js → cuentas()) — mantener las dos iguales.
// ============================================================

const round = (n, d = 2) => Number(Number(n || 0).toFixed(d));

/**
 * Resume un viaje: flete − gastos = lo que quedó, más costo por km y
 * rendimiento de diésel cuando hay datos suficientes.
 * @param {{freight_amount:number, spent_amount:number, distance_km?:number|null,
 *          diesel_liters?:number, diesel_amount?:number}} trip
 */
function tripSummary(trip) {
  const freight = Number(trip.freight_amount || 0);
  const spent = Number(trip.spent_amount || 0);
  const km = trip.distance_km != null && trip.distance_km > 0 ? Number(trip.distance_km) : null;
  const liters = Number(trip.diesel_liters || 0);

  const profit = round(freight - spent);
  return {
    profit,
    margin: freight > 0 ? round((profit / freight) * 100, 1) : null,
    costPerKm: km ? round(spent / km) : null,
    kmPerLiter: km && liters > 0 ? round(km / liters, 1) : null,
    dieselShare: spent > 0 ? round((Number(trip.diesel_amount || 0) / spent) * 100, 1) : null
  };
}

/** Suma de varios viajes (semana, mes). */
function periodSummary(trips) {
  const totals = trips.reduce((acc, t) => {
    acc.freight += Number(t.freight_amount || 0);
    acc.spent += Number(t.spent_amount || 0);
    acc.diesel += Number(t.diesel_amount || 0);
    acc.liters += Number(t.diesel_liters || 0);
    if (t.distance_km != null && t.distance_km > 0) acc.km += Number(t.distance_km);
    return acc;
  }, { freight: 0, spent: 0, diesel: 0, liters: 0, km: 0 });

  return {
    trips: trips.length,
    freight: round(totals.freight),
    spent: round(totals.spent),
    profit: round(totals.freight - totals.spent),
    km: totals.km,
    costPerKm: totals.km > 0 ? round(totals.spent / totals.km) : null,
    kmPerLiter: totals.km > 0 && totals.liters > 0 ? round(totals.km / totals.liters, 1) : null,
    dieselShare: totals.spent > 0 ? round((totals.diesel / totals.spent) * 100, 1) : null
  };
}

/**
 * Estado de un rubro de mantenimiento contra el km actual y la fecha.
 * @returns {{status:'ok'|'pronto'|'vencido'|'sin_dato', kmLeft:number|null, daysLeft:number|null}}
 */
function maintenanceStatus(item, currentKm, today = new Date()) {
  let kmLeft = null;
  if (item.every_km && item.last_km != null && currentKm != null) {
    kmLeft = item.last_km + item.every_km - currentKm;
  }
  let daysLeft = null;
  if (item.due_date) {
    const due = new Date(`${item.due_date}T00:00:00Z`);
    daysLeft = Math.floor((due - today) / 86_400_000);
  }
  if (kmLeft === null && daysLeft === null) return { status: "sin_dato", kmLeft, daysLeft };

  const kmStatus = kmLeft === null ? "ok" : kmLeft < 0 ? "vencido" : kmLeft <= 1000 ? "pronto" : "ok";
  const dayStatus = daysLeft === null ? "ok" : daysLeft < 0 ? "vencido" : daysLeft <= 15 ? "pronto" : "ok";
  const rank = { ok: 0, pronto: 1, vencido: 2 };
  const status = rank[kmStatus] >= rank[dayStatus] ? kmStatus : dayStatus;
  return { status, kmLeft, daysLeft };
}

module.exports = { tripSummary, periodSummary, maintenanceStatus };
