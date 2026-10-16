"use client";

import React, { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import { useParams } from "next/navigation";
import { TaskStatus } from "@/types";
import apiClient from "@/lib/axios";
import { RescheduleModal } from "@/features/tasks/components/RescheduleModal";
import { PostponeModal } from "@/features/tasks/components/PostponeModal";
import { CompleteTaskModal } from "@/features/tasks/components/CompleteTaskModal";
import { ProtectedRoute } from "@/shared/components/ProtectedRoute";
import Link from "next/link";
import Sidebar from "@/components/ui/Sidebar";
import { useQueryClient } from "@tanstack/react-query";
import { useAutoDismissMessage } from "@/lib/useAutoDismissMessage";

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
  completion_note?: string | null;
}

interface Event {
  id: number;
  title: string;
  description: string;
  event_date: string;

  // Estado guardado en el backend.
  status: "pending" | "in_progress" | "completed";

  tasks: EventTask[];

  // Datos de progreso enviados por Django
  progress_percentage: number;
  total_tasks: number;
  completed_tasks: number;
}

// ============================================================
// FUNCIONES AUXILIARES
// ============================================================

/**
 * Las subtareas completadas o canceladas NO impiden finalizar el evento.
 * (Misma regla que EventService.get_blocking_tasks en el backend.)
 */
function isTaskClosed(status: TaskStatus): boolean {
  return status === "completed" || status === "cancelled";
}

/**
 * Extrae el mensaje de error que envía Django:
 * { "status": ["mensaje"] }  o  { "detail": "mensaje" }
 */
