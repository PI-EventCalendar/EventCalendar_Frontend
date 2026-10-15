"use client";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { usePostponeTask } from "../hooks/useTasks";

export function PostponeModal({ task, open, onOpenChange, onSuccess }: { task: { id: number; title: string } | null; open: boolean; onOpenChange: (open: boolean) => void; onSuccess?: () => void }) {
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const mutation = usePostponeTask(task?.id ?? 0);
  const changeOpen = (next: boolean) => {
    if (mutation.isPending) return;
    if (!next) setError("");
    onOpenChange(next);
  };
  const submit = async () => {
    if (!task) return;
    setError("");
    try { await mutation.mutateAsync(note.trim() || null); setNote(""); onOpenChange(false); onSuccess?.(); }
    catch (requestError) {
      const response = (requestError as { response?: { data?: Record<string, unknown> } }).response;
      const body = response?.data;
      const detail = typeof body?.detail === "string" ? body.detail : undefined;
      const validationMessage = Object.values(body ?? {}).flatMap(value => Array.isArray(value) ? value : []).find((value): value is string => typeof value === "string");
      setError(detail ?? validationMessage ?? "No se encontró una fecha futura con capacidad suficiente. Ajusta las horas o el límite diario e inténtalo nuevamente.");
    }
  };
  return <Dialog open={open} onOpenChange={changeOpen}><DialogContent className="sm:max-w-md">
    <DialogHeader><DialogTitle>Posponer una tarea</DialogTitle><DialogDescription>¿Está seguro de querer posponer “{task?.title}”?</DialogDescription></DialogHeader>
    <div className="space-y-2"><Label htmlFor="postpone-note">Nota (opcional)</Label><textarea id="postpone-note" value={note} onChange={e => setNote(e.target.value)} aria-invalid={!!error} aria-describedby={error ? "postpone-error" : undefined} className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />{error && <p id="postpone-error" role="alert" className="text-sm text-destructive">{error}</p>}</div>
    <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>Cancelar</Button><Button onClick={submit} disabled={mutation.isPending}>{mutation.isPending ? "Guardando..." : "Aceptar"}</Button></div>
  </DialogContent></Dialog>;
}
