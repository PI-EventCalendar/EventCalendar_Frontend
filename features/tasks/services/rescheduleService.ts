import apiClient from "@/lib/axios";
import type { Task, ReschedulePayload } from "../types";

/**
 * PATCH /tasks/{id}/ — reprograma una tarea actualizando scheduled_date.
 * Este es el endpoint CRUD existente para la actualización parcial de subtareas.
 */
export async function rescheduleTask(id: number, payload: ReschedulePayload): Promise<Task> {
  const { data } = await apiClient.patch<Task>(`/tasks/${id}/`, payload);
  return data;
}
