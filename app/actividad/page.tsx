'use client';

import React, { useEffect, useState } from 'react';//Cargar eventos con useEFFECT cuando se abra la pagina
import Link from 'next/link';
import apiClient from '@/lib/axios';

import Sidebar from '@/components/ui/Sidebar';
import CreateEventModal, {
  CreatedEvent,
} from '@/components/ui/CreateEventModal';

// Estructura de un evento recibida desde el backend.
interface Event {
  id: number;
  title: string;
  course: string;
  activity_type: string;
  description: string;
  event_date: string;
  progress_percentage: number;
  total_tasks: number;
  completed_tasks: number;
  tasks: {
    title: string;
    scheduled_date: string;
    estimated_hours: string | number;
    status: string;
  }[];
  //Verifi
  created_at: string;
}

export default function EventsListPage() {

  // ============================================================
  // ESTADO DE LOS EVENTOS
  // ============================================================
  // Lista de eventos obtenidos desde el backend.
  const [events, setEvents] = useState<Event[]>([]);

  // Controla si el modal de crear evento está abierto
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
  // Evento que se está editando.
  // Si es null, estamos creando uno nuevo.
  const [eventToEdit, setEventToEdit] = useState<Event | null>(null);
  //MENSAJE DE EXITO
  const [successMessage, setSuccessMessage] = useState("");

  // ============================================================
  // OBTENER EVENTOS
  // ============================================================
  //
  // Endpoint:
  //
  // GET /api/v1/events/
  //
  // apiClient ya tiene configurado el /api/v1
  // mediante NEXT_PUBLIC_API_URL.
  
  const loadEvents = async () => {
    try {
      // Realizamos la petición:
      // GET /api/v1/events/
      const response = await apiClient.get('/events/');

      // Mostramos la respuesta para conocer
      // exactamente la estructura enviada por Django.
      console.log('Respuesta de eventos:', response.data);

      // Si el backend devuelve directamente un arreglo,
      // utilizamos ese arreglo.
      //
      // Si Django utiliza paginación y devuelve:
      // { count, next, previous, results }
      // utilizamos response.data.results.
      const eventsData = Array.isArray(response.data)
        ? response.data
        : response.data.results;
        

      // Guardamos únicamente el arreglo de eventos.
      setEvents(eventsData);

    } catch (error) {
      console.error('Error al cargar los eventos:', error);
    }
  };
  
  //EDICION DE. UN EVENTO (abre el mismo evento)
  const handleEditEvent = async (eventId: number) => {
    try {
      
      console.log("Cargando evento para editar:", eventId);

      const response = await apiClient.get(`/events/${eventId}/`);

      console.log("Evento recibido para editar:", response.data);

      setEventToEdit(response.data);
      setIsCreateEventOpen(true);

    } catch (error) {
      console.error(
        "Error al cargar el evento para editar:",
        error
      );

      alert("No fue posible cargar la información del evento.");
    }
  };

  //ELIMINAR EL EVENTO
  const handleDeleteEvent = async (eventId: number) => {

    const confirmed = window.confirm(
      "¿Estás seguro de que deseas eliminar este evento?"
    );

    if (!confirmed) {
      return;
    }

    try {
      await apiClient.delete(`/events/${eventId}/`);

      // Eliminamos el evento de la interfaz
      setEvents((currentEvents) =>
        currentEvents.filter((event) => event.id !== eventId)
      );

      setSuccessMessage("Evento eliminado exitosamente.");

      setTimeout(() => {
        setSuccessMessage("");
      }, 3000);

    } catch (error) {
      console.error("Error al eliminar el evento:", error);

      alert("No fue posible eliminar el evento.");
    }
  };

  // ============================================================
  // CARGAR EVENTOS AL ABRIR LA PÁGINA
  // ============================================================
  //
  // useEffect se ejecuta cuando el componente se monta.
  //
  useEffect(() => {

    loadEvents();

  }, []);



    // ============================================================
  // CREAR EVENTO EN EL BACKEND
  // ============================================================
  //
  // Recibe la información que viene del modal y la envía
  // al endpoint de Django:

  const handleEventSaved = async (newEvent: CreatedEvent) => {


    try {

      // --------------------------------------------------------
      // 1. Enviar el evento al backend
      // --------------------------------------------------------
      //
      // apiClient ya tiene configurada la URL base y
      // también agrega automáticamente el JWT.
      //
      const response = await apiClient.post('/events/', newEvent);

      // --------------------------------------------------------
      // 2. Obtener el evento creado
      // --------------------------------------------------------
      //
      // Django devuelve el evento con:
      //
      // - id real de la BD
      // - total_tasks
      // - completed_tasks
      // - progress_percentage
      // - tasks
      //
      const createdEvent = response.data;

      console.log('Evento creado correctamente:', createdEvent);

      // --------------------------------------------------------
      // 3. Agregar el evento creado a la lista visual
      // --------------------------------------------------------
      //
      // IMPORTANTE:
      // Usamos el ID que viene de Django.
      // Ya NO usamos Date.now().
      //
      setEvents((currentEvents) => [
        ...currentEvents,
        createdEvent,
      ]);

      // --------------------------------------------------------
      // 4. Mostrar mensaje de éxito
      // --------------------------------------------------------

      setSuccessMessage("Evento guardado exitosamente.");

      // Ocultamos el mensaje después de 3 segundos.
      setTimeout(() => {
        setSuccessMessage("");
      }, 3000);

    } catch (error) {

      // --------------------------------------------------------
      // 5. Manejo de errores
      // --------------------------------------------------------
      //
      // Si Django rechaza la petición, el evento NO se agrega
      // visualmente como si se hubiera guardado.
      //
      console.error("Error al guardar el evento:", error);

      setSuccessMessage("No fue posible guardar el evento.");

      setTimeout(() => {
        setSuccessMessage("");
      }, 3000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">

      {/* SIDEBAR */}
      <Sidebar />

      {/* CONTENIDO PRINCIPAL */}
      <main className="ml-64 min-h-screen">
        {successMessage && (
          <div className="fixed right-6 top-6 z-[100] flex items-center gap-3 rounded-xl border border-green-200 bg-white px-5 py-4 shadow-lg">
            <span className="material-symbols-outlined text-green-600">
              check_circle
            </span>

            <div>
              <p className="text-sm font-semibold text-gray-900">
                Guardado exitosamente
              </p>

              <p className="text-xs text-gray-500">
                El evento fue agregado a Mis Eventos.
              </p>
            </div>
          </div>
        )}

        <div className="p-8 max-w-6xl mx-auto space-y-6">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-6">

            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Mis Eventos
              </h1>

              <p className="text-sm text-gray-500 mt-1">
                Gestiona los planes logísticos de tus eventos activos.
              </p>
            </div>

            {/* BOTÓN CREAR EVENTO */}
            <button
              type="button"
              onClick={() => setIsCreateEventOpen(true)}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 shadow-sm transition"
            >
              + Crear Nuevo Evento
            </button>

          </div>

          {/* Grid de Eventos (Tarea Núcleo T1) */}
          {events.length === 0 ? (

            <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
              <p className="text-gray-500">
                No tienes eventos creados aún.
              </p>
            </div>

          ) : (

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

              {events.map((event) => {

                const progress = Math.round(
                  (event.completed_tasks / event.total_tasks) * 100
                );

                return (
                  <div
                    key={event.id}
                    className="flex flex-col justify-between rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:border-indigo-300 hover:shadow-md transition"
                  >

                    <div className="space-y-3">


                      <div className="flex justify-between items-start">

                        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
                          {event.event_date}
                        </span>

                        <div className="flex items-center gap-2">

                          {/* EDITAR */}
                          <button
                            type="button"
                            onClick={() => handleEditEvent(event.id)}
                            title="Editar evento"
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 transition"
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
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 transition"
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

                      <p className="text-sm text-gray-500 line-clamp-2">
                        {event.description}
                      </p>

                    </div>

                    {/* Barra de progreso rápida */}
                    <div className="mt-6 pt-4 border-t space-y-2">

                      <div className="flex justify-between text-xs font-medium text-gray-600">
                        <span>Progreso</span>
                        <span>{progress}%</span>
                      </div>

                      <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">

                        <div
                          className="h-full bg-indigo-600 rounded-full"
                          style={{ width: `${progress}%` }}
                        />

                      </div>

                      <Link
                        href={`/actividad/${event.id}`}
                        className="mt-3 block text-center w-full rounded-lg bg-gray-50 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 transition"
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

      {/* MODAL CREAR EVENTO */}
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