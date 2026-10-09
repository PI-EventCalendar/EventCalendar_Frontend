"use client";

import { useEffect, useState } from "react";

import {
  CreateEventConflictModal,
  extractDailyOverloadConflict,
  type CreateEventConflict,
  type CreateEventConflictAction,
  type CreateEventConflictPayload,
} from "@/components/ui/CreateEventConflictModal";
import apiClient from "@/lib/axios";
import { useAutoDismissMessage } from "@/lib/useAutoDismissMessage";

// Endpoint con las horas ya programadas del usuario en una fecha.
const DAILY_LOAD_ENDPOINT = "/dashboard/daily-load/";

/*
 * ============================================================================
 * TIPOS
 * ============================================================================
 */

/**
 * Información del evento que enviamos
 * desde el modal hacia la página "Mis Eventos".
 */
export interface CreatedEvent {
  title: string;
  activity_type: string;
  description: string;
  event_date: string;
  location: string;

  /**
   * Lista de subtareas que se crearán
   * junto con el evento.
   */
  tasks: {
    id?: number;
    title: string;
    scheduled_date: string;
    estimated_hours: number;
    status: string;
    notes?: string;
  }[];

  /**
   * Resumen para la interfaz.
   */
  total_tasks: number;
  completed_tasks: number;
}

/**
 * Evento que llega desde Django cuando estamos editando.
 */
interface EventToEdit {
  id: number;
  title: string;
  activity_type: string;
  description: string;
  location?: string;
  event_date: string;
  tasks: {
    id: number;
    title: string;
    scheduled_date: string;
    estimated_hours: string | number;
    status: string;
    notes?: string;
  }[];
}

/**
 * Props que recibe el modal desde actividad/page.tsx
 */
interface CreateEventModalProps {
  // Indica si el modal está visible.
  isOpen: boolean;

  // Cierra el modal.
  onClose: () => void;

  /*
   * Guarda el evento.
   *
   * - Si lanza una excepción: el modal muestra el error (o abre el modal
   *   de conflicto si es un DailyOverloadConflict) y sigue abierto.
   * - Si retorna false: el modal sigue abierto (la página ya avisó).
   * - Si retorna true o no retorna nada: el modal se cierra.
   */
  onSave: (event: CreatedEvent) => Promise<boolean | void>;

  // Evento cargado desde Django cuando estamos editando.
  eventToEdit?: EventToEdit | null;
}

/**
 * Estructura de una subtarea logística
 */
interface Subtask {
  id: number;
  name: string;
  date: string;
  hours: number;
  provider: string;
  status?: string;
  notes?: string;
}

/**
 * Busca la subtarea que produjo el conflicto de carga.
 *
 * Prioridad:
 *  1. La última subtarea NUEVA (id negativo) de esa fecha.
 *  2. Si no hay, la última subtarea de esa fecha (caso edición).
 *
 * Retorna -1 si no encuentra ninguna.
 */
function findConflictTaskIndex(tasks: Subtask[], date: string): number {
  for (let i = tasks.length - 1; i >= 0; i--) {
    if (tasks[i].id < 0 && tasks[i].date === date) {
      return i;
    }
  }

  for (let i = tasks.length - 1; i >= 0; i--) {
    if (tasks[i].date === date) {
      return i;
    }
  }

  return -1;
}

/**
 * Convierte el error del backend en un mensaje legible.
 */
function getSaveErrorMessage(error: unknown): string {
  const err = error as {
    message?: string;
    response?: { data?: unknown };
  } | null;

  const data = err?.response?.data;

  if (data) {
    const record =
      typeof data === "object" ? (data as Record<string, unknown>) : null;

    const msg =
      record?.tasks ||
      record?.event_date ||
      record?.detail ||
      (typeof data === "string" ? data : JSON.stringify(data));

    const first = Array.isArray(msg) ? msg[0] : msg;

    return typeof first === "object" ? JSON.stringify(first) : String(first);
  }

  return (
    err?.message ||
    "No se pudo guardar el evento. Revisa los datos e inténtalo nuevamente."
  );
}

/**
 * Valores iniciales del formulario a partir del evento que se edita.
 *
 * Se calculan al MONTAR el componente (useState con función inicial),
 * en lugar de copiarlos con un useEffect.
 */
