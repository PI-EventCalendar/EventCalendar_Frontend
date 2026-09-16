"use client";
// 1. IMPORTACIONES DE LIBRERÍAS DE CONTROL DE FORMULARIOS Y VALIDACIÓN
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
// 2. IMPORTACIONES DE COMPONENTES DE UI (SHADCN UI / RADIX)
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

// ─── ESQUEMA DE VALIDACIÓN (ZOD) ──────────────────────────────────────────────
// Define las reglas de validación para cada campo y fuerza a TypeScript a 
// reconocer qué campos son estrictamente obligatorios y cuáles son opcionales.

const taskSchema = z.object({
  title: z.string().min(1, "El título es requerido"),
  description: z.string().optional().default(""),
  status: z.enum(["pending", "in_progress", "completed", "cancelled"]).default("pending"),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  due_date: z.string().nullable().optional(),
  event: z.number().nullable().optional(),
  category: z.number().nullable().optional(),
  scheduled_date: z.string().min(1, "La fecha programada es requerida"),
  estimated_hours: z.coerce.number().positive("Las horas deben ser mayores a 0"),
  provider_name: z.string().optional().default(""),
  provider_company: z.string().optional().default(""),
  notes: z.string().optional().default(""),
});
// Extrae el tipo TypeScript directamente del esquema de Zod
export type TaskFormValues = z.input<typeof taskSchema>;

// ─── INTERFAZ DE PROPS ────────────────────────────────────────────────────────
// Define qué propiedades puede recibir el componente <TaskForm /> desde la vista madre.

interface TaskFormProps {
  initialData?: Partial<Task>;     // Si se pasa, el formulario se llena para EDITAR una tarea
  eventId?: number;                // Pre-selecciona un evento si la tarea se crea desde la página de un Evento
  onSubmit: (payload: CreateTaskPayload) => Promise<void>; // Función de envío al Backend
  isLoading?: boolean;             // Deshabilita el botón mientras la petición HTTP está en curso
  submitLabel?: string;            // Texto dinámico para el botón ("Guardar", "Crear Tarea", etc.)
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────

export function TaskForm({
  initialData,
  eventId,
  onSubmit,
  isLoading = false,
  submitLabel = "Guardar",
}: TaskFormProps) {
  // A. HOOK CUSTOMIZADO: Carga las categorías existentes desde el Backend mediante React Query/SWR
  const { data: categoriesData } = useCategories();
  const categories = categoriesData?.results ?? [];

  // B. REACT HOOK FORM: Gestión del estado local del formulario y enlace con Zod
  const {
    register,     // Registra inputs nativos de HTML (Input, Textarea)
    handleSubmit, // Envuelve la función de submit para ejecutar validaciones primero
    setValue,     // Permite cambiar manualmente el valor de un campo (necesario para componentes de UI complejos como <Select />)
    watch,        // Escucha cambios en tiempo real de campos específicos
    formState: { errors }, // Contiene los errores de validación generados por Zod
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema), // Enlaza Zod con React Hook Form
    defaultValues: {
      title: initialData?.title ?? "",
      description: initialData?.description ?? "",
      status: (initialData?.status as TaskStatus) ?? "pending",
      priority: (initialData?.priority as TaskPriority) ?? "medium",
      due_date: initialData?.due_date?.slice(0, 16) ?? null,
      event: initialData?.event ?? eventId ?? null,
      category: initialData?.category ?? null,
      scheduled_date: initialData?.scheduled_date ?? "",
      estimated_hours: initialData?.estimated_hours ? Number(initialData.estimated_hours) : 1,
      provider_name: initialData?.provider_name ?? "",
      provider_company: initialData?.provider_company ?? "",
      notes: initialData?.notes ?? "",
    },
  });
  // C. MONITOREO DE ESTADOS: Necesario para controlar el valor visible de los <Select /> de Shadcn UI
  const statusValue = watch("status");
  const priorityValue = watch("priority");
  const categoryValue = watch("category");
 // D. HANDLER DE ENVÍO: Transforma y envía los datos validados al Backend
  const handleFormSubmit: SubmitHandler<TaskFormValues> = async (values) => {
    await onSubmit(values as CreateTaskPayload);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4" noValidate>
      
      {/* CUALIDAD: Título (Obligatorio) */}
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

      {/* CUALIDAD: Descripción */}
      <div className="space-y-1">
        <Label htmlFor="task-description">Descripción</Label>
        <Textarea
          id="task-description"
          placeholder="Descripción opcional"
          rows={2}
          {...register("description")}
        />
      </div>

      {/* REGLA DE NEGOCIO: Programación Logística (Fecha Programada y Horas Estimadas) */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="task-scheduled-date">Fecha Programada *</Label>
          <Input
            id="task-scheduled-date"
            type="date"
            aria-invalid={!!errors.scheduled_date}
            {...register("scheduled_date")}
          />
          {errors.scheduled_date && (
            <p className="text-xs text-destructive">{errors.scheduled_date.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor="task-estimated-hours">Horas Estimadas (Max 6h/día) *</Label>
          <Input
            id="task-estimated-hours"
            type="number"
            step="0.5"
            min="0.5"
            max="6"
            aria-invalid={!!errors.estimated_hours}
            {...register("estimated_hours")}
          />
          {errors.estimated_hours && (
            <p className="text-xs text-destructive">{errors.estimated_hours.message}</p>
          )}
        </div>
      </div>

      {/* ESTADO Y PRIORIDAD: Desplegables accesibles controlados por setValue */}
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

      {/* FECHA LÍMITE */}
      <div className="space-y-1">
        <Label htmlFor="task-due-date">Fecha límite</Label>
        <Input
          id="task-due-date"
          type="datetime-local"
          {...register("due_date")}
        />
      </div>

      {/* CATEGORÍA: Renderizado condicional si existen categorías creadas */}
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

      {/* BOTÓN DE ACCIÓN ACCESIBLE */}
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Guardando..." : submitLabel}
      </Button>
    </form>
  );
}