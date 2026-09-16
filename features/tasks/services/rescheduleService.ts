import apiClient from "@/lib/axios";
import type { Task, ReschedulePayload } from "../types";

/**
 * POST /tasks/{id}/reschedule/ — reprograma una tarea a una nueva fecha.
 * El backend registra el motivo y actualiza due_date.
 */
export async function rescheduleTask(id: number, payload: ReschedulePayload): Promise<Task> {
  const { data } = await apiClient.post<Task>(`/tasks/${id}/reschedule/`, payload);
  return data;
}
