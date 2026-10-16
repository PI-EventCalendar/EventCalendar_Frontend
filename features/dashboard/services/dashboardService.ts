import apiClient from "@/lib/axios";
import type { TodayTasksSummary, DailyLoad } from "../types";

/**
 * GET /dashboard/today/ — tareas de hoy con resumen de completadas/pendientes.
 * El backend filtra automáticamente por usuario autenticado y fecha actual.
 */
export async function getTodayTasks(): Promise<TodayTasksSummary> {
  const { data } = await apiClient.get<TodayTasksSummary>("/dashboard/today/");
  return data;
}

/**
 * GET /dashboard/load/ — carga de trabajo para una fecha dada.
 * Si no se proporciona `date`, el backend usa la fecha actual.
 */
export async function getDailyLoad(
  date?: string,
  options?: {
    excludeTaskId?: number;
    excludeEventId?: number;
    suggestedHours?: number;
    maxDate?: string;
    plannedLoads?: Record<string, number>;
  },
): Promise<DailyLoad> {
  const { data } = await apiClient.get<DailyLoad>("/dashboard/load/", {
    params: {
      ...(date ? { date } : {}),
      ...(options?.excludeTaskId ? { exclude_task_id: options.excludeTaskId } : {}),
      ...(options?.excludeEventId ? { exclude_event_id: options.excludeEventId } : {}),
      ...(options?.suggestedHours !== undefined ? { suggested_hours: options.suggestedHours } : {}),
      ...(options?.maxDate ? { max_date: options.maxDate } : {}),
      ...(options?.plannedLoads ? { planned_loads: JSON.stringify(options.plannedLoads) } : {}),
    },
  });
  return data;
}
