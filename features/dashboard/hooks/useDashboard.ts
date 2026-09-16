import { useQuery } from "@tanstack/react-query";
import { getTodayTasks, getDailyLoad } from "../services/dashboardService";

export const TODAY_TASKS_QUERY_KEY = ["dashboard", "today"] as const;
export const DAILY_LOAD_QUERY_KEY = (date?: string) =>
  ["dashboard", "daily-load", date ?? "today"] as const;

/** Hook para las tareas de hoy */
export function useTodayTasks() {
  return useQuery({
    queryKey: TODAY_TASKS_QUERY_KEY,
    queryFn: getTodayTasks,
    refetchInterval: 1000 * 60 * 5,  // refresca cada 5 minutos
  });
}

/** Hook para la carga del día */
export function useDailyLoad(date?: string) {
  return useQuery({
    queryKey: DAILY_LOAD_QUERY_KEY(date),
    queryFn: () => getDailyLoad(date),
  });
}
