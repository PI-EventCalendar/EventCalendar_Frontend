"use client";

import { useState } from "react";

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Subtask {
  id: number;
  name: string;
  date: string;
  hours: number;
  provider: string;
}

export default function CreateEventModal({
  isOpen,
  onClose,
}: CreateEventModalProps) {
  const [eventName, setEventName] = useState("");
  const [eventType, setEventType] = useState("Conferencia Corporativa");
  const [client, setClient] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [location, setLocation] = useState("");

  const [taskName, setTaskName] = useState("");
  const [taskDate, setTaskDate] = useState("");
  const [taskHours, setTaskHours] = useState("");
  const [taskProvider, setTaskProvider] = useState("");

  const [subtasks, setSubtasks] = useState<Subtask[]>([]);

  if (!isOpen) {
    return null;
  }

  const handleAddSubtask = () => {
    if (!taskName.trim() || !taskHours) {
      return;
    }

    const newSubtask: Subtask = {
      id: Date.now(),
      name: taskName,
      date: taskDate,
      hours: Number(taskHours),
      provider: taskProvider,
    };

    setSubtasks((current) => [...current, newSubtask]);

    setTaskName("");
    setTaskDate("");
    setTaskHours("");
    setTaskProvider("");
  };

  const handleDeleteSubtask = (id: number) => {
    setSubtasks((current) =>
      current.filter((task) => task.id !== id)
    );
  };

  const totalHours = subtasks.reduce(
    (total, task) => total + task.hours,
    0
  );

  const handleSaveDraft = () => {
    console.log("Guardar borrador", {
      eventName,
      eventType,
      client,
      eventDate,
      location,
      subtasks,
    });
  };

  const handlePublish = () => {
    console.log("Publicar evento", {
      eventName,
      eventType,
      client,
      eventDate,
      location,
      subtasks,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-6xl max-h-[96vh] overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
              <span className="material-symbols-outlined">
                event_available
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-gray-900">
                  Nuevo Evento & Plan Logístico
                </h2>

                <span className="rounded-full bg-indigo-100 px-2 py-1 text-xs font-bold uppercase text-indigo-700">
                  En Configuración
                </span>
              </div>

              <p className="text-xs text-gray-500">
                Define los datos clave del evento y desglosa el plan
                operativo en subtareas con horas y plazos.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900"
          >
            <span className="material-symbols-outlined">
              close
            </span>
          </button>
        </div>

        {/* BODY */}
        <div className="max-h-[calc(96vh-150px)] overflow-y-auto bg-gray-50/50 p-5">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">

            {/* COLUMNA IZQUIERDA */}
            <div className="flex flex-col gap-4 lg:col-span-8">

              {/* INFORMACIÓN GENERAL */}
              <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">

                <div className="mb-4 flex items-center gap-3 border-b border-gray-100 pb-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-sm font-bold text-indigo-600">
                    1
                  </span>

                  <div>
                    <h3 className="font-semibold text-gray-900">
                      Información General del Evento
                    </h3>

                    <p className="text-xs text-gray-500">
                      Datos básicos y especificaciones operativas esenciales
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

                  {/* NOMBRE */}
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-xs font-semibold text-gray-700">
                      Nombre del Evento *
                    </label>

                    <input
                      type="text"
                      value={eventName}
                      onChange={(e) => setEventName(e.target.value)}
                      placeholder="ej. Cumbre de Innovación & Sostenibilidad 2025"
                      className="h-10 w-full rounded-lg border border-gray-300 bg-gray-50 px-3 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>

                  {/* TIPO */}
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-700">
                      Tipo de Evento *
                    </label>

                    <select
                      value={eventType}
                      onChange={(e) => setEventType(e.target.value)}
                      className="h-10 w-full rounded-lg border border-gray-300 bg-gray-50 px-3 text-sm outline-none focus:border-indigo-500 focus:bg-white"
                    >
                      <option>Conferencia Corporativa</option>
                      <option>Boda / Social</option>
                      <option>Lanzamiento de Producto</option>
                      <option>Gala Institucional</option>
                      <option>Congreso / Simposio</option>
                      <option>Festival Cultural</option>
                    </select>
                  </div>

                  {/* CLIENTE */}
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-700">
                      Cliente / Contacto
                    </label>

                    <input
                      type="text"
                      value={client}
                      onChange={(e) => setClient(e.target.value)}
                      placeholder="ej. Beatriz Mendoza - Grupo TechCorp"
                      className="h-10 w-full rounded-lg border border-gray-300 bg-gray-50 px-3 text-sm outline-none focus:border-indigo-500 focus:bg-white"
                    />
                  </div>

                  {/* FECHA */}
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-700">
                      Fecha y Hora del Evento *
                    </label>

                    <input
                      type="datetime-local"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className="h-10 w-full rounded-lg border border-gray-300 bg-gray-50 px-3 text-sm outline-none focus:border-indigo-500 focus:bg-white"
                    />
                  </div>

                  {/* LUGAR */}
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-700">
                      Lugar / Plazo límite
                    </label>

                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="ej. Finca El Encinar, Madrid"
                      className="h-10 w-full rounded-lg border border-gray-300 bg-gray-50 px-3 text-sm outline-none focus:border-indigo-500 focus:bg-white"
                    />
                  </div>
                </div>
              </section>

              {/* SUBTAREAS */}
              <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">

                <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-sm font-bold text-indigo-600">
                      2
                    </span>

                    <div>
                      <h3 className="font-semibold text-gray-900">
                        Desglose de Subtareas Logísticas
                      </h3>

                      <p className="text-xs text-gray-500">
                        Gestión por plazos y horas estimadas
                      </p>
                    </div>
                  </div>

                  <span className="rounded-lg bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                    {subtasks.length} tareas • {totalHours} h
                  </span>
                </div>

                {/* LISTA DE SUBTAREAS */}
                <div className="mb-4 space-y-2">

                  {subtasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {task.name}
                        </p>

                        <p className="text-xs text-gray-500">
                          {task.date || "Sin fecha"}{" "}
                          {task.provider && `• ${task.provider}`}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="rounded bg-indigo-100 px-2 py-1 text-xs font-bold text-indigo-700">
                          {task.hours} h
                        </span>

                        <button
                          type="button"
                          onClick={() => handleDeleteSubtask(task.id)}
                          className="text-gray-400 hover:text-red-600"
                        >
                          <span className="material-symbols-outlined">
                            delete
                          </span>
                        </button>
                      </div>
                    </div>
                  ))}

                </div>

                {/* FORMULARIO SUBTAREA */}
                <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4">

                  <div className="mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-indigo-600">
                      add_circle
                    </span>

                    <h4 className="text-sm font-semibold text-gray-900">
                      + Agregar Nueva Subtarea Logística
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-12">

                    <div className="md:col-span-5">
                      <label className="mb-1 block text-xs font-medium text-gray-700">
                        Nombre de la gestión *
                      </label>

                      <input
                        type="text"
                        value={taskName}
                        onChange={(e) => setTaskName(e.target.value)}
                        placeholder="ej. Contratación sonido y luces"
                        className="h-9 w-full rounded-lg border border-gray-300 bg-white px-3 text-xs outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="md:col-span-3">
                      <label className="mb-1 block text-xs font-medium text-gray-700">
                        Plazo / Fecha objetivo *
                      </label>

                      <input
                        type="date"
                        value={taskDate}
                        onChange={(e) => setTaskDate(e.target.value)}
                        className="h-9 w-full rounded-lg border border-gray-300 bg-white px-3 text-xs outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="mb-1 block text-xs font-medium text-gray-700">
                        Horas est. *
                      </label>

                      <input
                        type="number"
                        min="0.5"
                        step="0.5"
                        value={taskHours}
                        onChange={(e) => setTaskHours(e.target.value)}
                        placeholder="2.0"
                        className="h-9 w-full rounded-lg border border-gray-300 bg-white px-3 text-xs outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="mb-1 block text-xs font-medium text-gray-700">
                        Proveedor / Resp.
                      </label>

                      <input
                        type="text"
                        value={taskProvider}
                        onChange={(e) => setTaskProvider(e.target.value)}
                        placeholder="ej. SoundPro"
                        className="h-9 w-full rounded-lg border border-gray-300 bg-white px-3 text-xs outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end border-t border-indigo-100 pt-3">
                    <button
                      type="button"
                      onClick={handleAddSubtask}
                      className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                    >
                      + Añadir subtarea al plan
                    </button>
                  </div>
                </div>
              </section>
            </div>

            {/* COLUMNA DERECHA */}
            <div className="flex flex-col gap-4 lg:col-span-4">

              {/* CAPACIDAD */}
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">

                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900">
                    Capacidad del Planner
                  </h4>

                  <span className="material-symbols-outlined text-green-700">
                    health_and_safety
                  </span>
                </div>

                <div className="rounded-xl bg-indigo-50 p-4">
                  <p className="text-xs uppercase text-gray-500">
                    Distribución Óptima
                  </p>

                  <p className="text-xl font-bold text-gray-900">
                    {totalHours.toFixed(1)} h / sem
                  </p>

                  <p className="mt-1 text-xs font-medium text-green-700">
                    ✓ Riesgo: Nulo
                  </p>
                </div>

                <div className="mt-4">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Límite semanal recomendado</span>
                    <span>35.0 h</span>
                  </div>

                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-green-700"
                      style={{
                        width: `${Math.min(
                          (totalHours / 35) * 100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* ZONA DE RIESGO */}
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">

                <div className="flex items-center gap-2 text-red-600">
                  <span className="material-symbols-outlined">
                    warning
                  </span>

                  <h4 className="text-xs font-bold uppercase tracking-wider">
                    Zona de Riesgo
                  </h4>
                </div>

                <p className="mt-2 text-xs text-gray-600">
                  Eliminar el evento suprimirá sus subtareas asociadas
                  y liberará la carga calculada.
                </p>

                <button
                  type="button"
                  className="mt-3 w-full rounded-lg bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                  onClick={onClose}
                >
                  Volver
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="flex flex-col justify-between gap-3 border-t border-gray-200 bg-white px-6 py-3 sm:flex-row sm:items-center">

          <p className="text-xs text-gray-500">
            Los cambios se guardan localmente en tu sesión de la pestaña Eventos.
          </p>

          <div className="flex justify-end gap-2">

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-gray-100 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-200"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleSaveDraft}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              Guardar como borrador
            </button>

            <button
              type="button"
              onClick={handlePublish}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-indigo-700"
            >
              🚀 Guardar y Publicar Evento
            </button>

          </div>
        </div>
      </div>
    </div>
  );
}