function getInitialClient(eventToEdit?: EventToEdit | null): string {
  /*
   * El backend no tiene un campo independiente para cliente,
   * por eso se recupera desde "Cliente: Nombre del cliente".
   */
  const description = eventToEdit?.description || "";

  return description.startsWith("Cliente: ")
    ? description.replace("Cliente: ", "")
    : "";
}

function getInitialSubtasks(eventToEdit?: EventToEdit | null): Subtask[] {
  /*
   * Conservamos el ID real que viene de Django para que el backend
   * sepa qué subtarea existente estamos modificando.
   */
  return (eventToEdit?.tasks || []).map((task) => ({
    id: task.id,
    name: task.title,
    date: task.scheduled_date,
    hours: Number(task.estimated_hours),
    provider: "",
    status: task.status,
    notes: task.notes,
  }));
}

/*
 * ============================================================================
 * COMPONENTE PRINCIPAL
 * ============================================================================
 *
 * Este componente solo decide si el modal se muestra.
 *
 * El contenido real vive en CreateEventModalContent, y se monta con una
 * `key` distinta para "crear" y para cada evento que se edita:
 *
 *  - Al cerrar el modal, el contenido se desmonta y TODO su estado se pierde.
 *  - Al abrirlo de nuevo, el estado nace limpio (crear) o con los datos
 *    del evento (editar).
 *
 * Así no hace falta ningún useEffect que limpie o cargue el formulario.
 */

export default function CreateEventModal(props: CreateEventModalProps) {
  if (!props.isOpen) {
    return null;
  }

  return (
    <CreateEventModalContent
      key={props.eventToEdit ? `edit-${props.eventToEdit.id}` : "new"}
      {...props}
    />
  );
}

