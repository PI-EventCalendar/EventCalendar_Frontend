"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function CompleteTaskModal({
  task,
  open,
  onOpenChange,
  onSave,
}: {
  task: { id: number; title: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (note: string | null) => Promise<void>;
}) {
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const changeOpen = (next: boolean) => {
    if (saving) return;
    if (!next) {
      setNote("");
      setError("");
    }
    onOpenChange(next);
  };

  const save = async () => {
    if (!task || saving) return;
    setSaving(true);
    setError("");
    const saveRequest = onSave(note.trim() || null);
    onOpenChange(false);
    try {
      await saveRequest;
      setNote("");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo completar la subtarea. Inténtalo nuevamente.");
      onOpenChange(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Completar subtarea</DialogTitle>
          <DialogDescription>Confirma la finalización de “{task?.title}”. Puedes añadir una nota opcional.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="completion-note">Nota de finalización (opcional)</Label>
          <textarea
            id="completion-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            aria-invalid={!!error}
            aria-describedby={error ? "completion-note-error" : undefined}
            className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {error && <p id="completion-note-error" role="alert" className="text-sm text-destructive">{error}</p>}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => changeOpen(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={save} disabled={saving || !task}>{saving ? "Guardando..." : "Guardar"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
