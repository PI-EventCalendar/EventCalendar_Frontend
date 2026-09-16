import apiClient from "@/lib/axios";
import type { PaginatedResponse } from "@/types/api";
import type { Task, CreateTaskPayload, UpdateTaskPayload, TaskStatus } from "../types";

/** GET /tasks/ — lista todas las tareas del usuario */
export async function getTasks(params?: {
  event?: number;
  status?: TaskStatus;
  category?: number;
}): Promise<PaginatedResponse<Task>> {
  const { data } = await apiClient.get<PaginatedResponse<Task>>("/tasks/", { params });
  return data;
}

/** GET /tasks/{id}/ — obtiene una tarea por ID */
export async function getTaskById(id: number): Promise<Task> {
  const { data } = await apiClient.get<Task>(`/tasks/${id}/`);
  return data;
}

/** POST /tasks/ — crea una nueva tarea */
export async function createTask(payload: CreateTaskPayload): Promise<Task> {
  const { data } = await apiClient.post<Task>("/tasks/", payload);
  return data;
}

/** PATCH /tasks/{id}/ — actualiza parcialmente una tarea */
export async function updateTask(id: number, payload: UpdateTaskPayload): Promise<Task> {
  const { data } = await apiClient.patch<Task>(`/tasks/${id}/`, payload);
  return data;
}

/** PATCH /tasks/{id}/ — atajo para cambiar solo el estado */
export async function updateTaskStatus(id: number, status: TaskStatus): Promise<Task> {
  return updateTask(id, { status });
}

/** DELETE /tasks/{id}/ — elimina una tarea */
export async function deleteTask(id: number): Promise<void> {
  await apiClient.delete(`/tasks/${id}/`);
}
