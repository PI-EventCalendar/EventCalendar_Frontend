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
import type { Event, CreateEventPayload, EventStatus } from "../types";

// ─── Schema ───────────────────────────────────────────────────────────────────

const eventSchema = z.object({
  title: z.string().min(1, "El título es requerido").max(200),
  description: z.string().optional(),
  start_date: z.string().min(1, "La fecha de inicio es requerida"),
  end_date: z.string().min(1, "La fecha de fin es requerida"),
  location: z.string().optional(),
  status: z.enum(["draft", "active", "completed", "cancelled"]).default("draft"),
});

type EventFormValues = z.infer<typeof eventSchema>;

// ─── Props ────────────────────────────────────────────────────────────────────

interface EventFormProps {
  /** Si se proporciona, rellena el formulario para edición */
  initialData?: Partial<Event>;
  onSubmit: (payload: CreateEventPayload) => Promise<void>;
  isLoading?: boolean;
  submitLabel?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EventForm({
  initialData,
  onSubmit,
  isLoading = false,
  submitLabel = "Guardar",
}: EventFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: initialData?.title ?? "",
      description: initialData?.description ?? "",
      start_date: initialData?.start_date?.slice(0, 16) ?? "",
      end_date: initialData?.end_date?.slice(0, 16) ?? "",
      location: initialData?.location ?? "",
      status: (initialData?.status as EventStatus) ?? "draft",
    },
  });

  const statusValue = watch("status");

  const handleFormSubmit = async (values: EventFormValues) => {
    await onSubmit(values as CreateEventPayload);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4" noValidate>
      {/* Título */}
      <div className="space-y-1">
        <Label htmlFor="event-title">Título *</Label>
        <Input
          id="event-title"
          placeholder="Nombre del evento"
          aria-invalid={!!errors.title}
          {...register("title")}
        />
        {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
      </div>

      {/* Descripción */}
      <div className="space-y-1">
        <Label htmlFor="event-description">Descripción</Label>
        <Textarea
          id="event-description"
          placeholder="Descripción opcional del evento"
          rows={3}
          {...register("description")}
        />
      </div>

      {/* Fechas */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="event-start-date">Fecha inicio *</Label>
          <Input
            id="event-start-date"
            type="datetime-local"
            aria-invalid={!!errors.start_date}
            {...register("start_date")}
          />
          {errors.start_date && (
            <p className="text-xs text-destructive">{errors.start_date.message}</p>
          )}
        </div>
        <div className="space-y-1">
          <Label htmlFor="event-end-date">Fecha fin *</Label>
          <Input
            id="event-end-date"
            type="datetime-local"
            aria-invalid={!!errors.end_date}
            {...register("end_date")}
          />
          {errors.end_date && (
            <p className="text-xs text-destructive">{errors.end_date.message}</p>
          )}
        </div>
      </div>

      {/* Ubicación */}
      <div className="space-y-1">
        <Label htmlFor="event-location">Ubicación</Label>
        <Input id="event-location" placeholder="Lugar del evento" {...register("location")} />
      </div>

      {/* Estado */}
      <div className="space-y-1">
        <Label htmlFor="event-status">Estado</Label>
        <Select
          value={statusValue}
          onValueChange={(val) => setValue("status", val as EventStatus)}
        >
          <SelectTrigger id="event-status">
            <SelectValue placeholder="Selecciona un estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Borrador</SelectItem>
            <SelectItem value="active">Activo</SelectItem>
            <SelectItem value="completed">Completado</SelectItem>
            <SelectItem value="cancelled">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Guardando..." : submitLabel}
      </Button>
    </form>
  );
}
