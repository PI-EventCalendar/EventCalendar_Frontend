"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import axios from "axios";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CreateEventConflictModal,
  extractDailyOverloadConflict,
  type CreateEventConflict,
  type CreateEventConflictAction,
  type CreateEventConflictPayload,
} from "@/components/ui/CreateEventConflictModal";
import { useRescheduleTask } from "../hooks/useTasks";

const MIN_TASK_HOURS = 0.25;
const MAX_TASK_HOURS = 24;
const rescheduleSchema = z.object({
  scheduled_date: z.string().min(1, "La nueva fecha es requerida"),
  estimated_hours: z.coerce.number()
    .min(MIN_TASK_HOURS, `Las horas deben ser al menos ${MIN_TASK_HOURS}`)
    .max(MAX_TASK_HOURS, `Las horas no pueden superar ${MAX_TASK_HOURS}`),
  reason: z.string().optional(),
});
type RescheduleFormValues = z.infer<typeof rescheduleSchema>;

export interface ReschedulableTask {
  id: number;
  title: string;
  scheduled_date: string;
  estimated_hours?: number | string;
  event_date?: string;
}

interface RescheduleModalProps {
  task: ReschedulableTask | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (description?: string) => void;
}

const formatDate = (value: string) => new Intl.DateTimeFormat("es-CO", {
  day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC",
}).format(new Date(`${value}T00:00:00Z`));

export function RescheduleModal({ task, open, onOpenChange, onSuccess }: RescheduleModalProps) {
  const { mutateAsync: reschedule, isPending } = useRescheduleTask(task?.id ?? 0);
  const [conflict, setConflict] = useState<CreateEventConflict | null>(null);
  const [genericError, setGenericError] = useState("");
  const [stillOverloaded, setStillOverloaded] = useState(false);
  const defaultHours = task?.estimated_hours ? Number(task.estimated_hours) : 2;
  const {
    register, handleSubmit, reset, getValues,
    formState: { errors },
  } = useForm<RescheduleFormValues>({
    resolver: zodResolver(rescheduleSchema),
    defaultValues: {
      scheduled_date: task?.scheduled_date ?? "",
      estimated_hours: defaultHours,
      reason: "Reprogramación de tarea",
    },
  });

  const handleClose = () => {
    setConflict(null);
    setGenericError("");
    setStillOverloaded(false);
    onOpenChange(false);
  };

  const onSubmit = async (values: RescheduleFormValues) => {
    if (!task) return;
    setConflict(null);
    setGenericError("");
    setStillOverloaded(false);
    if (task.event_date && values.scheduled_date > task.event_date) {
      setGenericError("La fecha reprogramada no puede ser posterior a la fecha del evento.");
      return;
    }
    try {
      await reschedule({
        new_date: values.scheduled_date,
        new_hours: values.estimated_hours,
        reason: values.reason || "Reprogramación de tarea",
      });
      onSuccess?.();
      reset();
      handleClose();
    } catch (error: unknown) {
      const overload = extractDailyOverloadConflict(error);
      if (overload) {
        setConflict(overload);
        setStillOverloaded(conflict !== null);
      } else if (axios.isAxiosError(error) && error.response?.data) {
        const data = error.response.data as Record<string, unknown>;
        const detail = data.detail ?? data.new_date ?? data.scheduled_date;
        setGenericError(Array.isArray(detail) ? String(detail[0]) : typeof detail === "string" ? detail : "No se pudo reprogramar. Verifica los datos e inténtalo de nuevo.");
      } else {
        setGenericError("No se pudo conectar con el servidor. Conservamos los datos; inténtalo nuevamente.");
      }
    }
  };

  const resolveConflict = async (
    action: CreateEventConflictAction,
    payload: CreateEventConflictPayload,
  ): Promise<string> => {
    if (!task || !conflict) throw new Error("El conflicto ya no está disponible.");
    const oldHours = Number(conflict.attempted_hours);
    const targetDate = action === "MOVE_DATE" ? payload.newDate : conflict.target_date;
    const nextHours = action === "REDUCE_HOURS" ? payload.newHours : oldHours;
    if (!targetDate || nextHours === undefined) throw new Error("No se pudo preparar la reprogramación.");
    await reschedule({
      new_date: targetDate,
      new_hours: nextHours,
      reason: "Resolución automática de conflicto de capacidad diaria",
    });
    return action === "MOVE_DATE"
      ? `Fecha actualizada: ${formatDate(conflict.target_date)} → ${formatDate(targetDate)}`
      : `Duración ajustada: ${oldHours} h → ${nextHours} h`;
  };

  const onConflictResolved = (description: string) => {
    onSuccess?.(description);
    reset();
    handleClose();
  };

  return (
    <>
      <Dialog
        open={open && !conflict}
        onOpenChange={(nextOpen) => { if (!nextOpen) handleClose(); else onOpenChange(true); }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900">Reprogramar subtarea</DialogTitle>
            <DialogDescription>{task?.title ? `“${task.title}” — Ajusta la fecha y horas planificadas` : "Ajusta la fecha y horas planificadas"}</DialogDescription>
          </DialogHeader>
          {genericError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{genericError}</p>}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="reschedule-date">Nueva fecha *</Label>
                <Input id="reschedule-date" type="date" max={task?.event_date} aria-invalid={!!errors.scheduled_date} {...register("scheduled_date")} />
                {errors.scheduled_date && <p className="text-xs text-destructive" role="alert">{errors.scheduled_date.message}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="reschedule-hours">Horas estimadas *</Label>
                <Input id="reschedule-hours" type="number" step="0.25" min={MIN_TASK_HOURS} max={MAX_TASK_HOURS} aria-invalid={!!errors.estimated_hours} {...register("estimated_hours")} />
                {errors.estimated_hours && <p className="text-xs text-destructive" role="alert">{errors.estimated_hours.message}</p>}
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="reschedule-reason">Motivo de reprogramación</Label>
              <Input id="reschedule-reason" {...register("reason")} />
            </div>
            <div className="flex justify-end gap-2 border-t pt-3">
              <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>Cancelar</Button>
              <Button type="submit" disabled={isPending} className="bg-indigo-600 text-white hover:bg-indigo-700">{isPending ? "Guardando…" : "Guardar"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <CreateEventConflictModal
        conflict={conflict}
        onClose={handleClose}
        onConflictUpdate={(updated) => { setStillOverloaded(true); setConflict(updated); }}
        onResolve={resolveConflict}
        onResolved={onConflictResolved}
        stillOverloaded={stillOverloaded}
        taskName={task?.title}
        taskHours={Number(conflict?.attempted_hours ?? getValues("estimated_hours"))}
        excludeTaskId={task?.id}
        maxDate={task?.event_date}
      />
    </>
  );
}
