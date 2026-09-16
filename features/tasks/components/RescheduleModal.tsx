"use client";

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
import { Textarea } from "@/components/ui/textarea";
import { useRescheduleTask } from "../hooks/useTasks";
import type { Task } from "../types";

// ─── Schema ───────────────────────────────────────────────────────────────────

const rescheduleSchema = z.object({
  due_date: z.string().min(1, "La nueva fecha es requerida"),
  reason: z.string().optional(),
});

type RescheduleFormValues = z.infer<typeof rescheduleSchema>;

// ─── Props ────────────────────────────────────────────────────────────────────

interface RescheduleModalProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RescheduleModal({ task, open, onOpenChange }: RescheduleModalProps) {
  const { mutateAsync: reschedule, isPending } = useRescheduleTask(task?.id ?? 0);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RescheduleFormValues>({
    resolver: zodResolver(rescheduleSchema),
    defaultValues: {
      due_date: task?.due_date?.slice(0, 16) ?? "",
      reason: "",
    },
  });

  const onSubmit = async (values: RescheduleFormValues) => {
    if (!task) return;
    await reschedule(values);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reprogramar tarea</DialogTitle>
          <DialogDescription>
            {task?.title} — Selecciona una nueva fecha límite
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2" noValidate>
          <div className="space-y-1">
            <Label htmlFor="reschedule-date">Nueva fecha límite *</Label>
            <Input
              id="reschedule-date"
              type="datetime-local"
              aria-invalid={!!errors.due_date}
              {...register("due_date")}
            />
            {errors.due_date && (
              <p className="text-xs text-destructive">{errors.due_date.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="reschedule-reason">Motivo (opcional)</Label>
            <Textarea
              id="reschedule-reason"
              placeholder="¿Por qué se reprograma esta tarea?"
              rows={2}
              {...register("reason")}
            />
          </div>

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
              {isPending ? "Guardando..." : "Reprogramar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
