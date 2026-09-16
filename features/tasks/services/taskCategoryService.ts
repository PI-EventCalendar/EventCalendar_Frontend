import apiClient from "@/lib/axios";
import type { PaginatedResponse } from "@/types/api";
import type { TaskCategory } from "../types";

interface CreateCategoryPayload {
  name: string;
  color?: string;
}

/** GET /task-categories/ — lista las categorías del usuario */
export async function getCategories(): Promise<PaginatedResponse<TaskCategory>> {
  const { data } = await apiClient.get<PaginatedResponse<TaskCategory>>("/task-categories/");
  return data;
}

/** POST /task-categories/ — crea una nueva categoría */
export async function createCategory(payload: CreateCategoryPayload): Promise<TaskCategory> {
  const { data } = await apiClient.post<TaskCategory>("/task-categories/", payload);
  return data;
}

/** DELETE /task-categories/{id}/ — elimina una categoría */
export async function deleteCategory(id: number): Promise<void> {
  await apiClient.delete(`/task-categories/${id}/`);
}
