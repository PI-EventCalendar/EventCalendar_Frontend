// Re-exporta todos los tipos del proyecto para importación centralizada
export type { PaginatedResponse, ApiError } from "./api";
export type { AuthTokens, User, LoginPayload, RegisterPayload } from "@/features/auth/types";
export type { Event, CreateEventPayload, UpdateEventPayload } from "@/features/events/types";
export type {
  Task,
  TaskCategory,
  TaskStatus,
  TaskPriority,
  CreateTaskPayload,
  UpdateTaskPayload,
  ReschedulePayload,
  ConflictData,
  ResolutionAction,
} from "@/features/tasks/types";
export type { DailyLoad, TodayTasksSummary } from "@/features/dashboard/types";
