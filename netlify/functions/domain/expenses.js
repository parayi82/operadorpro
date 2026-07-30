// ============================================================
// domain/expenses.js — Conciliación de gasto vs. presupuesto de viaje.
// ============================================================

/**
 * @returns {{remaining:number, overBudget:boolean, percentUsed:number}}
 */
function reconcile(budgetAmount, spentAmount) {
  const remaining = Number((budgetAmount - spentAmount).toFixed(2));
  const percentUsed = budgetAmount > 0 ? Number(((spentAmount / budgetAmount) * 100).toFixed(1)) : 0;
  return { remaining, overBudget: remaining < 0, percentUsed };
}

/** Umbral de alerta temprana antes de rebasar el presupuesto */
function isNearingBudget(budgetAmount, spentAmount, thresholdPercent = 85) {
  if (budgetAmount <= 0) return false;
  return (spentAmount / budgetAmount) * 100 >= thresholdPercent;
}

module.exports = { reconcile, isNearingBudget };
