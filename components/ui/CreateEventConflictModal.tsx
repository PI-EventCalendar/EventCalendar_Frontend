"use client";

import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { AlertTriangle, CalendarClock, CheckCircle2, Clock3, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useDailyLoad } from "@/features/dashboard/hooks/useDashboard";

export interface CreateEventConflict {
  error: string;
  detail: string;
  target_date: string;
  current_hours: string;
  attempted_hours: string;
  daily_hour_limit: string;
  suggested_dates: string[];
}

export type CreateEventConflictAction = "MOVE_DATE" | "REDUCE_HOURS";
export interface CreateEventConflictPayload { newDate?: string; newHours?: number }

export function extractDailyOverloadConflict(error: unknown): CreateEventConflict | null {
  const err = error as { response?: { data?: { detail?: unknown } }; data?: unknown } | null;
  const candidates = [err?.response?.data?.detail, err?.response?.data, err?.data, error];
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "object") continue;
    const value = candidate as Partial<CreateEventConflict>;
    if (value.error !== "DailyOverloadConflict") continue;
    return {
      error: String(value.error),
      detail: String(value.detail ?? ""),
      target_date: String(value.target_date ?? ""),
      current_hours: String(value.current_hours ?? "0"),
      attempted_hours: String(value.attempted_hours ?? "0"),
      daily_hour_limit: String(value.daily_hour_limit ?? "0"),
      suggested_dates: Array.isArray(value.suggested_dates) ? value.suggested_dates : [],
    };
  }
  return null;
}

interface Props {
  conflict: CreateEventConflict | null;
  onClose: () => void;
  onConflictUpdate?: (conflict: CreateEventConflict) => void;
  onResolve: (action: CreateEventConflictAction, payload: CreateEventConflictPayload) => Promise<string>;
  onResolved?: (description: string) => void;
  taskName?: string;
  taskHours?: number;
  additionalPlannedHours?: number;
  excludeTaskId?: number;
  excludeEventId?: number;
  maxDate?: string;
  plannedLoads?: Record<string, number>;
  stillOverloaded?: boolean;
}

const formatHours = (value: number) => new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 }).format(value);
const formatDate = (value: string) => new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));

