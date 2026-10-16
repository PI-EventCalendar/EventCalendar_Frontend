import { useQuery } from "@tanstack/react-query";
import { getTodayTasks, getDailyLoad } from "../services/dashboardService";

export const TODAY_TASKS_QUERY_KEY = ["dashboard", "today"] as const;
export const DAILY_LOAD_QUERY_KEY = (
  date?: string,
  options?: { excludeTaskId?: number; excludeEventId?: number; suggestedHours?: number; maxDate?: string; plannedLoads?: Record<string, number> },
) => ["dashboard", "daily-load", date ?? "today", options ?? {}] as const;

/** Hook para las tareas de hoy */
export function useTodayTasks() {
  return useQuery({
    queryKey: TODAY_TASKS_QUERY_KEY,
    queryFn: getTodayTasks,
    refetchInterval: 1000 * 60 * 5,  // refresca cada 5 minutos
  });
}

/** Hook para la carga del día */
export function useDailyLoad(
  date?: string,
  options?: {
    enabled?: boolean;
    refetchInterval?: number | false;
    excludeTaskId?: number;
    excludeEventId?: number;
    suggestedHours?: number;
    maxDate?: string;
    plannedLoads?: Record<string, number>;
  },
) {
  const { enabled, refetchInterval, ...filters } = options ?? {};
  return useQuery({
    queryKey: DAILY_LOAD_QUERY_KEY(date, filters),
    queryFn: () => getDailyLoad(date, filters),
    enabled,
    refetchInterval,
  });
}
