"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCategories } from "../hooks/useTasks";
import type { Task, CreateTaskPayload, TaskStatus, TaskPriority } from "../types";

// ─── Schema ───────────────────────────────────────────────────────────────────

const taskSchema = z.object({
  title: z.string().min(1, "El título es requerido"),
  description: z.string().optional(),
  status: z.enum(["pending", "in_progress", "completed", "cancelled"]).default("pending"),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  due_date: z.string().nullable().optional(),
  event: z.number().nullable().optional(),
  category: z.number().nullable().optional(),
});

type TaskFormValues = z.infer<typeof taskSchema>;

// ─── Props ────────────────────────────────────────────────────────────────────

interface TaskFormProps {
  initialData?: Partial<Task>;
  eventId?: number;             // Pre-selecciona el evento si se crea desde un evento
  onSubmit: (payload: CreateTaskPayload) => Promise<void>;
  isLoading?: boolean;
  submitLabel?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TaskForm({
  initialData,
  eventId,
  onSubmit,
  isLoading = false,
  submitLabel = "Guardar",
}: TaskFormProps) {
  const { data: categoriesData } = useCategories();
  const categories = categoriesData?.results ?? [];

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: initialData?.title ?? "",
      description: initialData?.description ?? "",
      status: (initialData?.status as TaskStatus) ?? "pending",
      priority: (initialData?.priority as TaskPriority) ?? "medium",
      due_date: initialData?.due_date?.slice(0, 16) ?? null,
      event: initialData?.event ?? eventId ?? null,
      category: initialData?.category ?? null,
    },
  });

  const statusValue = watch("status");
  const priorityValue = watch("priority");
  const categoryValue = watch("category");

  const handleFormSubmit = async (values: TaskFormValues) => {
    await onSubmit(values as CreateTaskPayload);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4" noValidate>
      {/* Título */}
      <div className="space-y-1">
        <Label htmlFor="task-title">Título *</Label>
        <Input
          id="task-title"
          placeholder="Nombre de la tarea"
          aria-invalid={!!errors.title}
          {...register("title")}
        />
        {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
      </div>

      {/* Descripción */}
      <div className="space-y-1">
        <Label htmlFor="task-description">Descripción</Label>
        <Textarea
          id="task-description"
          placeholder="Descripción opcional"
          rows={2}
          {...register("description")}
        />
      </div>

      {/* Estado y Prioridad */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="task-status">Estado</Label>
          <Select
            value={statusValue}
            onValueChange={(val) => setValue("status", val as TaskStatus)}
          >
            <SelectTrigger id="task-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pendiente</SelectItem>
              <SelectItem value="in_progress">En progreso</SelectItem>
              <SelectItem value="completed">Completada</SelectItem>
              <SelectItem value="cancelled">Cancelada</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="task-priority">Prioridad</Label>
          <Select
            value={priorityValue}
            onValueChange={(val) => setValue("priority", val as TaskPriority)}
          >
            <SelectTrigger id="task-priority">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Baja</SelectItem>
              <SelectItem value="medium">Media</SelectItem>
              <SelectItem value="high">Alta</SelectItem>
              <SelectItem value="urgent">Urgente</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Fecha límite */}
      <div className="space-y-1">
        <Label htmlFor="task-due-date">Fecha límite</Label>
        <Input
          id="task-due-date"
          type="datetime-local"
          {...register("due_date")}
        />
      </div>

      {/* Categoría */}
      {categories.length > 0 && (
        <div className="space-y-1">
          <Label htmlFor="task-category">Categoría</Label>
          <Select
            value={categoryValue?.toString() ?? "none"}
            onValueChange={(val) =>
              setValue("category", val === "none" ? null : Number(val))
            }
          >
            <SelectTrigger id="task-category">
              <SelectValue placeholder="Sin categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sin categoría</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id.toString()}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Guardando..." : submitLabel}
      </Button>
    </form>
  );
}
