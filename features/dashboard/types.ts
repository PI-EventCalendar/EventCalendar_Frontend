import type { Task } from "@/features/tasks/types";

export interface TodayTasksSummary {
  tasks: Task[];
  total: number;
  completed: number;
  pending: number;
}

export interface DailyLoad {
  date: string;          // YYYY-MM-DD
  daily_hour_limit: string | number;
  total_hours_scheduled: string | number;
  capacity_remaining: string | number;
  is_overloaded: boolean;
  tasks: Task[];
  suggested_dates?: string[];
}