function CreateEventModalContent({
  onClose,
  onSave,
  eventToEdit,
}: CreateEventModalProps) {
  /*
   * ==========================================================================
   * ESTADOS DEL EVENTO
   * ==========================================================================
   */

  // Nombre principal del evento
  const [eventName, setEventName] = useState(eventToEdit?.title ?? "");

  // Tipo de evento
  const [eventType, setEventType] = useState(
    eventToEdit?.activity_type || "Conferencia Corporativa",
  );

  // Cliente o persona de contacto
  const [client, setClient] = useState(() => getInitialClient(eventToEdit));

  // Fecha y hora del evento
  // Django devuelve "2026-10-08" y datetime-local necesita "2026-10-08T00:00".
  const [eventDate, setEventDate] = useState(
    eventToEdit?.event_date ? `${eventToEdit.event_date}T00:00` : "",
  );

  // Lugar del evento
  const [location, setLocation] = useState(eventToEdit?.location ?? "");

  // Límite de horas diarias del usuario (viene de su perfil).
  const [dailyLimit, setDailyLimit] = useState(6);

  // Horas ya programadas por día, sumando TODOS los eventos del usuario.
  const [globalDailyLoads, setGlobalDailyLoads] = useState<
    Record<string, number>
  >({});

  /*
   * Carga el límite diario del perfil al abrir el modal.
   *
   * El contenido solo se monta cuando el modal está abierto,
   * por eso basta con ejecutarlo una vez al montar.
   */
  useEffect(() => {
    void apiClient
      .get("/auth/profile/")
      .then(({ data }) => setDailyLimit(Number(data.daily_hour_limit ?? 6)))
      .catch(() => setDailyLimit(6));
  }, []);

  // Error al guardar o publicar: desaparece solo a los 3 s
  // (o antes, con la X del aviso).
  const {
    message: saveError,
    show: showSaveError,
    clear: clearSaveError,
  } = useAutoDismissMessage(3000);

  /*
   * Conflicto de carga diaria enviado por Django (HTTP 409).
   * Mientras no sea null se muestra CreateEventConflictModal
   * encima de este modal.
   */
  const [conflict, setConflict] = useState<CreateEventConflict | null>(null);

  /*
   * true cuando el usuario ya aplicó una corrección y, al guardar
   * de nuevo, Django volvió a responder con un conflicto.
   * Sirve para mostrar "El día continúa sobrecargado".
   */
  const [conflictResolved, setConflictResolved] = useState(false);

  /*
   * ==========================================================================
   * ESTADOS DE LA SUBTAREA QUE SE ESTÁ CREANDO
   * ==========================================================================
   */

  // Nombre de la nueva subtarea
  const [taskName, setTaskName] = useState("");

  // Fecha límite de la subtarea
  const [taskDate, setTaskDate] = useState("");

  // Horas estimadas de la subtarea
  const [taskHours, setTaskHours] = useState("");

  // Proveedor o responsable
  const [taskProvider, setTaskProvider] = useState("");

  /*
   * ==========================================================================
   * LISTA DE SUBTAREAS
   * ==========================================================================
   */

  /**
   * Aquí almacenamos todas las subtareas que el usuario
   * vaya agregando al plan logístico.
   */
  const [subtasks, setSubtasks] = useState<Subtask[]>(() =>
    getInitialSubtasks(eventToEdit),
  );

  /*
   * ==========================================================================
   * ERRORES DEL FORMULARIO PRINCIPAL
   * ==========================================================================
   */
  const [errors, setErrors] = useState<{
    eventName?: string;
    eventType?: string;
    eventDate?: string;
  }>({});

  /*
   * ==========================================================================
   * ERRORES DE SUBTAREA
   * ==========================================================================
   */
  const [taskErrors, setTaskErrors] = useState<{
    taskName?: string;
    taskDate?: string;
    taskHours?: string;
  }>({});

  /*
   * ==========================================================================
   * CARGA GLOBAL POR DÍA
   * ==========================================================================
   *
   * Fechas del plan (las de las subtareas actuales y las del evento original).
   * Para cada una consultamos cuántas horas tiene ya programadas el usuario.
   */
  const planningDatesKey = Array.from(
    new Set(
      [
        ...subtasks.map((task) => task.date),
        ...(eventToEdit?.tasks ?? []).map((task) => task.scheduled_date),
      ].filter(Boolean),
    ),
  ).join("|");

  useEffect(() => {
    const dates = planningDatesKey ? planningDatesKey.split("|") : [];

    if (dates.length === 0) {
      return;
    }

    /*
     * allSettled: si falla la consulta de una fecha (por ejemplo un 404),
     * las demás fechas siguen funcionando y la que falló cuenta como 0 h.
     */
    void Promise.allSettled(
      dates.map(async (date) => {
        const { data } = await apiClient.get(DAILY_LOAD_ENDPOINT, {
          params: { date },
        });

        return [date, Number(data.total_hours_scheduled ?? 0)] as const;
      }),
    ).then((results) => {
      const entries = results.flatMap((result) =>
        result.status === "fulfilled" ? [result.value] : [],
      );

      setGlobalDailyLoads(Object.fromEntries(entries));
    });
  }, [planningDatesKey]);

  /*
   * ==========================================================================
   * VALIDACIÓN DEL EVENTO PRINCIPAL
   * ==========================================================================
   */

  /**
   * Retorna true si el formulario es válido, false si no.
   */
  const validateForm = () => {
    const newErrors: {
      eventName?: string;
      eventType?: string;
      eventDate?: string;
    } = {};

    // Validar nombre
    if (!eventName.trim()) {
      newErrors.eventName = "El nombre del evento es obligatorio.";
    }

    // Validar tipo
    if (!eventType.trim()) {
      newErrors.eventType = "Debes seleccionar un tipo de evento.";
    }

    // Validar fecha
    if (!eventDate) {
      newErrors.eventDate = "La fecha y hora del evento es obligatoria.";
    } else {
      const targetEventDate = eventDate.split("T")[0];
      const invalidSubtask = subtasks.find(
        (task) => task.date > targetEventDate,
      );
      if (invalidSubtask) {
        newErrors.eventDate = `La fecha del evento (${targetEventDate}) no puede ser anterior a la subtarea "${invalidSubtask.name}" (${invalidSubtask.date}).`;
      }
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  /*
   * ==========================================================================
   * VALIDACIÓN DE SUBTAREA
   * ==========================================================================
   */

  const validateSubtask = () => {
    const newErrors: {
      taskName?: string;
      taskDate?: string;
      taskHours?: string;
    } = {};

    const targetEventDate = eventDate ? eventDate.split("T")[0] : "";

    // Validar nombre de la gestión
    if (!taskName.trim()) {
      newErrors.taskName = "El nombre de la gestión es obligatorio.";
    }

    // Validar fecha
    if (!taskDate) {
      newErrors.taskDate = "La fecha objetivo es obligatoria.";
    } else if (!targetEventDate) {
      newErrors.taskDate =
        "Primero debes seleccionar la fecha del evento en los datos principales.";
    } else if (taskDate > targetEventDate) {
      newErrors.taskDate = `La fecha de la tarea (${taskDate}) no puede ser posterior a la fecha del evento (${targetEventDate}).`;
    }

    // Validar horas
    if (!taskHours) {
      newErrors.taskHours = "Las horas estimadas son obligatorias.";
    } else if (Number(taskHours) <= 0) {
      newErrors.taskHours = "Las horas deben ser mayores a 0.";
    }

    setTaskErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  /*
   * ==========================================================================
   * AGREGAR SUBTAREA
   * ==========================================================================
   */

  const handleAddSubtask = () => {
    clearSaveError();

    const isValid = validateSubtask();

    if (!isValid) {
      return;
    }

    const newSubtask: Subtask = {
      // Los IDs negativos son solo locales; nunca se envían al backend.
      id: -Date.now(),
      name: taskName.trim(),
      date: taskDate,
      hours: Number(taskHours),
      provider: taskProvider.trim(),
    };

    setSubtasks((current) => [...current, newSubtask]);

    // Limpiamos los campos del formulario de subtarea.
    setTaskName("");
    setTaskDate("");
    setTaskHours("");
    setTaskProvider("");

    setTaskErrors({});
  };

  /*
   * ==========================================================================
   * ELIMINAR SUBTAREA
   * ==========================================================================
   */

  const handleDeleteSubtask = (id: number) => {
    clearSaveError();
    setSubtasks((current) => current.filter((task) => task.id !== id));
  };

  /*
   * ==========================================================================
   * CALCULAR HORAS TOTALES
   * ==========================================================================
   */

  const totalHours = subtasks.reduce((total, task) => total + task.hours, 0);

  /*
   * ==========================================================================
   * CAPACIDAD DIARIA Y RIESGO
   * ==========================================================================
   */

  // Horas del plan actual por día (solo subtareas pendientes / en progreso).
  const dailyTotals = subtasks.reduce<Record<string, number>>(
    (totals, task) => {
      if (task.status && !["pending", "in_progress"].includes(task.status)) {
        return totals;
      }

      totals[task.date] = (totals[task.date] ?? 0) + task.hours;

      return totals;
    },
    {},
  );

  // Horas que el evento ya tenía guardadas en Django (solo al editar).
  const originalTotals = (eventToEdit?.tasks ?? []).reduce<
    Record<string, number>
  >((totals, task) => {
    if (["pending", "in_progress"].includes(task.status)) {
      totals[task.scheduled_date] =
        (totals[task.scheduled_date] ?? 0) + Number(task.estimated_hours);
    }

    return totals;
  }, {});

  // Carga global propuesta = carga global - lo original del evento + lo nuevo.
  const globalProposedTotals = Array.from(
    new Set([
      ...Object.keys(globalDailyLoads),
      ...Object.keys(dailyTotals),
      ...Object.keys(originalTotals),
    ]),
  ).map(
    (date) =>
      [
        date,
        (globalDailyLoads[date] ?? 0) -
          (originalTotals[date] ?? 0) +
          (dailyTotals[date] ?? 0),
      ] as const,
  );

  const busiestDay = globalProposedTotals.sort((a, b) => b[1] - a[1])[0];
  const busiestHours = busiestDay?.[1] ?? 0;
  const capacityRatio = dailyLimit > 0 ? busiestHours / dailyLimit : 0;

  const riskLabel =
    capacityRatio >= 1 ? "Alto" : capacityRatio > 0.5 ? "Moderado" : "Nulo";

  const riskClass =
    capacityRatio >= 1
      ? "text-red-700"
      : capacityRatio > 0.5
        ? "text-amber-700"
        : "text-green-700";

  /*
   * ==========================================================================
   * RESOLVER CONFLICTO DE CARGA DIARIA
   * ==========================================================================
   */

  // Subtarea que produjo el conflicto (para mostrarla en el modal).
  const conflictTaskIndex = conflict
    ? findConflictTaskIndex(subtasks, conflict.target_date)
    : -1;

  const conflictTask =
    conflictTaskIndex >= 0 ? subtasks[conflictTaskIndex] : undefined;

  /**
   * Se ejecuta cuando el usuario confirma la nueva fecha y las horas
   * en CreateEventConflictModal.
   *
   * Actualiza la subtarea que produjo el conflicto. Después el usuario
   * vuelve a presionar "Guardar y Publicar Evento" y el backend
   * valida otra vez.
   */
  const handleResolveConflict = (
    action: CreateEventConflictAction,
    payload: CreateEventConflictPayload,
  ) => {
    if (!conflict) {
      return;
    }

    const targetDate = conflict.target_date;

    setSubtasks((currentSubtasks) => {
      const index = findConflictTaskIndex(currentSubtasks, targetDate);

      if (index === -1) {
        return currentSubtasks;
      }

      const updatedSubtasks = [...currentSubtasks];

      // MOVE_DATE: cambia la fecha. REDUCE_HOURS: cambia las horas.
      if (action === "MOVE_DATE" && payload.newDate) {
        updatedSubtasks[index] = {
          ...updatedSubtasks[index],
          date: payload.newDate,
        };
      }

      if (action === "REDUCE_HOURS" && payload.newHours) {
        updatedSubtasks[index] = {
          ...updatedSubtasks[index],
          hours: payload.newHours,
        };
      }

      console.log("Subtarea modificada por conflicto:", updatedSubtasks[index]);

      return updatedSubtasks;
    });

    setConflictResolved(true);
    setConflict(null);
    clearSaveError();
  };

  /*
   * ==========================================================================
   * GUARDAR COMO BORRADOR
   * ==========================================================================
   */

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

  /*
   * ==========================================================================
   * GUARDAR Y PUBLICAR EVENTO
   * ==========================================================================
   *
   * 1. Valida el formulario.
   * 2. Construye el objeto que necesita Django.
   * 3. Envía el evento a actividad/page.tsx (UNA sola vez).
   * 4. Espera el resultado.
   * 5. Cierra el modal solo si onSave no falla ni devuelve false.
   *
   * Si hay un conflicto de carga diaria (409), se abre
   * CreateEventConflictModal y este modal permanece abierto.
   */
  const handlePublish = async () => {
    // Limpiamos el mensaje anterior.
    clearSaveError();

    // 1. Validar formulario principal
    const isValid = validateForm();

    if (!isValid) {
      return;
    }

    // 2. Validar fechas de las subtareas
    const targetEventDate = eventDate.split("T")[0];

    const invalidSubtask = subtasks.find((task) => task.date > targetEventDate);

    if (invalidSubtask) {
      showSaveError(
        `No se puede guardar el evento: la subtarea "${invalidSubtask.name}" (${invalidSubtask.date}) supera la fecha del evento (${targetEventDate}). Modifícala o elimínala para continuar.`,
      );

      return;
    }

    // 3. Construir payload
    const newEvent: CreatedEvent = {
      title: eventName.trim(),

      activity_type: eventType.trim(),

      // El backend no tiene campo de cliente: lo guardamos en description.
      description: client.trim()
        ? `Cliente: ${client.trim()}`
        : "Evento pendiente de planificación logística.",

      location: location.trim(),

      // Django espera solamente YYYY-MM-DD
      event_date: targetEventDate,

      tasks: subtasks.map((task) => ({
        /*
         * Las subtareas existentes tienen ID positivo.
         * Las nuevas tienen ID negativo y NO se envía al backend.
         */
        ...(task.id > 0 ? { id: task.id } : {}),

        title: task.name,
        scheduled_date: task.date,
        estimated_hours: task.hours,

        // Si ya tenía estado lo conservamos; si es nueva, empieza pending.
        status: task.status ?? "pending",

        notes: task.notes,
      })),

      total_tasks: subtasks.length,

      completed_tasks: 0,
    };

    // 4. Debug
    console.log("SUBTAREAS DEL MODAL ANTES DE GUARDAR:", subtasks);
    console.log("PAYLOAD COMPLETO DEL EVENTO:", newEvent);

    // 5. Guardar (actividad/page.tsx hace el POST/PATCH)
    try {
      const result = await onSave(newEvent);

      /*
       * false -> la página ya avisó del problema: el modal sigue abierto.
       * true / undefined -> todo salió bien: cerramos el modal.
       */
      if (result !== false) {
        onClose();
      }
    } catch (error) {
      console.warn("Error al guardar el evento:", error);

      /*
       * Si Django respondió con DailyOverloadConflict (409),
       * abrimos CreateEventConflictModal y el modal principal
       * permanece abierto.
       */
      const conflictData = extractDailyOverloadConflict(error);

      if (conflictData) {
        setConflict(conflictData);
        return;
      }

      // Cualquier otro error: mensaje legible del backend.
      showSaveError(getSaveErrorMessage(error));
    }
  };

  /*
   * ==========================================================================
   * RENDER DEL MODAL
   * ==========================================================================
   */

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        // Click fuera del modal: se cierra.
        onClick={onClose}
      >
        <div
          className="relative w-full max-w-6xl max-h-[96vh] overflow-hidden rounded-2xl bg-white shadow-2xl"
          // Evita que un click dentro del modal lo cierre.
          onClick={(event) => event.stopPropagation()}
        >
          {/* ================================================================
              HEADER
          ================================================================= */}

          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <div className="flex items-center gap-3">
              {/* Icono */}
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                <span className="material-symbols-outlined">
                  event_available
                </span>
              </div>

              {/* Título */}
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
                  Define los datos clave del evento y desglosa el plan operativo
                  en subtareas con horas y plazos.
                </p>
              </div>
            </div>

            {/* Botón cerrar */}
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          {/* ================================================================
              BODY
          ================================================================= */}

          <div className="max-h-[calc(96vh-150px)] overflow-y-auto bg-gray-50/50 p-5">
            {/* Alerta de error al guardar o publicar */}
            {saveError && (
              <div
                role="alert"
                className="mb-4 flex items-start gap-3 rounded-xl border border-red-300 bg-red-50 p-4 text-xs text-red-800 shadow-sm"
              >
                <span className="material-symbols-outlined text-base text-red-600">
                  error
                </span>

                <div className="flex-1">
                  <p className="font-semibold text-red-900">
                    No se pudo guardar el evento
                  </p>
                  <p className="mt-0.5 leading-relaxed">{saveError}</p>
                </div>

                {/* Cerrar el aviso */}
                <button
                  type="button"
                  onClick={() => clearSaveError()}
                  aria-label="Cerrar aviso"
                  title="Cerrar"
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-red-600 transition hover:bg-red-100"
                >
                  <span className="material-symbols-outlined text-base">
                    close
                  </span>
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              {/* ============================================================
                  COLUMNA IZQUIERDA
              ============================================================= */}

              <div className="flex flex-col gap-4 lg:col-span-8">
                {/* ==========================================================
                    INFORMACIÓN GENERAL DEL EVENTO
                =========================================================== */}

                <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  {/* Encabezado de sección */}
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

                  {/* Campos del evento */}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {/* NOMBRE DEL EVENTO */}
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-700">
                        Nombre del Evento *
                      </label>

                      <input
                        type="text"
                        value={eventName}
                        onChange={(e) => {
                          setEventName(e.target.value);

                          setErrors((current) => ({
                            ...current,
                            eventName: undefined,
                          }));
                        }}
                        placeholder="ej. Cumbre de Innovación & Sostenibilidad 2025"
                        className={`h-10 w-full rounded-lg border px-3 text-sm outline-none transition focus:bg-white focus:ring-2 ${
                          errors.eventName
                            ? "border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-200"
                            : "border-gray-300 bg-gray-50 focus:border-indigo-500 focus:ring-indigo-200"
                        }`}
                      />

                      {errors.eventName && (
                        <p className="mt-1 text-xs text-red-600">
                          {errors.eventName}
                        </p>
                      )}
                    </div>

                    {/* TIPO DE EVENTO */}
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-700">
                        Tipo de Evento *
                      </label>

                      <select
                        value={eventType}
                        onChange={(e) => {
                          setEventType(e.target.value);

                          setErrors((current) => ({
                            ...current,
                            eventType: undefined,
                          }));
                        }}
                        className={`h-10 w-full rounded-lg border px-3 text-sm outline-none focus:bg-white ${
                          errors.eventType
                            ? "border-red-400 bg-red-50 focus:border-red-500"
                            : "border-gray-300 bg-gray-50 focus:border-indigo-500"
                        }`}
                      >
                        <option value="Conferencia Corporativa">
                          Conferencia Corporativa
                        </option>

                        <option value="Boda / Social">Boda / Social</option>

                        <option value="Lanzamiento de Producto">
                          Lanzamiento de Producto
                        </option>

                        <option value="Gala Institucional">
                          Gala Institucional
                        </option>

                        <option value="Congreso / Simposio">
                          Congreso / Simposio
                        </option>

                        <option value="Festival Cultural">
                          Festival Cultural
                        </option>
                      </select>

                      {errors.eventType && (
                        <p className="mt-1 text-xs text-red-600">
                          {errors.eventType}
                        </p>
                      )}
                    </div>

                    {/* CLIENTE / CONTACTO */}
                    <div className="md:col-span-2">
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

                    {/* FECHA Y HORA */}
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-700">
                        Fecha y Hora del Evento *
                      </label>

                      <input
                        type="datetime-local"
                        value={eventDate}
                        onChange={(e) => {
                          setEventDate(e.target.value);

                          setErrors((current) => ({
                            ...current,
                            eventDate: undefined,
                          }));
                        }}
                        className={`h-10 w-full rounded-lg border px-3 text-sm outline-none focus:bg-white ${
                          errors.eventDate
                            ? "border-red-400 bg-red-50 focus:border-red-500"
                            : "border-gray-300 bg-gray-50 focus:border-indigo-500"
                        }`}
                      />

                      {errors.eventDate && (
                        <p className="mt-1 text-xs text-red-600">
                          {errors.eventDate}
                        </p>
                      )}
                    </div>

                    {/* LUGAR */}
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-700">
                        Lugar
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

                {/* ==========================================================
                    SUBTAREAS LOGÍSTICAS
                =========================================================== */}

                <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  {/* Encabezado */}
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

                    {/* Resumen de subtareas */}
                    <span className="rounded-lg bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                      {subtasks.length} tareas • {totalHours} h
                    </span>
                  </div>

                  {/* LISTA DE SUBTAREAS YA AGREGADAS */}
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

                          {eventDate && task.date > eventDate.split("T")[0] && (
                            <span className="mt-1 inline-flex items-center gap-1 rounded bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                              ⚠️ Fecha posterior al evento (
                              {eventDate.split("T")[0]})
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          {/* Horas */}
                          <span className="rounded bg-indigo-100 px-2 py-1 text-xs font-bold text-indigo-700">
                            {task.hours} h
                          </span>

                          {/* Eliminar */}
                          <button
                            type="button"
                            onClick={() => handleDeleteSubtask(task.id)}
                            className="text-gray-400 hover:text-red-600"
                            title="Eliminar subtarea"
                          >
                            <span className="material-symbols-outlined">
                              delete
                            </span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* FORMULARIO PARA NUEVA SUBTAREA */}
                  <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4">
                    {/* Título */}
                    <div className="mb-4 flex items-center gap-2">
                      <span className="material-symbols-outlined text-indigo-600">
                        add_circle
                      </span>

                      <h4 className="text-sm font-semibold text-gray-900">
                        Agregar Nueva Subtarea Logística
                      </h4>
                    </div>

                    {/* Campos */}
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
                      {/* NOMBRE DE LA GESTIÓN */}
                      <div className="md:col-span-5">
                        <label className="mb-1 block text-xs font-medium text-gray-700">
                          Nombre de la gestión *
                        </label>

                        <input
                          type="text"
                          value={taskName}
                          onChange={(e) => {
                            setTaskName(e.target.value);

                            setTaskErrors((current) => ({
                              ...current,
                              taskName: undefined,
                            }));
                          }}
                          placeholder="ej. Contratación sonido y luces"
                          className={`h-9 w-full rounded-lg border px-3 text-xs outline-none ${
                            taskErrors.taskName
                              ? "border-red-400 bg-red-50"
                              : "border-gray-300 bg-white focus:border-indigo-500"
                          }`}
                        />

                        {taskErrors.taskName && (
                          <p className="mt-1 text-xs text-red-600">
                            {taskErrors.taskName}
                          </p>
                        )}
                      </div>

                      {/* FECHA DE LA SUBTAREA */}
                      <div className="md:col-span-3">
                        <label className="mb-1 block text-xs font-medium text-gray-700">
                          Plazo / Fecha objetivo *
                        </label>

                        <input
                          type="date"
                          max={eventDate ? eventDate.split("T")[0] : undefined}
                          value={taskDate}
                          onChange={(e) => {
                            setTaskDate(e.target.value);

                            setTaskErrors((current) => ({
                              ...current,
                              taskDate: undefined,
                            }));
                          }}
                          className={`h-9 w-full rounded-lg border px-3 text-xs outline-none ${
                            taskErrors.taskDate
                              ? "border-red-400 bg-red-50"
                              : "border-gray-300 bg-white focus:border-indigo-500"
                          }`}
                        />

                        {taskErrors.taskDate && (
                          <p className="mt-1 text-xs text-red-600">
                            {taskErrors.taskDate}
                          </p>
                        )}
                      </div>

                      {/* HORAS ESTIMADAS */}
                      <div className="md:col-span-2">
                        <label className="mb-1 block text-xs font-medium text-gray-700">
                          Horas est. *
                        </label>

                        <input
                          type="number"
                          min="0.5"
                          step="0.5"
                          value={taskHours}
                          onChange={(e) => {
                            setTaskHours(e.target.value);

                            setTaskErrors((current) => ({
                              ...current,
                              taskHours: undefined,
                            }));
                          }}
                          placeholder="2.0"
                          className={`h-9 w-full rounded-lg border px-3 text-xs outline-none ${
                            taskErrors.taskHours
                              ? "border-red-400 bg-red-50"
                              : "border-gray-300 bg-white focus:border-indigo-500"
                          }`}
                        />

                        {taskErrors.taskHours && (
                          <p className="mt-1 text-xs text-red-600">
                            {taskErrors.taskHours}
                          </p>
                        )}
                      </div>

                      {/* PROVEEDOR / RESPONSABLE */}
                      <div className="md:col-span-12">
                        <label className="mb-1 block text-xs font-medium text-gray-700">
                          Proveedor / Responsable
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

                    {/* Botón agregar subtarea */}
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

              {/* ============================================================
                  COLUMNA DERECHA
              ============================================================= */}

              <div className="flex flex-col gap-4 lg:col-span-4">
                {/* CAPACIDAD DEL PLANNER */}
                <div className="sticky top-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900">
                      Capacidad del Planner
                    </h4>

                    <span className="material-symbols-outlined text-green-700">
                      health_and_safety
                    </span>
                  </div>

                  {/* Límite diario y riesgo */}
                  <div className="rounded-xl bg-indigo-50 p-4">
                    <p className="text-xs uppercase text-gray-500">
                      Límite de capacidad diaria
                    </p>

                    <p className="text-xl font-bold text-gray-900">
                      {dailyLimit.toFixed(1)} h / día
                    </p>

                    <p className="mt-1 text-xs font-medium text-green-700">
                      Riesgo: <span className={riskClass}>{riskLabel}</span>
                    </p>
                  </div>

                  {/* Barra de capacidad del día más cargado */}
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>
                        Día más cargado{busiestDay ? ` (${busiestDay[0]})` : ""}
                      </span>

                      <span>
                        {busiestHours.toFixed(1)} / {dailyLimit.toFixed(1)} h
                      </span>
                    </div>

                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-green-700"
                        style={{
                          width: `${Math.min(capacityRatio * 100, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* ZONA DE RIESGO */}
                <div className="sticky top-[240px] rounded-xl border border-red-200 bg-red-50 p-4">
                  <div className="flex items-center gap-2 text-red-600">
                    <span className="material-symbols-outlined">warning</span>

                    <h4 className="text-xs font-bold uppercase tracking-wider">
                      Zona de Riesgo
                    </h4>
                  </div>

                  <p className="mt-2 text-xs text-gray-600">
                    Eliminar el evento suprimirá sus subtareas asociadas y
                    liberará la carga calculada.
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

          {/* ================================================================
              FOOTER
          ================================================================= */}

          <div className="flex flex-col justify-between gap-3 border-t border-gray-200 bg-white px-6 py-3 sm:flex-row sm:items-center">
            {/* Mensaje informativo */}
            <p className="text-xs text-gray-500">
              Los cambios se guardan localmente en tu sesión de la pestaña
              Eventos.
            </p>

            {/* Botones */}
            <div className="flex justify-end gap-2">
              {/* CANCELAR */}
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg bg-gray-100 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-200"
              >
                Cancelar
              </button>

              {/* GUARDAR BORRADOR */}
              <button
                type="button"
                onClick={handleSaveDraft}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                Guardar como borrador
              </button>

              {/* GUARDAR Y PUBLICAR */}
              <button
                type="button"
                onClick={handlePublish}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-indigo-700"
              >
                Guardar y Publicar Evento
              </button>
            </div>
          </div>
        </div>
      </div>

      {/*
        Modal de conflicto de carga diaria.

        Va como HERMANO del modal principal (no dentro) para que sus clicks
        no suban hasta el onClick={onClose} del fondo del modal principal.
      */}
      <CreateEventConflictModal
        conflict={conflict}
        onClose={() => setConflict(null)}
        onResolve={handleResolveConflict}
        stillOverloaded={conflictResolved}
        taskName={conflictTask?.name}
        taskHours={conflictTask?.hours}
        maxDate={eventDate ? eventDate.split("T")[0] : undefined}
      />
    </>
  );
}