function getApiErrorMessage(error: unknown, fallback: string): string {
  const data = (
    error as { response?: { data?: Record<string, unknown> } } | null
  )?.response?.data;

  const raw = data?.status ?? data?.detail;
  const first = Array.isArray(raw) ? raw[0] : raw;

  return typeof first === "string" && first ? first : fallback;
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
  const queryClient = useQueryClient();

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

  // true mientras se envía la petición de finalizar el evento
  const [isCompletingEvent, setIsCompletingEvent] = useState(false);

  // Mensajes emergentes: desaparecen solos.
  const {
    message: successMessage,
    show: showSuccessMessage,
    clear: clearSuccessMessage,
  } =
    useAutoDismissMessage(3000);

  const {
    message: statusError,
    show: showStatusError,
    clear: clearStatusError,
  } = useAutoDismissMessage(6000);

  const [postponeTaskId, setPostponeTaskId] = useState<number | null>(null);
  const [completeTaskId, setCompleteTaskId] = useState<number | null>(null);

  // ============================================================
  // OBTENER EVENTO
  // ============================================================

  const loadEvent = useCallback(async () => {
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
  }, [eventId]);

  // ============================================================
  // CARGAR EVENTO AL ABRIR LA PÁGINA
  // ============================================================

  useEffect(() => {
    if (!eventId) {
      return;
    }

    void Promise.resolve().then(loadEvent);
  }, [eventId, loadEvent]);

  // ============================================================
  // CAMBIAR ESTADO DE UNA TAREA
  // ============================================================

  const handleTaskStatusChange = async (
    taskId: number,
    newStatus: TaskStatus,
    completionNote?: string | null,
  ) => {
    // Evitamos peticiones simultáneas
    if (updatingTaskId !== null) {
      return;
    }

    try {
      setUpdatingTaskId(taskId);
      clearStatusError();

      // ========================================================
      // DETERMINAR NUEVO ESTADO
      // ========================================================

      // ========================================================
      // PATCH /api/v1/tasks/{id}/
      // ========================================================

      await apiClient.patch(`/tasks/${taskId}/`, {
        status: newStatus,
        ...(newStatus === "completed" ? { completion_note: completionNote } : {}),
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["tasks"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);

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
              ...(newStatus === "completed" ? { completion_note: completionNote?.trim() || null } : {}),
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

          // Si el evento estaba finalizado y una subtarea se reabre,
          // el backend lo pasa a "En progreso". Lo reflejamos aquí.
          status:
            currentEvent.status === "completed" &&
            !isTaskClosed(newStatus as TaskStatus)
              ? "in_progress"
              : currentEvent.status,
        };
      });
    } catch (error) {
      console.error("Error al actualizar la tarea:", error);
      showStatusError(
        "No fue posible actualizar la subtarea. Verifica tu conexión e inténtalo nuevamente.",
      );
      throw new Error("No fue posible guardar el cambio. La nota sigue disponible para volver a intentarlo.");
    } finally {
      setUpdatingTaskId(null);
    }
  };

  // ============================================================
  // FINALIZAR EVENTO
  // ============================================================

  /**
   * POST /api/v1/events/{id}/complete/
   *
   * El backend es quien valida: si quedan subtareas sin completar
   * (las canceladas no cuentan) responde 400 con el mensaje que
   * mostramos en el aviso emergente.
   */
  const handleCompleteEvent = async () => {
    if (isCompletingEvent || !event) {
      return;
    }

    try {
      setIsCompletingEvent(true);
      clearStatusError();

      const response = await apiClient.post<Event>(
        `/events/${eventId}/complete/`,
      );

      setEvent(response.data);
      showSuccessMessage("Evento finalizado exitosamente.");
    } catch (error) {
      console.error("Error al finalizar el evento:", error);

      showStatusError(
        getApiErrorMessage(error, "No fue posible finalizar el evento."),
      );
    } finally {
      setIsCompletingEvent(false);
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

  // El evento se puede finalizar cuando todas sus subtareas están
  // completadas o canceladas.
  const isEventCompleted = event.status === "completed";
  const readyToComplete = event.tasks.every((task) =>
    isTaskClosed(task.status),
  );

  // ============================================================
  // INTERFAZ
  // ============================================================

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-slate-900">
      <Sidebar />

      {/* ======================================================
          AVISOS EMERGENTES (desaparecen solos)
      ====================================================== */}

      {successMessage && (
        <div
          className="fixed right-6 top-6 z-[100] flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 shadow-lg"
          role="status"
          aria-live="polite"
        >
          <span className="material-symbols-outlined text-green-600">
            check_circle
          </span>
          <p className="text-sm font-semibold text-gray-900">
            {successMessage}
          </p>
          <button type="button" onClick={clearSuccessMessage} aria-label="Cerrar mensaje" className="rounded p-1 text-emerald-700 hover:bg-emerald-100">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {statusError && (
        <div
          className="fixed right-6 top-6 z-[100] flex max-w-sm items-start gap-3 rounded-xl border border-red-200 bg-white px-5 py-4 shadow-lg"
          role="alert"
        >
          <span className="material-symbols-outlined text-red-600">error</span>
          <p className="text-sm font-medium text-red-700">{statusError}</p>
        </div>
      )}

      <main className="min-h-screen px-4 py-6 sm:px-6 lg:ml-64 lg:px-10">
        <div className="mx-auto max-w-6xl space-y-6">
          <nav
            className="text-xs font-medium text-slate-500"
            aria-label="Migas de pan"
          >
            <Link href="/actividad" className="hover:text-indigo-600">
              Eventos
            </Link>
            <span className="mx-2">›</span>
            <span>{event.title}</span>
            <span className="mx-2">›</span>
            <span className="text-indigo-600">Plan logístico</span>
          </nav>
          {/* ======================================================
          HEADER DEL EVENTO
          ====================================================== */}

          <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <span className="inline-flex rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-indigo-700">
                  Plan logístico
                </span>
                <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                  {event.title}
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-500">
                  {event.description ||
                    "Organiza y da seguimiento a las subtareas del evento."}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* FINALIZAR EVENTO */}
                {isEventCompleted ? (
                  <span className="inline-flex items-center gap-2 rounded-xl bg-emerald-100 px-4 py-2.5 text-sm font-semibold text-emerald-800">
                    <span className="material-symbols-outlined text-[18px]">
                      verified
                    </span>
                    Evento finalizado
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleCompleteEvent}
                    disabled={isCompletingEvent}
                    title={
                      readyToComplete
                        ? "Todas las subtareas están completadas"
                        : "Completa las subtareas para finalizar el evento"
                    }
                    className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${
                      readyToComplete
                        ? "bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500"
                        : "bg-slate-200 text-slate-600 hover:bg-slate-300 focus:ring-slate-400"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {readyToComplete ? "task_alt" : "lock"}
                    </span>
                    {isCompletingEvent ? "Finalizando..." : "Finalizar evento"}
                  </button>
                )}

                <Link
                  href="/actividad"
                  className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  + Añadir gestión logística
                </Link>
              </div>
            </div>
            <div className="mt-6 grid gap-3 border-t border-slate-100 pt-5 sm:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Fecha del evento
                </p>
                <p className="mt-1 font-semibold">{event.event_date}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Subtareas
                </p>
                <p className="mt-1 font-semibold">
                  {totalTasks} - registrada(s)
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Horas estimadas
                </p>
                <p className="mt-1 font-semibold">
                  {event.tasks
                    .reduce(
                      (sum, task) => sum + Number(task.estimated_hours),
                      0,
                    )
                    .toFixed(2)}{" "}
                  h
                </p>
              </div>
            </div>
          </section>

          {/* ======================================================
          BARRA DE PROGRESO
          ====================================================== */}

          <section className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Progreso global
                  </p>
                  <p className="mt-2 text-4xl font-bold text-slate-900">
                    {progressPercentage}
                    <span className="text-xl">%</span>
                  </p>
                </div>
                <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
                  {completedTasks} de {totalTasks} completadas
                </span>
              </div>
              <div className="mt-5 h-3 w-full overflow-hidden rounded-full bg-indigo-100">
                <div
                  className="h-full rounded-full bg-indigo-600 transition-all duration-500"
                  style={{
                    width: `${progressPercentage}%`,
                  }}
                />
              </div>

              <p className="mt-3 text-xs text-slate-500">
                El porcentaje se calcula con las subtareas completadas del
                evento.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-slate-500">
                Estado del plan
              </p>
              <p className="mt-3 text-2xl font-bold text-slate-900">
                {isEventCompleted
                  ? "Finalizado"
                  : totalTasks === 0
                    ? "Sin subtareas"
                    : readyToComplete
                      ? "Listo para finalizar"
                      : "En preparación"}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                {isEventCompleted
                  ? "Todas las subtareas están cerradas. Si reabres una, el evento vuelve a En progreso."
                  : totalTasks === 0
                    ? "Añade subtareas para comenzar a medir el avance."
                    : readyToComplete
                      ? "Ya puedes finalizar el evento."
                      : `${totalTasks - completedTasks} subtarea${totalTasks - completedTasks === 1 ? "" : "s"} pendiente${totalTasks - completedTasks === 1 ? "" : "s"}.`}
              </p>
            </div>
          </section>

          {/* ======================================================
          LISTADO DE TAREAS
          ====================================================== */}

          <section className="space-y-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  Gestiones logísticas
                </h2>
                <p className="text-sm text-slate-500">
                  Selecciona una tarea para actualizar su avance o
                  planificación.
                </p>
              </div>
              <span className="text-xs font-medium text-slate-400">
                {totalTasks} subtarea{totalTasks === 1 ? "" : "s"}
              </span>
            </div>

            {event.tasks.length === 0 ? (
              /* ====================================================
             EMPTY STATE
             ==================================================== */

              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                <p className="text-sm text-slate-500">
                  Aún no tienes tareas logísticas en este evento. Crea un plan
                  inicial para medir tu avance
                </p>
                <Link
                  href="/actividad"
                  className="mt-5 inline-flex cursor-pointer rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white"
                >
                  Crear plan inicial
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {event.tasks.map((task) => (
                  <article
                    key={task.id}
                    className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:border-indigo-200 hover:shadow-md sm:p-5"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex min-w-0 items-start gap-3">
                        <input
                          type="checkbox"
                          checked={task.status === "completed"}
                          onChange={() =>
                            task.status === "completed"
                              ? handleTaskStatusChange(task.id, "pending")
                              : setCompleteTaskId(task.id)
                          }
                          disabled={updatingTaskId === task.id}
                          className="mt-1 h-5 w-5 cursor-pointer rounded border-gray-300 text-indigo-600 disabled:cursor-not-allowed"
                        />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3
                              className={`text-sm font-semibold ${task.status === "completed" ? "text-gray-400 line-through" : "text-gray-900"}`}
                            >
                              {task.title}
                            </h3>
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${task.status === "completed" ? "bg-emerald-100 text-emerald-700" : task.status === "postponed" ? "bg-amber-100 text-amber-700" : task.status === "in_progress" ? "bg-sky-100 text-sky-700" : task.status === "cancelled" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"}`}
                            >
                              {task.status === "completed"
                                ? "Completada"
                                : task.status === "postponed"
                                  ? "Pospuesta"
                                  : task.status === "in_progress"
                                    ? "En progreso"
                                    : task.status === "cancelled"
                                      ? "Cancelada"
                                      : "Pendiente"}
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-slate-500">
                            Fecha programada: {task.scheduled_date}{" "}
                            <span className="mx-1">•</span> Horas estimadas:{" "}
                            {task.estimated_hours} h
                          </p>
                          {task.notes && (
                            <details className="mt-2 text-xs text-slate-500">
                              <summary className="cursor-pointer font-medium">
                                Ver nota de posposición
                              </summary>
                              <p className="mt-1">{task.notes}</p>
                            </details>
                          )}
                          {task.status === "completed" && task.completion_note && (
                            <details className="mt-2 text-xs text-slate-600">
                              <summary className="cursor-pointer font-medium">Ver nota de finalización</summary>
                              <p className="mt-1">{task.completion_note}</p>
                            </details>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 lg:border-0 lg:pt-0">
                        <button
                          type="button"
                          onClick={() => setTaskToReschedule(task)}
                          className="cursor-pointer rounded-xl bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          Reprogramar
                        </button>
                        {task.status !== "completed" && (
                          <button
                            type="button"
                            onClick={() => setPostponeTaskId(task.id)}
                            className="cursor-pointer rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                          >
                            Posponer
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          {/* ======================================================
          MODAL DE REPROGRAMACIÓN
          ====================================================== */}

          <RescheduleModal
            key={`${taskToReschedule?.id ?? "none"}-${!!taskToReschedule}`}
            task={
              taskToReschedule
                ? {
                    ...taskToReschedule,
                    event_date: event?.event_date,
                  }
                : null
            }
            open={!!taskToReschedule}
            onOpenChange={(open) => !open && setTaskToReschedule(null)}
            onSuccess={(description) => {
              if (!description) showSuccessMessage("Fecha actualizada");
              void loadEvent();
            }}
          />
          <PostponeModal
            task={
              event.tasks.find((task) => task.id === postponeTaskId) ?? null
            }
            open={postponeTaskId !== null}
            onOpenChange={(open) => !open && setPostponeTaskId(null)}
            onSuccess={(updated) => {
              void loadEvent();
              showSuccessMessage(
                updated?.scheduled_date
                  ? `Subtarea pospuesta para ${updated.scheduled_date}`
                  : "Subtarea pospuesta correctamente",
              );
            }}
          />
          <CompleteTaskModal
            task={event.tasks.find((task) => task.id === completeTaskId) ?? null}
            open={completeTaskId !== null}
            onOpenChange={(open) => !open && setCompleteTaskId(null)}
            onSave={async (note) => {
              if (completeTaskId === null) return;
              await handleTaskStatusChange(completeTaskId, "completed", note);
            }}
          />
        </div>
      </main>
    </div>
  );
}
