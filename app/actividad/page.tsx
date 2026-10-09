"use client";

import React, { useEffect, useState } from "react";
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

  const loadEvents = async () => {
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
  };

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
  // CARGAR EVENTOS AL ABRIR LA PÁGINA
  // ============================================================

  useEffect(() => {
    loadEvents();
  }, []);

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
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              + Crear Nuevo Evento
            </button>
          </div>

          {/* GRID DE EVENTOS */}
          {events.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
              <p className="text-gray-500">No tienes eventos creados aún.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => {
                const progress =
                  event.total_tasks > 0
                    ? Math.round(
                        (event.completed_tasks / event.total_tasks) * 100,
                      )
                    : 0;

                return (
                  <div
                    key={event.id}
                    className="flex flex-col justify-between rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-indigo-300 hover:shadow-md"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-600">
                          {event.event_date}
                        </span>

                        <div className="flex items-center gap-2">
                          {/* EDITAR */}
                          <button
                            type="button"
                            onClick={() => handleEditEvent(event.id)}
                            title="Editar evento"
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition hover:bg-indigo-50 hover:text-indigo-600"
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
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition hover:bg-red-50 hover:text-red-600"
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              delete
                            </span>
                          </button>
                        </div>
                      </div>

                      <h2 className="text-lg font-bold text-gray-900">
                        {event.title}
                      </h2>

                      <p className="line-clamp-2 text-sm text-gray-500">
                        {event.description}
                      </p>
                    </div>

                    {/* BARRA DE PROGRESO */}
                    <div className="mt-6 space-y-2 border-t pt-4">
                      <div className="flex justify-between text-xs font-medium text-gray-600">
                        <span>Progreso</span>

                        <span>{progress}%</span>
                      </div>

                      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full bg-indigo-600"
                          style={{
                            width: `${progress}%`,
                          }}
                        />
                      </div>

                      <Link
                        href={`/actividad/${event.id}`}
                        className="mt-3 block w-full rounded-lg bg-gray-50 py-2 text-center text-sm font-semibold text-indigo-600 transition hover:bg-indigo-50"
                      >
                        Ver Plan Logístico →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
