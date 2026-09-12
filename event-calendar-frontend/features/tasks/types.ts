export type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface TaskCategory {
  id: number;
  name: string;
  color: string;    // Hex color, ej. "#FF5733"
  owner: number;
}

export interface Task {
  id: number;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;    // ISO 8601
  event: number | null;       // event id (FK opcional)
  category: number | null;    // category id (FK opcional)
  category_detail: TaskCategory | null;
  owner: number;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string | null;
  event?: number | null;
  category?: number | null;
}

export type UpdateTaskPayload = Partial<CreateTaskPayload>;

export interface ReschedulePayload {
  due_date: string;    // Nueva fecha ISO 8601
  reason?: string;
}
