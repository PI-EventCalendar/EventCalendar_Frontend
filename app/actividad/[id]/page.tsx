"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { TaskStatus } from "@/types";
import apiClient from "@/lib/axios";
import { RescheduleModal } from "@/features/tasks/components/RescheduleModal";
import { PostponeModal } from "@/features/tasks/components/PostponeModal";
import { ProtectedRoute } from "@/shared/components/ProtectedRoute";
import Link from "next/link";
import Sidebar from "@/components/ui/Sidebar";

// ============================================================
// TIPOS
// ============================================================

interface EventTask {
  id: number;
  title: string;
  estimated_hours: number | string;
  scheduled_date: string;
  status: TaskStatus;
  notes?: string;
}

interface Event {
  id: number;
  title: string;
  description: string;
  event_date: string;
  tasks: EventTask[];

  // Datos de progreso enviados por Django
  progress_percentage: number;
  total_tasks: number;
  completed_tasks: number;
}

// ============================================================
// PÁGINA PROTEGIDA
// ============================================================

export default function EventDetailPage() {
  return (
    <ProtectedRoute>
      <EventDetailContent />
    </ProtectedRoute>
  );
}

// ============================================================
// CONTENIDO DEL DETALLE
// ============================================================

function EventDetailContent() {
  // ============================================================
  // OBTENER ID DE LA URL
  // ============================================================

  const params = useParams<{ id: string }>();

  const eventId = params.id;

  // ============================================================
  // ESTADOS
  // ============================================================

  // Evento recibido desde Django
  const [event, setEvent] = useState<Event | null>(null);

  // Estado de carga
  const [isLoading, setIsLoading] = useState(true);

  // Error de carga
  const [error, setError] = useState<string | null>(null);

  // Tarea que está siendo actualizada
  const [updatingTaskId, setUpdatingTaskId] = useState<number | null>(null);

  // Tarea seleccionada para reprogramar
  const [taskToReschedule, setTaskToReschedule] = useState<EventTask | null>(
    null,
  );

  // Mensaje de éxito
  const [rescheduleSuccess, setRescheduleSuccess] = useState("");
  const [statusError, setStatusError] = useState("");
  const [postponeTaskId, setPostponeTaskId] = useState<number | null>(null);

  // ============================================================
  // OBTENER EVENTO
  // ============================================================

  const loadEvent = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // GET /api/v1/events/{id}/
      const response = await apiClient.get<Event>(`/events/${eventId}/`);

      console.log("Evento recibido desde Django:", response.data);

      // Guardamos el evento
      setEvent(response.data);
    } catch (error) {
      console.error("Error al cargar el evento:", error);

      setError("No fue posible cargar el evento.");
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================
  // CARGAR EVENTO AL ABRIR LA PÁGINA
  // ============================================================

  useEffect(() => {
    if (!eventId) {
      return;
    }

    loadEvent();
  }, [eventId]);

  // ============================================================
  // CAMBIAR ESTADO DE UNA TAREA
  // ============================================================

  const handleTaskStatusChange = async (
    taskId: number,
    currentStatus: TaskStatus,
    note = "",
  ) => {
    // Evitamos peticiones simultáneas
    if (updatingTaskId !== null) {
      return;
    }

    try {
      setUpdatingTaskId(taskId);
      setStatusError("");

      // ========================================================
      // DETERMINAR NUEVO ESTADO
      // ========================================================

      const newStatus = note ? "postponed" : currentStatus === "completed" ? "pending" : "completed";

      // ========================================================
      // PATCH /api/v1/tasks/{id}/
      // ========================================================

      await apiClient.patch(`/tasks/${taskId}/`, { status: newStatus, ...(note ? { notes: note } : {}) });

      // ========================================================
      // ACTUALIZAR ESTADO LOCAL
      // ========================================================

      setEvent((currentEvent) => {
        if (!currentEvent) {
          return currentEvent;
        }

        // Actualizamos la tarea
        const updatedTasks = currentEvent.tasks.map((task) => {
          if (task.id === taskId) {
            return {
              ...task,
              status: newStatus as TaskStatus,
            };
          }

          return task;
        });

        // ======================================================
        // CALCULAR PROGRESO
        // ======================================================

        const completedTasks = updatedTasks.filter(
          (task) => task.status === "completed",
        ).length;

        const totalTasks = updatedTasks.length;

        const progressPercentage =
          totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        // ======================================================
        // DEVOLVER EVENTO ACTUALIZADO
        // ======================================================

        return {
          ...currentEvent,
          tasks: updatedTasks,
          completed_tasks: completedTasks,
          total_tasks: totalTasks,
          progress_percentage: progressPercentage,
        };
      });
    } catch (error) {
      console.error("Error al actualizar la tarea:", error);
      setStatusError("No fue posible actualizar la subtarea. Verifica tu conexión e inténtalo nuevamente.");
    } finally {
      setUpdatingTaskId(null);
    }
  };

  // ============================================================
  // ESTADO DE CARGA
  // ============================================================

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl p-8">
        <p className="text-sm text-gray-500">Cargando plan logístico...</p>
      </div>
    );
  }

  // ============================================================
  // ESTADO DE ERROR
  // ============================================================

  if (error || !event) {
    return (
      <div className="mx-auto max-w-5xl p-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6">
          <p className="text-sm text-red-600">
            {error || "No se encontró el evento."}
          </p>
        </div>
      </div>
    );
  }

  // ============================================================
  // DATOS PARA EL PROGRESO
  // ============================================================

  const completedTasks = event.tasks.filter(
    (task) => task.status === "completed",
  ).length;

  const totalTasks = event.tasks.length;

  const progressPercentage =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // ============================================================
  // INTERFAZ
  // ============================================================

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-slate-900">
      <Sidebar />
      <main className="min-h-screen px-4 py-6 sm:px-6 lg:ml-64 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-6">
      <nav className="text-xs font-medium text-slate-500" aria-label="Migas de pan">
        <Link href="/actividad" className="hover:text-indigo-600">Eventos</Link><span className="mx-2">›</span><span>{event.title}</span><span className="mx-2">›</span><span className="text-indigo-600">Plan logístico</span>
      </nav>
      {/* ======================================================
          HEADER DEL EVENTO
          ====================================================== */}

      <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div><span className="inline-flex rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-indigo-700">Plan logístico</span><h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{event.title}</h1><p className="mt-2 max-w-2xl text-sm text-slate-500">{event.description || "Organiza y da seguimiento a las subtareas del evento."}</p></div>
          <Link href="/actividad" className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">+ Añadir gestión logística</Link>
        </div>
        <div className="mt-6 grid gap-3 border-t border-slate-100 pt-5 sm:grid-cols-3">
          <div><p className="text-xs uppercase tracking-wide text-slate-400">Fecha del evento</p><p className="mt-1 font-semibold">{event.event_date}</p></div><div><p className="text-xs uppercase tracking-wide text-slate-400">Subtareas</p><p className="mt-1 font-semibold">{totalTasks} - registrada(s)</p></div><div><p className="text-xs uppercase tracking-wide text-slate-400">Horas estimadas</p><p className="mt-1 font-semibold">{event.tasks.reduce((sum, task) => sum + Number(task.estimated_hours), 0).toFixed(2)} h</p></div>
        </div>
      </section>

      {/* ======================================================
          MENSAJE DE ÉXITO
          ====================================================== */}

      {rescheduleSuccess && (
        <p
          className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800"
          role="status"
          aria-live="polite"
        >
          {rescheduleSuccess}
        </p>
      )}

      {/* ======================================================
          BARRA DE PROGRESO
          ====================================================== */}

      <section className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex items-end justify-between"><div><p className="text-sm font-medium text-slate-500">Progreso global</p><p className="mt-2 text-4xl font-bold text-slate-900">{progressPercentage}<span className="text-xl">%</span></p></div><span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">{completedTasks} de {totalTasks} completadas</span></div>
        <div className="mt-5 h-3 w-full overflow-hidden rounded-full bg-indigo-100">
          <div
            className="h-full rounded-full bg-indigo-600 transition-all duration-500"
            style={{
              width: `${progressPercentage}%`,
            }}
          />
        </div>

        <p className="mt-3 text-xs text-slate-500">El porcentaje se calcula con las subtareas completadas del evento.</p>
      </div>
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"><p className="text-sm font-medium text-slate-500">Estado del plan</p><p className="mt-3 text-2xl font-bold text-slate-900">{totalTasks === 0 ? "Sin subtareas" : progressPercentage === 100 ? "Completado" : "En preparación"}</p><p className="mt-2 text-sm text-slate-500">{totalTasks === 0 ? "Añade subtareas para comenzar a medir el avance." : `${totalTasks - completedTasks} subtarea${totalTasks - completedTasks === 1 ? "" : "s"} pendiente${totalTasks - completedTasks === 1 ? "" : "s"}.`}</p></div>
      </section>

      {/* ======================================================
          LISTADO DE TAREAS
          ====================================================== */}

      <section className="space-y-4"><div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-2xl font-bold text-slate-900">Gestiones logísticas</h2><p className="text-sm text-slate-500">Selecciona una tarea para actualizar su avance o planificación.</p></div><span className="text-xs font-medium text-slate-400">{totalTasks} subtarea{totalTasks === 1 ? "" : "s"}</span></div>

        {event.tasks.length === 0 ? (
          /* ====================================================
             EMPTY STATE
             ==================================================== */

          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><p className="text-sm text-slate-500">Aún no tienes tareas logísticas en este evento. Crea un plan inicial para medir tu avance</p><Link href="/actividad" className="mt-5 inline-flex rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white">Crear plan inicial</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {event.tasks.map((task) => <article key={task.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:border-indigo-200 hover:shadow-md sm:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <input type="checkbox" checked={task.status === "completed"} onChange={() => handleTaskStatusChange(task.id, task.status)} disabled={updatingTaskId === task.id} className="mt-1 h-5 w-5 rounded border-gray-300 text-indigo-600" />
                  <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className={`text-sm font-semibold ${task.status === "completed" ? "text-gray-400 line-through" : "text-gray-900"}`}>{task.title}</h3><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${task.status === "completed" ? "bg-emerald-100 text-emerald-700" : task.status === "postponed" ? "bg-amber-100 text-amber-700" : task.status === "in_progress" ? "bg-sky-100 text-sky-700" : "bg-slate-100 text-slate-600"}`}>{task.status === "completed" ? "Completada" : task.status === "postponed" ? "Pospuesta" : task.status === "in_progress" ? "En progreso" : "Pendiente"}</span></div><p className="mt-2 text-sm text-slate-500">Fecha programada: {task.scheduled_date} <span className="mx-1">•</span> Horas estimadas: {task.estimated_hours} h</p>{task.notes && <details className="mt-2 text-xs text-slate-500"><summary className="cursor-pointer font-medium">Ver nota de posposición</summary><p className="mt-1">{task.notes}</p></details>}</div>
                </div>
                <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 lg:border-0 lg:pt-0"><button type="button" onClick={() => setTaskToReschedule(task)} className="rounded-xl bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500">Reprogramar</button>{task.status !== "completed" && <button type="button" onClick={() => setPostponeTaskId(task.id)} className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500">Posponer</button>}</div>
              </div>
            </article>)}
          </div>
        )}
      </section>

      {statusError && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">{statusError}</p>}

      {/* ======================================================
          MODAL DE REPROGRAMACIÓN
          ====================================================== */}

      <RescheduleModal
        key={`${taskToReschedule?.id ?? "none"}-${!!taskToReschedule}`}
        task={taskToReschedule}
        open={!!taskToReschedule}
        onOpenChange={(open) => !open && setTaskToReschedule(null)}
        onSuccess={() => {
          setRescheduleSuccess("Fecha actualizada");

          loadEvent();
        }}
      />
      <PostponeModal task={event.tasks.find((task) => task.id === postponeTaskId) ?? null} open={postponeTaskId !== null} onOpenChange={(open) => !open && setPostponeTaskId(null)} onSuccess={loadEvent} />
      </div>
      </main>
    </div>
  );
}
