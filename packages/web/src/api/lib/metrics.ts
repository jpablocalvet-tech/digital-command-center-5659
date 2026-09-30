export type ManualTaskLike = {
  minutes: number;
  timesPerMonth: number;
  classification: string;
  status: string;
};

/**
 * Automation Score V0.2
 * ---------------------
 * Se calcula usando la carga mensual estimada de cada tarea (minutos × veces/mes).
 * - Automatizado: tareas `automatizable` que ya están `resuelto`.
 * - Estandarizado: tareas `estandarizable` o `delegable` que ya están `resuelto`.
 * - Manual: toda carga restante, incluyendo Founder Only y tareas aún activas.
 *
 * Así evitamos porcentajes arbitrarios: el score solo mejora cuando una tarea cambia
 * realmente de estado y deja de depender del flujo manual actual.
 */
export function calculateAutomation(tasks: ManualTaskLike[]) {
  const workload = tasks.map((task) => ({
    ...task,
    monthlyMinutes: Math.max(0, task.minutes) * Math.max(0, task.timesPerMonth),
  }));

  const totalMinutes = workload.reduce((sum, task) => sum + task.monthlyMinutes, 0);
  const automatedMinutes = workload
    .filter((task) => task.classification === "automatizable" && task.status === "resuelto")
    .reduce((sum, task) => sum + task.monthlyMinutes, 0);
  const standardizedMinutes = workload
    .filter(
      (task) =>
        (task.classification === "estandarizable" || task.classification === "delegable") &&
        task.status === "resuelto",
    )
    .reduce((sum, task) => sum + task.monthlyMinutes, 0);
  const manualMinutes = Math.max(0, totalMinutes - automatedMinutes - standardizedMinutes);

  const pct = (value: number) =>
    totalMinutes > 0 ? Math.round((value / totalMinutes) * 100) : 0;

  return {
    automated: pct(automatedMinutes),
    standardized: pct(standardizedMinutes),
    manual: totalMinutes > 0 ? Math.max(0, 100 - pct(automatedMinutes) - pct(standardizedMinutes)) : 0,
    totalMinutes,
    automatedMinutes,
    standardizedMinutes,
    manualMinutes,
    recoverableMinutes: workload
      .filter((task) => task.classification !== "founder_only" && task.status !== "resuelto")
      .reduce((sum, task) => sum + task.monthlyMinutes, 0),
    eliminatedMinutes: workload
      .filter((task) => task.classification !== "founder_only" && task.status === "resuelto")
      .reduce((sum, task) => sum + task.monthlyMinutes, 0),
  };
}
