"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { useRescheduleTask } from "../hooks/useTasks";

// ─── Schema ───────────────────────────────────────────────────────────────────

const rescheduleSchema = z.object({
  scheduled_date: z.string().min(1, "La nueva fecha es requerida"),
});

type RescheduleFormValues = z.infer<typeof rescheduleSchema>;

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ReschedulableTask {
  id: number;
  title: string;
  scheduled_date: string;
}

interface RescheduleModalProps {
  task: ReschedulableTask | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RescheduleModal({ task, open, onOpenChange, onSuccess }: RescheduleModalProps) {
  const { mutateAsync: reschedule, isPending } = useRescheduleTask(task?.id ?? 0);
  const [requestError, setRequestError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RescheduleFormValues>({
    resolver: zodResolver(rescheduleSchema),
    defaultValues: { scheduled_date: task?.scheduled_date ?? "" },
  });

  const onSubmit = async (values: RescheduleFormValues) => {
    if (!task) return;
    setRequestError(null);
    try {
      await reschedule(values);
      onSuccess?.();
      reset();
      onOpenChange(false);
    } catch {
      // La fecha no se reinicia para que la persona pueda reintentarla.
      setRequestError("No se pudo reprogramar. Verifica la fecha e inténtalo de nuevo.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      if (!nextOpen) setRequestError(null);
      onOpenChange(nextOpen);
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reprogramar subtarea</DialogTitle>
          <DialogDescription>
            {task?.title} — Selecciona una nueva fecha
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2" noValidate>
          <div className="space-y-1">
            <Label htmlFor="reschedule-date">Nueva fecha</Label>
            <Input
              id="reschedule-date"
              type="date"
              aria-invalid={!!errors.scheduled_date}
              aria-describedby={errors.scheduled_date || requestError ? "reschedule-error" : undefined}
              {...register("scheduled_date")}
            />
            {errors.scheduled_date && (
              <p id="reschedule-error" className="text-xs text-destructive" role="alert">
                {errors.scheduled_date.message}
              </p>
            )}
          </div>

          {requestError && (
            <p id="reschedule-error" className="text-sm text-destructive" role="alert" aria-live="assertive">
              {requestError}
            </p>
          )}

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Guardando..." : requestError ? "Reintentar" : "Guardar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
