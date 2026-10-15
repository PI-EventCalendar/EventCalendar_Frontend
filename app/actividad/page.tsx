"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import apiClient from "@/lib/axios";
import { useQueryClient } from "@tanstack/react-query";

import Sidebar from "@/components/ui/Sidebar";
import CreateEventModal, {
  CreatedEvent,
} from "@/components/ui/CreateEventModal";
import { extractDailyOverloadConflict } from "@/components/ui/CreateEventConflictModal";
import { useAutoDismissMessage } from "@/lib/useAutoDismissMessage";

import { ProtectedRoute } from "@/shared/components/ProtectedRoute";

// ============================================================
// CONSTANTES
// ============================================================

// Cantidad de eventos que se muestran por página.
const PAGE_SIZE = 10;

const MONTHS = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

// ============================================================
// TIPOS
// ============================================================

interface Event {
  id: number;
  title: string;
  course: string;
  activity_type: string;
  description: string;
  location: string;
  event_date: string;
  // Estado guardado en el backend. "completed" solo se alcanza al
  // finalizar el evento (todas las subtareas completadas o canceladas).
  status: "pending" | "in_progress" | "completed";
  progress_percentage: number;
  total_tasks: number;
  completed_tasks: number;

  tasks: {
    id: number;
    title: string;
    scheduled_date: string;
    estimated_hours: string | number;
    status: string;
  }[];

  created_at: string;
}

// Estado que se muestra en la tabla.
type EventStatus = "pending" | "in_progress" | "completed" | "postponed";

// Filtro de las pestañas.
type StatusFilter = "all" | "pending" | "completed" | "postponed";

// ============================================================
// FUNCIONES AUXILIARES
// ============================================================

/**
 * Estado que se muestra para el evento:
 *
 * - Finalizado:  lo indica el backend (event.status === "completed").
 * - Pospuesto:   alguna subtarea está pospuesta.
 * - En progreso: el backend lo marca así (por ejemplo, al reabrir una
 *                subtarea de un evento que estaba finalizado).
 * - Pendiente:   cualquier otro caso.
 */
function getEventStatus(event: Event): EventStatus {
  if (event.status === "completed") {
    return "completed";
  }

  if ((event.tasks ?? []).some((task) => task.status === "postponed")) {
    return "postponed";
  }

  if (event.status === "in_progress") {
    return "in_progress";
  }

  return "pending";
}

// La pestaña "Pendientes" incluye también los eventos "En progreso".
function matchesStatusFilter(status: EventStatus, filter: StatusFilter) {
  if (filter === "all") return true;
  if (filter === "pending")
    return status === "pending" || status === "in_progress";
  return status === filter;
}

// Suma las horas estimadas de las subtareas que cumplan la condición.
function sumHours(
  tasks: Event["tasks"],
  predicate: (task: Event["tasks"][number]) => boolean = () => true,
): number {
  return (tasks ?? [])
    .filter(predicate)
    .reduce((total, task) => total + (Number(task.estimated_hours) || 0), 0);
}

// 24 -> "24"   |   1.5 -> "1.5"
function formatHours(hours: number): string {
  return Number.isInteger(hours) ? String(hours) : hours.toFixed(1);
}

// "2026-10-24" -> "24 Oct, 2026"
function formatDate(isoDate: string): string {
  const [year, month, day] = (isoDate ?? "").split("-");
  const monthName = MONTHS[Number(month) - 1];

  if (!year || !day || !monthName) {
    return isoDate;
  }

  return `${day} ${monthName}, ${year}`;
}

// El cliente se guarda en description como "Cliente: Nombre".
function getClient(event: Event): string {
  const description = event.description || "";

  return description.startsWith("Cliente: ")
    ? description.replace("Cliente: ", "").trim()
    : "";
}

// "Beatriz Mendoza" -> "BM"
function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
}

// Minúsculas y sin tildes, para que la búsqueda sea más flexible.
function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

