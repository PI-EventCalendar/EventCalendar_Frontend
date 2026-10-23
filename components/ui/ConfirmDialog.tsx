"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function ConfirmDialog({ open, title, description, error, busy, onCancel, onConfirm }: {
  open: boolean;
  title: string;
  description: string;
  error?: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
    <DialogContent className="sm:max-w-md">
      <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader>
      {error && <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>Cancelar</Button>
        <Button type="button" variant="destructive" onClick={onConfirm} disabled={busy}>{busy ? "Eliminando…" : "Eliminar"}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
