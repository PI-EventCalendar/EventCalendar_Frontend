import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
} from "../services/taskService";
import { getCategories, createCategory } from "../services/taskCategoryService";
import { rescheduleTask } from "../services/rescheduleService";
import type { CreateTaskPayload, UpdateTaskPayload, TaskStatus, ReschedulePayload } from "../types";

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const TASKS_QUERY_KEY = ["tasks"] as const;
export const taskQueryKey = (id: number) => ["tasks", id] as const;
export const CATEGORIES_QUERY_KEY = ["task-categories"] as const;

// ─── Task Hooks ───────────────────────────────────────────────────────────────

export function useTasks(filters?: { event?: number; status?: TaskStatus; category?: number }) {
  return useQuery({
    queryKey: [...TASKS_QUERY_KEY, filters],
    queryFn: () => getTasks(filters),
  });
}

export function useTask(id: number) {
  return useQuery({
    queryKey: taskQueryKey(id),
    queryFn: () => getTaskById(id),
    enabled: !!id,
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTaskPayload) => createTask(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: TASKS_QUERY_KEY }),
  });
}

export function useUpdateTask(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateTaskPayload) => updateTask(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
      qc.invalidateQueries({ queryKey: taskQueryKey(id) });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateTaskStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: TaskStatus }) =>
      updateTaskStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: TASKS_QUERY_KEY }),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteTask(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: TASKS_QUERY_KEY }),
  });
}

export function useRescheduleTask(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ReschedulePayload) => rescheduleTask(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
      qc.invalidateQueries({ queryKey: taskQueryKey(id) });
    },
  });
}

// ─── Category Hooks ───────────────────────────────────────────────────────────

export function useCategories() {
  return useQuery({
    queryKey: CATEGORIES_QUERY_KEY,
    queryFn: getCategories,
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string; color?: string }) => createCategory(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY }),
  });
}