// [1, "…", 4, 5, 6, "…", 12]
function getPageNumbers(
  totalPages: number,
  currentPage: number,
): (number | "…")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const visible = Array.from(
    new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]),
  )
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);

  const result: (number | "…")[] = [];

  visible.forEach((page, index) => {
    if (index > 0 && page - visible[index - 1] > 1) {
      result.push("…");
    }

    result.push(page);
  });

  return result;
}

// Estilos y textos de cada estado.
const STATUS_STYLES: Record<
  EventStatus,
  { label: string; pill: string; dot: string }
> = {
  pending: {
    label: "PENDIENTE",
    pill: "bg-indigo-100 text-indigo-800",
    dot: "bg-slate-500",
  },
  in_progress: {
    label: "EN PROGRESO",
    pill: "bg-sky-100 text-sky-800",
    dot: "bg-sky-500",
  },
  completed: {
    label: "COMPLETADO",
    pill: "bg-emerald-800 text-white",
    dot: "bg-emerald-700",
  },
  postponed: {
    label: "POSPUESTO",
    pill: "bg-red-100 text-red-700",
    dot: "bg-red-600",
  },
};

// ============================================================
// PÁGINA PROTEGIDA
// ============================================================

export default function EventsListPage() {
  return (
    <ProtectedRoute>
      <EventsListContent />
    </ProtectedRoute>
  );
}

// ============================================================
// CONTENIDO DE LA PÁGINA
// ============================================================

