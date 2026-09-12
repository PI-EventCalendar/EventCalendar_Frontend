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
 * GET /dashboard/daily-load/ — carga de trabajo para una fecha dada.
 * Si no se proporciona `date`, el backend usa la fecha actual.
 */
export async function getDailyLoad(date?: string): Promise<DailyLoad> {
  const { data } = await apiClient.get<DailyLoad>("/dashboard/daily-load/", {
    params: date ? { date } : undefined,
  });
  return data;
}