export function CreateEventConflictModal({
  conflict, onClose, onConflictUpdate, onResolve, onResolved, taskName, taskHours,
  additionalPlannedHours = 0, excludeTaskId, excludeEventId, maxDate, stillOverloaded = false,
  plannedLoads,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState("");
  const [notice, setNotice] = useState("");
  const onResolvedRef = useRef(onResolved);

  useEffect(() => { onResolvedRef.current = onResolved; }, [onResolved]);

  const load = useDailyLoad(conflict?.target_date, {
    enabled: !!conflict,
    refetchInterval: false,
    excludeTaskId,
    excludeEventId,
    suggestedHours: conflict ? Number(taskHours ?? conflict.attempted_hours) : undefined,
    maxDate,
    plannedLoads,
  });

  useEffect(() => {
    if (!success) return;
    const timer = window.setTimeout(() => {
      onResolvedRef.current?.(success);
      setSuccess("");
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [success]);

  if (!conflict) {
    return <>
      {notice && <div role="alert" className="fixed left-1/2 top-1/2 z-[300] flex w-[min(92vw,28rem)] -translate-x-1/2 -translate-y-1/2 items-start gap-3 rounded-xl border border-amber-200 bg-white p-4 text-sm text-amber-950 shadow-2xl"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" /><p className="flex-1">{notice}</p><button type="button" aria-label="Cerrar aviso" onClick={() => setNotice("")} className="rounded p-1 text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /></button></div>}
    </>;
  }

  const current = conflict;
  const fallbackLimit = Number(current.daily_hour_limit);
  const dailyLimit = load.isError ? Number.NaN : Number(load.data?.daily_hour_limit ?? fallbackLimit);
  const existingHours = load.isError ? Number.NaN : Number(load.data?.total_hours_scheduled ?? current.current_hours);
  const addHours = Number.isFinite(additionalPlannedHours) ? additionalPlannedHours : 0;
  const originalHours = Number(taskHours ?? current.attempted_hours);
  const availableHours = dailyLimit - existingHours - addHours;
  const projectedHours = existingHours + addHours + originalHours;
  const conflictDetail = Number.isFinite(projectedHours) && Number.isFinite(dailyLimit)
    ? `Quedarías con ${formatHours(projectedHours)} h planificadas (límite ${formatHours(dailyLimit)} h).`
    : current.detail;
  const suggestedDates = load.data?.suggested_dates ?? current.suggested_dates;
  const targetDate = suggestedDates.find((date) => !maxDate || date <= maxDate);
  const isSuccess = !!success;
  const dismiss = () => { setNotice(""); onClose(); };

  const run = async (action: CreateEventConflictAction) => {
    if (busy || isSuccess) return;
    setBusy(true);
    setNotice("");
    try {
      const fresh = await load.refetch();
      if (!fresh.data || fresh.isError) throw new Error("No se pudo consultar la capacidad actual. Inténtalo nuevamente.");

      if (action === "REDUCE_HOURS") {
        const remaining = Number(fresh.data.daily_hour_limit) - Number(fresh.data.total_hours_scheduled) - addHours;
        const hours = Math.floor(Math.min(originalHours, remaining) * 100) / 100;
        if (!Number.isFinite(hours) || hours < 0.5) {
          setNotice(`No es posible ajustar la subtarea: la fecha ya alcanzó su capacidad diaria permitida y deben quedar al menos 0,5 h disponibles.`);
          return;
        }
        const description = await onResolve(action, { newHours: hours });
        setSuccess(description);
      } else {
        const availableDate = (fresh.data.suggested_dates ?? []).find((date) => !maxDate || date <= maxDate);
        if (!availableDate) {
          setNotice("No hay una fecha futura disponible dentro del horizonte de búsqueda. No se modificó la subtarea.");
          return;
        }
        const description = await onResolve(action, { newDate: availableDate });
        setSuccess(description);
      }
    } catch (error) {
      const updatedConflict = extractDailyOverloadConflict(error);
      if (updatedConflict) {
        onConflictUpdate?.(updatedConflict);
        setNotice("El backend todavía detecta sobrecarga. Se actualizó el conflicto; revisa la carga y aplica otra opción.");
      } else {
        if (axios.isAxiosError(error)) {
          const response = error.response;
          const data = response?.data as Record<string, unknown> | undefined;
          const fieldError = data && ["detail", "new_date", "new_hours", "scheduled_date", "estimated_hours"].map((key) => data[key]).find(Boolean);
          const message = Array.isArray(fieldError) ? String(fieldError[0]) : typeof fieldError === "string" ? fieldError : null;
          setNotice(message ?? (response?.status === 401 || response?.status === 403
            ? "Tu sesión no permite realizar esta operación. Vuelve a iniciar sesión e inténtalo nuevamente."
            : response?.status && response.status >= 500
              ? "El servidor no pudo guardar el cambio. No se aplicó la operación; inténtalo nuevamente."
              : !response
                ? "No se pudo conectar con el servidor. No se aplicó el cambio; verifica tu conexión e inténtalo nuevamente."
                : "No se pudo guardar el cambio. Verifica los datos e inténtalo nuevamente."));
        } else {
          setNotice(error instanceof Error ? error.message : "No se pudo resolver el conflicto. Inténtalo nuevamente.");
        }
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Dialog open onOpenChange={(open) => { if (!open && !busy && !success) dismiss(); }}>
        <DialogContent showCloseButton={false} className="max-h-[90vh] overflow-y-auto rounded-2xl border-0 p-0 shadow-2xl sm:max-w-lg">
          <section className={`rounded-2xl border p-5 transition-colors sm:p-6 ${isSuccess ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isSuccess ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                  {isSuccess ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                </span>
                <DialogHeader className="gap-1 text-left">
                  <DialogTitle className={`text-lg font-bold ${isSuccess ? "text-emerald-950" : "text-rose-950"}`}>{isSuccess ? "Operación exitosa" : stillOverloaded ? "El día continúa sobrecargado" : "Conflicto de capacidad diaria"}</DialogTitle>
                  <DialogDescription className={`${isSuccess ? "text-emerald-800" : "text-rose-800"}`}>
                    {isSuccess ? success : `${taskName ? `“${taskName}” · ` : ""}${conflictDetail}`}
                  </DialogDescription>
                </DialogHeader>
              </div>
              {!busy && !isSuccess && <button type="button" aria-label="Cerrar panel" onClick={dismiss} className="rounded-lg p-2 text-slate-500 transition hover:bg-white/70 hover:text-slate-900"><X className="h-4 w-4" /></button>}
            </div>

            {!isSuccess && (
              <>
                <div className="mt-5 grid grid-cols-3 gap-2 rounded-xl border border-rose-100 bg-white p-3 text-center">
                  <div><p className="text-xs text-slate-500">Ya planificadas</p><p className="mt-1 font-semibold tabular-nums text-slate-900">{Number.isFinite(existingHours) ? `${formatHours(existingHours + addHours)} h` : "—"}</p></div>
                  <div><p className="text-xs text-slate-500">Esta subtarea</p><p className="mt-1 font-semibold tabular-nums text-rose-700">{formatHours(originalHours)} h</p></div>
                  <div><p className="text-xs text-slate-500">Límite diario</p><p className="mt-1 font-semibold tabular-nums text-slate-900">{Number.isFinite(dailyLimit) && dailyLimit > 0 ? formatHours(dailyLimit) : "—"} h</p></div>
                </div>
                <p className="mt-3 flex items-center gap-2 text-xs text-slate-600"><Clock3 className="h-4 w-4" />Capacidad libre para el ajuste: {Number.isFinite(availableHours) ? `${formatHours(Math.max(0, availableHours))} h` : "consultando…"}{load.isFetching && <span className="animate-pulse">Actualizando</span>}</p>
                {notice && <div role="alert" className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"><p className="flex-1">{notice}</p><button type="button" aria-label="Cerrar aviso" onClick={() => setNotice("")} className="rounded p-0.5 hover:bg-amber-100"><X className="h-4 w-4" /></button></div>}
                {load.isError && <p role="alert" className="mt-3 text-sm text-rose-800">No se pudo actualizar la capacidad diaria. Reintenta una acción para volver a consultar.</p>}
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <Button type="button" disabled={busy || load.isLoading} onClick={() => void run("REDUCE_HOURS")} className="h-11 bg-indigo-700 text-white hover:bg-indigo-800"><Pencil className="mr-2 h-4 w-4" />{busy ? "Validando…" : "Ajustar horas"}</Button>
                  <Button type="button" variant="outline" disabled={busy || load.isLoading} onClick={() => void run("MOVE_DATE")} className="h-11 border-indigo-200 text-indigo-800 hover:bg-indigo-50"><CalendarClock className="mr-2 h-4 w-4" />Cambiar fecha{targetDate ? ` · ${formatDate(targetDate)}` : ""}</Button>
                </div>
                <div className="mt-4 flex justify-end border-t border-rose-200 pt-3"><Button type="button" variant="ghost" disabled={busy} onClick={dismiss}>Cancelar</Button></div>
              </>
            )}
          </section>
        </DialogContent>
      </Dialog>
    </>
  );
}