function EventsListContent() {
  // ============================================================
  // ESTADO DE LOS EVENTOS
  // ============================================================

  const [events, setEvents] = useState<Event[]>([]);

  // Controla si el modal de crear evento está abierto
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);

  // Evento que se está editando
  const [eventToEdit, setEventToEdit] = useState<Event | null>(null);

  // ============================================================
  // FILTROS Y PAGINACIÓN
  // ============================================================

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Mensajes temporales: desaparecen solos.
  const {
    message: successMessage,
    show: showSuccessMessage,
    clear: clearSuccessMessage,
  } = useAutoDismissMessage(3000);

  const {
    message: errorMessage,
    show: showErrorMessage,
    clear: clearErrorMessage,
  } = useAutoDismissMessage(5000);

  const queryClient = useQueryClient();

  // ============================================================
  // OBTENER EVENTOS
  // ============================================================

  /*
   * useCallback con [] porque la función solo usa setEvents
   * (estable) y apiClient (import de módulo). Así puede ir como
   * dependencia del useEffect sin provocar el aviso de
   * react-hooks/exhaustive-deps ni ejecuciones repetidas.
   */
  const loadEvents = useCallback(async () => {
    try {
      // GET /api/v1/events/
      const response = await apiClient.get("/events/");

      // Mostramos la respuesta para conocer
      // exactamente la estructura enviada por Django.
      console.log("Respuesta de eventos:", response.data);

      // Si el backend devuelve directamente un arreglo,
      // utilizamos ese arreglo.
      //
      // Si Django utiliza paginación:
      // { count, next, previous, results }
      //
      // utilizamos response.data.results.
      const eventsData = Array.isArray(response.data)
        ? response.data
        : response.data.results;

      // Guardamos únicamente el arreglo de eventos.
      setEvents(eventsData);
    } catch (error) {
      console.error("Error al cargar los eventos:", error);
    }
  }, []);

  // ============================================================
  // CARGAR EVENTOS AL ABRIR LA PÁGINA
  // ============================================================

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  // ============================================================
  // EDITAR EVENTO
  // ============================================================

  const handleEditEvent = async (eventId: number) => {
    try {
      console.log("Cargando evento para editar:", eventId);

      // GET /api/v1/events/{id}/
      const response = await apiClient.get(`/events/${eventId}/`);

      console.log("Evento recibido para editar:", response.data);

      setEventToEdit(response.data);
      setIsCreateEventOpen(true);
    } catch (error) {
      console.error("Error al cargar el evento para editar:", error);

      alert("No fue posible cargar la información del evento.");
    }
  };

  // ============================================================
  // ELIMINAR EVENTO
  // ============================================================

  const handleDeleteEvent = async (eventId: number) => {
    const confirmed = window.confirm(
      "¿Estás seguro de que deseas eliminar este evento?",
    );

    if (!confirmed) {
      return;
    }

    try {
      await apiClient.delete(`/events/${eventId}/`);

      // Eliminamos el evento de la interfaz
      setEvents((currentEvents) =>
        currentEvents.filter((event) => event.id !== eventId),
      );
      await queryClient.invalidateQueries({ queryKey: ["tasks"] });

      showSuccessMessage("Evento eliminado exitosamente.");
    } catch (error) {
      console.error("Error al eliminar el evento:", error);

      alert("No fue posible eliminar el evento.");
    }
  };

  // ============================================================
  // CREAR / EDITAR EVENTO
  // ============================================================

  /**
   * Guarda un evento nuevo o actualiza uno existente.
   *
   * - Si todo sale bien, termina sin lanzar error y CreateEventModal
   *   se cierra.
   * - Si falla, relanza el error (throw) para que CreateEventModal lo
   *   maneje: si es un DailyOverloadConflict (409) abre
   *   CreateEventConflictModal; si no, muestra el aviso de error.
   */
  const handleEventSaved = async (newEvent: CreatedEvent) => {
    try {
      clearErrorMessage();

      // ========================================================
      // EDICIÓN DE EVENTO
      // ========================================================

      if (eventToEdit) {
        console.log("SUBTAREAS QUE SE VAN A ENVIAR:", newEvent.tasks);

        // PATCH modifica el registro existente
        const response = await apiClient.patch(`/events/${eventToEdit.id}/`, {
          title: newEvent.title,
          activity_type: newEvent.activity_type,
          description: newEvent.description,
          location: newEvent.location,
          event_date: newEvent.event_date,
          tasks: newEvent.tasks,
        });

        console.log("Evento actualizado correctamente:", response.data);

        // Actualizamos la lista visual
        setEvents((currentEvents) =>
          currentEvents.map((event) =>
            event.id === eventToEdit.id ? response.data : event,
          ),
        );

        // Limpiamos el evento que estaba siendo editado
        setEventToEdit(null);

        // Mensaje de éxito
        showSuccessMessage("Evento actualizado exitosamente.");
        await queryClient.invalidateQueries({ queryKey: ["tasks"] });

        return;
      }

      // ========================================================
      // CREACIÓN DE EVENTO
      // ========================================================

      // 1. Enviar evento al backend
      const response = await apiClient.post("/events/", newEvent);

      // 2. Obtener evento creado
      const createdEvent = response.data;

      console.log("Evento creado correctamente:", createdEvent);

      // 3. Agregar evento a la lista visual
      setEvents((currentEvents) => [...currentEvents, createdEvent]);

      // 4. Mostrar mensaje de éxito
      showSuccessMessage("Evento guardado exitosamente.");
      await queryClient.invalidateQueries({ queryKey: ["tasks"] });
    } catch (error) {
      // ========================================================
      // MANEJO DE ERRORES
      // ========================================================

      console.error("Error al guardar el evento:", error);

      /*
       * Conflicto de carga diaria: NO mostramos el aviso de error
       * de la página. CreateEventModal abre CreateEventConflictModal
       * para que el usuario resuelva el conflicto.
       */
      if (!extractDailyOverloadConflict(error)) {
        clearSuccessMessage();
        showErrorMessage(
          eventToEdit
            ? "No fue posible actualizar el evento."
            : "No fue posible guardar el evento.",
        );
      }

      // Siempre relanzamos: CreateEventModal decide qué mostrar.
      throw error;
    }
  };

  // ============================================================
  // MÉTRICAS GLOBALES (todos los eventos)
  // ============================================================

  const allTasks = events.flatMap((event) => event.tasks ?? []);

  const totalGlobalTasks = allTasks.length;
  const completedGlobalTasks = allTasks.filter(
    (task) => task.status === "completed",
  ).length;

  // Horas de todas las subtareas y horas de las completadas.
  const totalGlobalHours = sumHours(allTasks);
  const completedGlobalHours = sumHours(
    allTasks,
    (task) => task.status === "completed",
  );

  const globalProgress =
    totalGlobalHours > 0
      ? Math.round((completedGlobalHours / totalGlobalHours) * 100)
      : 0;

  // ============================================================
  // FILTROS Y PAGINACIÓN
  // ============================================================

  // Estado de cada evento (se calcula una sola vez por render).
  const statusById = new Map(
    events.map((event) => [event.id, getEventStatus(event)] as const),
  );

  const countByFilter = (filter: StatusFilter) =>
    events.filter((event) =>
      matchesStatusFilter(statusById.get(event.id) ?? "pending", filter),
    ).length;

  const counts: Record<StatusFilter, number> = {
    all: countByFilter("all"),
    pending: countByFilter("pending"),
    completed: countByFilter("completed"),
    postponed: countByFilter("postponed"),
  };

  const normalizedSearch = normalizeText(searchTerm.trim());

  const filteredEvents = events.filter((event) => {
    const matchesStatus = matchesStatusFilter(
      statusById.get(event.id) ?? "pending",
      statusFilter,
    );

    if (!matchesStatus) {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    const searchableText = normalizeText(
      `${event.title} ${getClient(event)} ${event.location ?? ""} ${event.description ?? ""}`,
    );

    return searchableText.includes(normalizedSearch);
  });

  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / PAGE_SIZE));

  // Si se eliminan eventos y la página ya no existe, usamos la última.
  const safePage = Math.min(currentPage, totalPages);

  const startIndex = (safePage - 1) * PAGE_SIZE;
  const pageEvents = filteredEvents.slice(startIndex, startIndex + PAGE_SIZE);

  const showingFrom = filteredEvents.length === 0 ? 0 : startIndex + 1;
  const showingTo = startIndex + pageEvents.length;

  const handleStatusFilterChange = (filter: StatusFilter) => {
    setStatusFilter(filter);
    setCurrentPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const filterTabs: { value: StatusFilter; label: string }[] = [
    { value: "all", label: "Todas" },
    { value: "pending", label: "Pendientes" },
    { value: "completed", label: "Completados" },
    { value: "postponed", label: "Pospuestos" },
  ];

  // ============================================================
  // INTERFAZ
  // ============================================================

  return (
    <div className="min-h-screen bg-gray-50">
      {/* SIDEBAR */}
      <Sidebar />

      {/* CONTENIDO PRINCIPAL */}
      <main className="ml-64 min-h-screen p-8">
        {/* TOAST DE ÉXITO */}
        {successMessage && (
          <div className="fixed right-6 top-6 z-[100] flex items-center gap-3 rounded-xl border border-green-200 bg-white px-5 py-4 shadow-lg">
            <span className="material-symbols-outlined text-green-600">
              check_circle
            </span>

            <div>
              <p className="text-sm font-semibold text-gray-900">
                {successMessage}
              </p>
            </div>
          </div>
        )}

        {/* TOAST DE ERROR */}
        {errorMessage && (
          <div
            className="fixed right-6 top-6 z-[100] rounded-xl border border-red-200 bg-white px-5 py-4 shadow-lg"
            role="alert"
          >
            <p className="text-sm font-semibold text-red-800">
              Error al guardar evento
            </p>
            <p className="text-xs text-red-600">{errorMessage}</p>
          </div>
        )}

        <div className="w-full space-y-6">
          {/* HEADER */}
          <div className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Mis Eventos</h1>

              <p className="mt-1 text-sm text-gray-500">
                Gestiona los planes logísticos de tus eventos activos.
              </p>
            </div>

            {/* BOTÓN CREAR EVENTO */}
            <button
              type="button"
              onClick={() => {
                // Limpiamos cualquier evento seleccionado
                setEventToEdit(null);

                // Abrimos modal en modo creación
                setIsCreateEventOpen(true);
              }}
              className="cursor-pointer rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              + Crear Nuevo Evento
            </button>
          </div>

          {/* ======================================================
              ESTADO GLOBAL DE OPERACIONES
          ====================================================== */}

          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Estado global de operaciones
                </p>

                <div className="mt-2 flex flex-wrap items-baseline gap-x-3">
                  <p className="text-4xl font-bold text-gray-900">
                    {globalProgress}% Completado
                  </p>

                  <span className="text-sm text-gray-500">
                    ({completedGlobalTasks} de {totalGlobalTasks} gestiones
                    finalizadas)
                  </span>
                </div>
              </div>

              {/* Tiempo invertido */}
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                  <span className="material-symbols-outlined">schedule</span>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Tiempo invertido
                  </p>

                  <p className="text-base font-medium text-gray-900">
                    {formatHours(completedGlobalHours)}h /{" "}
                    {formatHours(totalGlobalHours)}h proyectadas
                  </p>
                </div>
              </div>
            </div>

            {/* Barra de progreso global (por horas) */}
            <div
              className="mt-5 h-3 w-full rounded-full bg-indigo-100"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={globalProgress}
              aria-label="Progreso global por horas"
            >
              <div
                className="relative h-full rounded-full bg-gradient-to-r from-emerald-900 to-emerald-300 transition-all duration-500"
                style={{ width: `${globalProgress}%` }}
              >
                {globalProgress > 0 && (
                  <span className="absolute right-1 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-white" />
                )}
              </div>
            </div>
          </section>

          {/* ======================================================
              FILTROS
          ====================================================== */}

          <section className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-1">
              {filterTabs.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => handleStatusFilterChange(tab.value)}
                  className={`cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold transition ${
                    statusFilter === tab.value
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {tab.label} ({counts[tab.value]})
                </button>
              ))}
            </div>

            {/* Buscador */}
            <div className="relative w-full lg:w-80">
              <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-gray-400">
                search
              </span>

              <input
                type="text"
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Filtrar evento o cliente..."
                className="h-10 w-full rounded-lg bg-indigo-50/60 pl-10 pr-3 text-sm text-gray-900 outline-none placeholder:text-gray-500 focus:bg-white focus:ring-2 focus:ring-indigo-200"
              />
            </div>
          </section>

          {/* ======================================================
              TABLA DE EVENTOS
          ====================================================== */}

          <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
            {events.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-gray-500">No tienes eventos creados aún.</p>
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-gray-500">
                  No hay eventos que coincidan con el filtro.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-left">
                  <thead className="bg-indigo-50/60 text-xs font-semibold uppercase tracking-wide text-gray-600">
                    <tr>
                      <th className="px-6 py-4">Evento</th>
                      <th className="px-4 py-4">Cliente</th>
                      <th className="px-4 py-4">Fecha del evento</th>
                      <th className="px-4 py-4 text-center">Horas estimadas</th>
                      <th className="px-4 py-4 text-center">Estado</th>
                      <th className="px-6 py-4 text-right">Acciones</th>
                    </tr>
                  </thead>

                  <tbody>
                    {pageEvents.map((event) => {
                      const status = statusById.get(event.id) ?? "pending";
                      const styles = STATUS_STYLES[status];
                      const client = getClient(event);
                      const eventHours = sumHours(event.tasks);

                      return (
                        <tr
                          key={event.id}
                          className="border-t border-gray-100 transition hover:bg-gray-50/70"
                        >
                          {/* EVENTO */}
                          <td className="px-6 py-5">
                            <div className="flex items-start gap-3">
                              <span
                                className={`mt-2 h-2 w-2 shrink-0 rounded-full ${styles.dot}`}
                              />

                              <div className="min-w-0">
                                <Link
                                  href={`/actividad/${event.id}`}
                                  title="Ver plan logístico"
                                  className="cursor-pointer text-base font-medium text-gray-900 transition hover:text-indigo-600"
                                >
                                  {event.title}
                                </Link>

                                {event.location && (
                                  <p className="mt-0.5 text-sm text-gray-500">
                                    {event.location}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* CLIENTE */}
                          <td className="px-4 py-5">
                            {client ? (
                              <div className="flex items-center gap-3">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-800">
                                  {getInitials(client)}
                                </span>

                                <span className="text-sm text-gray-900">
                                  {client}
                                </span>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">
                                Sin cliente
                              </span>
                            )}
                          </td>

                          {/* FECHA */}
                          <td className="px-4 py-5 text-sm text-gray-700">
                            {formatDate(event.event_date)}
                          </td>

                          {/* HORAS */}
                          <td className="px-4 py-5 text-center text-sm text-gray-700">
                            {formatHours(eventHours)} h
                          </td>

                          {/* ESTADO */}
                          <td className="px-4 py-5 text-center">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${styles.pill}`}
                            >
                              {styles.label}
                            </span>
                          </td>

                          {/* ACCIONES */}
                          <td className="px-6 py-5">
                            <div className="flex items-center justify-end gap-1">
                              {/* EDITAR */}
                              <button
                                type="button"
                                onClick={() => handleEditEvent(event.id)}
                                title="Editar evento"
                                aria-label={`Editar ${event.title}`}
                                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-gray-500 transition hover:bg-indigo-50 hover:text-indigo-600"
                              >
                                <span className="material-symbols-outlined text-[18px]">
                                  edit
                                </span>
                              </button>

                              {/* ELIMINAR */}
                              <button
                                type="button"
                                onClick={() => handleDeleteEvent(event.id)}
                                title="Eliminar evento"
                                aria-label={`Eliminar ${event.title}`}
                                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-gray-500 transition hover:bg-red-50 hover:text-red-600"
                              >
                                <span className="material-symbols-outlined text-[18px]">
                                  delete
                                </span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* ====================================================
                PIE: RESUMEN + PAGINACIÓN
            ===================================================== */}

            {filteredEvents.length > 0 && (
              <div className="flex flex-col gap-3 border-t border-gray-100 bg-indigo-50/40 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-gray-500">
                  Mostrando {showingFrom}–{showingTo} de {filteredEvents.length}{" "}
                  evento{filteredEvents.length === 1 ? "" : "s"}
                </p>

                {totalPages > 1 && (
                  <nav
                    className="flex items-center gap-1"
                    aria-label="Paginación"
                  >
                    <button
                      type="button"
                      onClick={() => setCurrentPage(safePage - 1)}
                      disabled={safePage === 1}
                      className="cursor-pointer rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                    >
                      Anterior
                    </button>

                    {getPageNumbers(totalPages, safePage).map((page, index) =>
                      page === "…" ? (
                        <span
                          key={`ellipsis-${index}`}
                          className="px-2 text-sm text-gray-400"
                        >
                          …
                        </span>
                      ) : (
                        <button
                          key={page}
                          type="button"
                          onClick={() => setCurrentPage(page)}
                          aria-current={page === safePage ? "page" : undefined}
                          className={`h-8 min-w-8 cursor-pointer rounded-lg px-2 text-sm font-semibold transition ${
                            page === safePage
                              ? "bg-indigo-600 text-white shadow-sm"
                              : "text-gray-600 hover:bg-white"
                          }`}
                        >
                          {page}
                        </button>
                      ),
                    )}

                    <button
                      type="button"
                      onClick={() => setCurrentPage(safePage + 1)}
                      disabled={safePage === totalPages}
                      className="cursor-pointer rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                    >
                      Siguiente
                    </button>
                  </nav>
                )}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* MODAL CREAR / EDITAR EVENTO
          (el conflicto de carga diaria lo maneja CreateEventModal) */}
      <CreateEventModal
        isOpen={isCreateEventOpen}
        onClose={() => {
          setIsCreateEventOpen(false);
          setEventToEdit(null);
        }}
        onSave={handleEventSaved}
        eventToEdit={eventToEdit}
      />
    </div>
  );
}
