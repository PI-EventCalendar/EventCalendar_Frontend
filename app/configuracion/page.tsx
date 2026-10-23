"use client";

import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Pencil, Trash2 } from "lucide-react";
import apiClient from "@/lib/axios";
import Sidebar from "@/components/ui/Sidebar";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ConflictingTask = { id: number; title: string; event__title: string; estimated_hours: string };
type ConflictDate = { date: string; hours: string; tasks: ConflictingTask[] };

const formatDate = (date: string) => new Intl.DateTimeFormat("es-CO", {
  weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
}).format(new Date(`${date}T00:00:00Z`));
const messageOf = (error: unknown) => {
  const body = (error as { response?: { data?: Record<string, unknown> } }).response?.data;
  const detail = body?.detail;
  return typeof detail === "string" ? detail : "No se pudo guardar el cambio. Inténtalo nuevamente.";
};

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [value, setValue] = useState("6.00");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [conflicts, setConflicts] = useState<ConflictDate[]>([]);
  const [selected, setSelected] = useState<ConflictingTask | null>(null);
  const [hours, setHours] = useState("");
  const [savingTask, setSavingTask] = useState(false);
  const [taskError, setTaskError] = useState("");
  const [deleting, setDeleting] = useState<ConflictingTask | null>(null);

  const refreshViews = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ["tasks"] }),
    queryClient.invalidateQueries({ queryKey: ["events"] }),
    queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
  ]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setConflicts([]);
    try {
      const { data } = await apiClient.get("/auth/profile/");
      setValue(String(data.daily_hour_limit ?? "6"));
    } catch {
      setError("No se pudo cargar tu capacidad diaria.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void Promise.resolve().then(load); }, [load]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const limit = Number(value);
    if (!Number.isFinite(limit) || limit < 1 || limit > 16) {
      setError("La capacidad diaria debe estar entre 1 y 16 horas.");
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    setConflicts([]);
    try {
      await apiClient.patch("/auth/profile/", { daily_hour_limit: limit });
      await refreshViews();
      setMessage("Capacidad diaria actualizada.");
    } catch (requestError: unknown) {
      const body = (requestError as { response?: { data?: Record<string, unknown> } }).response?.data;
      const found = Array.isArray(body?.conflicts) ? body.conflicts as ConflictDate[] : [];
      setConflicts(found);
      const detail = body?.detail;
      const message = typeof detail === "object" && detail !== null ? (detail as Record<string, unknown>).detail : detail;
      setError(typeof message === "string" ? message : "No se pudo actualizar la capacidad diaria.");
    } finally {
      setSaving(false);
    }
  };

  const editTask = (task: ConflictingTask) => {
    setTaskError("");
    setSelected(task);
    setHours(String(task.estimated_hours));
  };

  const saveHours = async (nextHours: number) => {
    if (!selected || !Number.isFinite(nextHours) || nextHours < 0.5 || nextHours > Number(selected.estimated_hours)) {
      setTaskError("Ingresa una duración menor que la actual y de al menos 0,5 h.");
      return false;
    }
    setSavingTask(true);
    setTaskError("");
    try {
      await apiClient.patch(`/tasks/${selected.id}/`, { estimated_hours: nextHours });
      await refreshViews();
      setError("");
      setMessage("Horas ajustadas. Guarda de nuevo el nuevo límite.");
      setConflicts((items) => items.flatMap((date) => {
        const nextTasks = date.tasks.map((task) => task.id === selected.id ? { ...task, estimated_hours: String(nextHours) } : task);
        const nextTotal = nextTasks.reduce((sum, task) => sum + Number(task.estimated_hours), 0);
        return nextTotal <= Number(value) ? [] : [{ ...date, tasks: nextTasks, hours: nextTotal.toFixed(2) }];
      }));
      setSelected(null);
      return true;
    } catch (saveError) {
      setTaskError(messageOf(saveError));
      return false;
    } finally {
      setSavingTask(false);
    }
  };

  const automaticAdjustment = async (date: ConflictDate) => {
    const limit = Number(value);
    let excess = Number(date.hours) - limit;
    if (excess <= 0) return;
    const plan: Array<{ task: ConflictingTask; hours: number }> = [];
    for (const task of date.tasks) {
      const current = Number(task.estimated_hours);
      const minimum = Math.min(0.5, current);
      const reduction = Math.min(excess, current - minimum);
      if (reduction > 0) {
        const next = Math.round((current - reduction) * 100) / 100;
        plan.push({ task, hours: next });
        excess = Math.round((excess - reduction) * 100) / 100;
      }
      if (excess <= 0) break;
    }
    if (excess > 0) {
      setError(`No es posible ajustar automáticamente ${formatDate(date.date)}: las subtareas deben conservar al menos 0,5 h. Reduce el límite menos o ajusta/elimina subtareas manualmente.`);
      return;
    }
    setSavingTask(true);
    setError("");
    const applied: typeof plan = [];
    try {
      for (const item of plan) {
        await apiClient.patch(`/tasks/${item.task.id}/`, { estimated_hours: item.hours });
        applied.push(item);
      }
      await refreshViews();
      setConflicts((items) => items.map((item) => item.date === date.date ? {
        ...item,
        tasks: item.tasks.map((task) => {
          const updated = plan.find((entry) => entry.task.id === task.id);
          return updated ? { ...task, estimated_hours: String(updated.hours) } : task;
        }),
        hours: String(Number(item.hours) - (Number(date.hours) - limit)),
      } : item));
      setMessage(`Horas ajustadas para ${formatDate(date.date)}. Guarda de nuevo el nuevo límite.`);
    } catch (adjustError) {
      await refreshViews();
      setConflicts((items) => items.map((item) => item.date === date.date ? {
        ...item,
        tasks: item.tasks.map((task) => {
          const updated = applied.find((entry) => entry.task.id === task.id);
          return updated ? { ...task, estimated_hours: String(updated.hours) } : task;
        }),
        hours: item.tasks.reduce((sum, task) => sum + Number(applied.find((entry) => entry.task.id === task.id)?.hours ?? task.estimated_hours), 0).toFixed(2),
      } : item));
      setError(`${messageOf(adjustError)}${applied.length ? " Los cambios guardados antes del error ya se actualizaron;" : ""} Revisa la carga e inténtalo de nuevo.`);
    } finally {
      setSavingTask(false);
    }
  };

  const removeTask = async () => {
    if (!deleting) return;
    setSavingTask(true);
    setTaskError("");
    try {
      await apiClient.delete(`/tasks/${deleting.id}/`);
      await refreshViews();
      setError("");
      setMessage("Subtarea eliminada. Guarda de nuevo el nuevo límite.");
      setConflicts((items) => items.flatMap((date) => {
        const nextTasks = date.tasks.filter((task) => task.id !== deleting.id);
        const nextTotal = nextTasks.reduce((sum, task) => sum + Number(task.estimated_hours), 0);
        return nextTotal <= Number(value) ? [] : [{ ...date, tasks: nextTasks, hours: nextTotal.toFixed(2) }];
      }));
      setDeleting(null);
    } catch (deleteError) {
      setTaskError(messageOf(deleteError));
    } finally {
      setSavingTask(false);
    }
  };

  return <div className="w-full bg-gray-50">
    <Sidebar />
    <main className="min-h-screen p-5 lg:ml-64 lg:p-8">
      <div className="mx-auto w-full max-w-4xl space-y-7">
        <header><h1 className="text-3xl font-bold text-gray-900">Configuración</h1><p className="mt-2 text-sm text-gray-600">Define cuántas horas de trabajo puedes planificar por día. La aplicación avisará si ya tienes subtareas que superan ese límite.</p></header>
        <form onSubmit={save} className="space-y-5 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="space-y-2"><Label htmlFor="daily-limit">Límite diario de horas</Label><div className="flex max-w-sm items-center gap-3"><Input id="daily-limit" type="number" min="1" max="16" step="0.5" value={value} disabled={loading || saving} onChange={(event) => setValue(event.target.value)} aria-describedby="daily-limit-help" /><span className="text-sm text-slate-500">horas por día</span></div><p id="daily-limit-help" className="text-xs text-slate-500">Ingresa un valor entre 1 y 16 horas. Predeterminado: 6 horas.</p></div>
          {(error || conflicts.length > 0) && <div role={error ? "alert" : "status"} className="space-y-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-950">{error && <p className="flex items-start gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{error}</p>}{conflicts.length > 0 && <div className="space-y-4"><p className="font-semibold">Subtareas que ocupan esas fechas:</p>{conflicts.map((date) => <section key={date.date} className="space-y-2 rounded-lg border border-rose-100 bg-white p-3"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold capitalize text-slate-900">{formatDate(date.date)}</h2><span className="text-xs font-semibold text-rose-800">{date.hours} h · límite {value} h</span></div><ul className="space-y-2">{date.tasks.map((task) => <li key={task.id} className="flex flex-col gap-3 rounded-md border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="truncate font-medium text-slate-900">{task.title}</p><p className="text-xs text-slate-500">{task.event__title} · {task.estimated_hours} h</p></div><div className="flex shrink-0 gap-2"><Button type="button" variant="outline" size="sm" className="cursor-pointer" onClick={() => editTask(task)} disabled={savingTask}><Pencil className="mr-1.5 h-3.5 w-3.5" />Ajustar horas</Button><Button type="button" variant="outline" size="sm" className="cursor-pointer border-rose-200 text-rose-700 hover:bg-rose-50" onClick={() => { setTaskError(""); setDeleting(task); }} disabled={savingTask}><Trash2 className="mr-1.5 h-3.5 w-3.5" />Eliminar</Button></div></li>)}</ul></section>)}</div>}</div>}
          {message && <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800" role="status">{message}</p>}
          <Button type="submit" disabled={loading || saving} className="cursor-pointer">{saving ? "Guardando…" : "Guardar capacidad"}</Button>
        </form>
      </div>
    </main>

    <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Ajustar horas de la subtarea</DialogTitle><DialogDescription>{selected?.title} · Puedes ajustar las horas manualmente o pedir una reducción automática para la fecha afectada.</DialogDescription></DialogHeader><div className="space-y-2"><Label htmlFor="conflict-hours">Horas estimadas (mínimo 0,5)</Label><Input id="conflict-hours" type="number" min="0.5" max={selected?.estimated_hours ?? 24} step="0.25" value={hours} onChange={(event) => setHours(event.target.value)} /></div>{taskError && <p role="alert" className="text-sm text-rose-700">{taskError}</p>}<DialogFooter className="flex-col sm:flex-row"><Button type="button" variant="outline" onClick={() => { const date = conflicts.find((item) => item.tasks.some((task) => task.id === selected?.id)); setSelected(null); if (date) void automaticAdjustment(date); }} disabled={savingTask}>Ajuste automático</Button><Button type="button" variant="outline" onClick={() => setSelected(null)} disabled={savingTask}>Cancelar</Button><Button type="button" onClick={() => void saveHours(Number(hours))} disabled={savingTask}>{savingTask ? "Guardando…" : "Guardar horas"}</Button></DialogFooter></DialogContent></Dialog>
      <ConfirmDialog open={!!deleting} title="Eliminar subtarea" description={`¿Quieres eliminar “${deleting?.title ?? ""}”? Esta acción quitará la subtarea del evento.`} error={taskError} busy={savingTask} onCancel={() => { setDeleting(null); setTaskError(""); }} onConfirm={() => void removeTask()} />
  </div>;
}
