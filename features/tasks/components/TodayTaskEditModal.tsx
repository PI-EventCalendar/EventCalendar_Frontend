"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useDeleteTask, useUpdateTask, useUpdateTaskStatus } from "../hooks/useTasks";
import type { Task } from "../types";

export function TodayTaskEditModal({
  task,
  open,
  onOpenChange,
  onSuccess,
}: {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (message: string) => void;
}) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [hours, setHours] = useState(String(task?.estimated_hours ?? ""));
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const update = useUpdateTask(task?.id ?? 0);
  const status = useUpdateTaskStatus();
  const remove = useDeleteTask();
  const pending = update.isPending || status.isPending || remove.isPending;

  const close = () => {
    if (!pending) onOpenChange(false);
  };

  const save = async () => {
    if (!task) return;
    const numericHours = Number(hours);
    if (!title.trim() || !Number.isFinite(numericHours) || numericHours < 0.25 || numericHours > 24) {
      setError("Ingresa un nombre y horas entre 0.25 y 24.");
      return;
    }
    setError("");
    try {
      await update.mutateAsync({ title: title.trim(), estimated_hours: numericHours });
      onOpenChange(false);
      onSuccess?.("Subtarea actualizada");
    } catch {
      setError("No se pudo actualizar la subtarea. Conservamos los datos introducidos.");
    }
  };

  const complete = async () => {
    if (!task) return;
    setError("");
    try {
      await status.mutateAsync({ id: task.id, status: "completed" });
      onOpenChange(false);
      onSuccess?.("Subtarea completada");
    } catch {
      setError("No se pudo completar la subtarea.");
    }
  };

  const deleteTask = async () => {
    if (!task) return;
    setError("");
    try {
      await remove.mutateAsync(task.id);
      setConfirmDelete(false);
      onOpenChange(false);
      onSuccess?.("Subtarea eliminada");
    } catch {
      setError("No se pudo eliminar la subtarea.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar subtarea logística</DialogTitle>
          <DialogDescription>Actualiza el nombre o las horas estimadas.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="today-task-title">Nombre</Label>
            <Input id="today-task-title" value={title} onChange={(event) => setTitle(event.target.value)} disabled={pending} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="today-task-hours">Horas estimadas</Label>
            <Input id="today-task-hours" type="number" min="0.25" max="24" step="0.25" value={hours} onChange={(event) => setHours(event.target.value)} disabled={pending} />
          </div>
          {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">{error}</p>}
          <div className="flex flex-wrap justify-between gap-2 border-t pt-3">
            <Button type="button" variant="destructive" onClick={() => setConfirmDelete(true)} disabled={pending}>Eliminar</Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={close} disabled={pending}>Cancelar</Button>
              <Button type="button" variant="outline" onClick={() => void complete()} disabled={pending || task?.status === "completed"}>Completar</Button>
              <Button type="button" onClick={() => void save()} disabled={pending}>{pending ? "Guardando…" : "Guardar"}</Button>
            </div>
          </div>
        </div>
      </DialogContent>
      <ConfirmDialog open={confirmDelete} title="Eliminar subtarea" description={`¿Quieres eliminar “${task?.title ?? ""}”? Esta acción quitará la subtarea del evento.`} busy={pending} onCancel={() => setConfirmDelete(false)} onConfirm={() => void deleteTask()} />
    </Dialog>
  );
}
