import type { Task } from "@/features/tasks/types";

export interface TodayTasksSummary {
  tasks: Task[];
  total: number;
  completed: number;
  pending: number;
}

export interface DailyLoad {
  date: string;          // YYYY-MM-DD
  task_count: number;
  completed_count: number;
  load_percentage: number;  // 0–100, calculado por el backend
}
