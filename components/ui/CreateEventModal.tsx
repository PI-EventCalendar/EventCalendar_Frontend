"use client";

import { useEffect, useState } from "react";

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

  /**
   * Lista de subtareas que se crearán
   * junto con el evento.
   */
  tasks: {
    title: string;
    scheduled_date: string;
    estimated_hours: number;
    status: string;
  }[];

  /**
   * el resumen en la interfaz.
   */
  total_tasks: number;
  completed_tasks: number;
}
//EDICION (OJO AGREGAR COURSE)
interface EventToEdit {
  id: number;
  title: string;
  activity_type: string;
  description: string;
  event_date: string;
  tasks: {
    title: string;
    scheduled_date: string;
    estimated_hours: string | number;
    status: string;
  }[];
}


/**
 * Props que recibe el modal desde actividad/page.tsx
 */
interface CreateEventModalProps {
  // Indica si el modal está visible
  isOpen: boolean;
  // Función para cerrar el modal
  onClose: () => void;
  // Función que recibe el evento creado
  onSave: (event: CreatedEvent) => Promise<void>;

   // Evento cargado desde Django cuando estamos editando
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
}

/*
 * ============================================================================
 * COMPONENTE PRINCIPAL
 * ============================================================================
 */

export default function CreateEventModal({
  isOpen,
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
  const [eventName, setEventName] = useState("");

  // Tipo de evento
  const [eventType, setEventType] = useState(
    "Conferencia Corporativa"
  );

  // Cliente o persona de contacto
  const [client, setClient] = useState("");

  // Fecha y hora del evento
  const [eventDate, setEventDate] = useState("");

  // Lugar del evento
  const [location, setLocation] = useState("");


  useEffect(() => {

    // Si no estamos editando, no hacemos nada.
    if (!eventToEdit) {
      return;
    }

    console.log("Cargando datos en el modal:", eventToEdit);

    // ============================
    // DATOS DEL EVENTO
    // ============================

    setEventName(eventToEdit.title);

    setEventType(
      eventToEdit.activity_type || "Conferencia Corporativa"
    );

    /*
    * El backend actualmente guarda:
    *
    * "description": "Cliente: juans"
    *
    * Por eso recuperamos el cliente
    * desde ese texto.
    */
    const description = eventToEdit.description || "";

    if (description.startsWith("Cliente: ")) {
      setClient(
        description.replace("Cliente: ", "")
      );
    } else {
      setClient("");
    }

  
    setEventDate(
      eventToEdit.event_date
        ? `${eventToEdit.event_date}T00:00`
        : ""
    );

    /*
    * El backend actual no tiene todavía
    * un campo para location.
    */
    setLocation("");

    // ============================
    // TAREAS
    // ============================

    setSubtasks(
      (eventToEdit.tasks || []).map((task, index) => ({
        /*
        * El NestedTaskCreateSerializer actualmente
        * no devuelve el ID de la tarea.
        *
        * Para el listado visual usamos un ID
        * temporal basado en el índice.
        */
        id: index + 1,

        name: task.title,

        date: task.scheduled_date,

        hours: Number(task.estimated_hours),

        provider: "",
      }))
    );

  }, [eventToEdit]);


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
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);


  /*
   * ==========================================================================
   * ERRORES DEL FORMULARIO PRINCIPAL
   * ==========================================================================
   */

  /**
   * Guardamos los mensajes de error de los campos obligatorios.
   *
   * Ejemplo:
   *
   * {
   *   eventName: "El nombre es obligatorio.",
   *   eventDate: "La fecha es obligatoria."
   * }
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

  /**
   * Estos errores corresponden únicamente al formulario
   * de "Agregar Nueva Subtarea".
   */
  const [taskErrors, setTaskErrors] = useState<{
    taskName?: string;
    taskDate?: string;
    taskHours?: string;
  }>({});


  /*
   * ==========================================================================
   * VALIDACIÓN DEL EVENTO PRINCIPAL
   * ==========================================================================
   */

  /**
   * Verifica que los campos obligatorios del evento
   * estén correctamente diligenciados.
   *
   * Retorna:
   * true  -> formulario válido
   * false -> formulario inválido
   */
  const validateForm = () => {

    const newErrors: {
      eventName?: string;
      eventType?: string;
      eventDate?: string;
    } = {};


    // Validar nombre
    if (!eventName.trim()) {
      newErrors.eventName =
        "El nombre del evento es obligatorio.";
    }


    // Validar tipo
    if (!eventType.trim()) {
      newErrors.eventType =
        "Debes seleccionar un tipo de evento.";
    }


    // Validar fecha
    if (!eventDate) {
      newErrors.eventDate =
        "La fecha y hora del evento es obligatoria.";
    }


    // Guardamos los errores para mostrarlos en pantalla
    setErrors(newErrors);


    // Si no hay errores, el formulario es válido
    return Object.keys(newErrors).length === 0;
  };


  /*
   * ==========================================================================
   * VALIDACIÓN DE SUBTAREA
   * ==========================================================================
   */

  /**
   * Valida los campos obligatorios antes de agregar
   * una nueva subtarea al plan.
   */
  const validateSubtask = () => {

    const newErrors: {
      taskName?: string;
      taskDate?: string;
      taskHours?: string;
    } = {};


    // Validar nombre de la gestión
    if (!taskName.trim()) {
      newErrors.taskName =
        "El nombre de la gestión es obligatorio.";
    }


    // Validar fecha
    if (!taskDate) {
      newErrors.taskDate =
        "La fecha objetivo es obligatoria.";
    }


    // Validar horas
    if (!taskHours) {
      newErrors.taskHours =
        "Las horas estimadas son obligatorias.";
    } else if (Number(taskHours) <= 0) {
      newErrors.taskHours =
        "Las horas deben ser mayores a 0.";
    }


    // Guardar errores
    setTaskErrors(newErrors);


    // Retornar si la subtarea es válida
    return Object.keys(newErrors).length === 0;
  };


  /*
   * ==========================================================================
   * CERRAR MODAL SI NO ESTÁ ABIERTO
   * ==========================================================================
   */

  /**
   * No renderizamos absolutamente nada cuando el modal
   * está cerrado.
   */
  if (!isOpen) {
    return null;
  }


  /*
   * ==========================================================================
   * AGREGAR SUBTAREA
   * ==========================================================================
   */

  const handleAddSubtask = () => {

    // Primero validamos los campos
    const isValid = validateSubtask();

    // Si hay errores, no agregamos la subtarea
    if (!isValid) {
      return;
    }


    // Creamos la nueva subtarea
    const newSubtask: Subtask = {
      id: Date.now(),
      name: taskName.trim(),
      date: taskDate,
      hours: Number(taskHours),
      provider: taskProvider.trim(),
    };


    // Agregamos la nueva subtarea al listado
    setSubtasks((current) => [
      ...current,
      newSubtask,
    ]);


    /*
     * Limpiamos los campos del formulario
     * después de agregar la subtarea.
     */
    setTaskName("");
    setTaskDate("");
    setTaskHours("");
    setTaskProvider("");

    // Limpiamos también los errores
    setTaskErrors({});
  };


  /*
   * ==========================================================================
   * ELIMINAR SUBTAREA
   * ==========================================================================
   */

  /**
   * Elimina una subtarea utilizando su ID.
   */
  const handleDeleteSubtask = (id: number) => {

    setSubtasks((current) =>
      current.filter((task) => task.id !== id)
    );
  };


  /*
   * ==========================================================================
   * CALCULAR HORAS TOTALES
   * ==========================================================================
   */

  /**
   * Suma las horas de todas las subtareas.
   *
   * Ejemplo:
   *
   * Tarea 1 -> 2h
   * Tarea 2 -> 3.5h
   *
   * Total -> 5.5h
   */
  const totalHours = subtasks.reduce(
    (total, task) => total + task.hours,
    0
  );


  /*
   * ==========================================================================
   * GUARDAR COMO BORRADOR
   * ==========================================================================
   */

  /**
   * Actualmente el botón de borrador conserva
   * el comportamiento que ya tenías:
   *
   * mostrar la información en consola.
   *
   * Posteriormente podremos conectarlo con Django.
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
   */

  /**
   * Esta función se ejecuta cuando el usuario
   * presiona "Guardar y Publicar Evento".
   */
  const handlePublish = async () => {

    /*
     * 1. Validamos primero el formulario principal.
     */
    const isValid = validateForm();


    /*
     * 2. Si existe algún error, detenemos el proceso.
     *
     * No se cierra el modal.
     * El usuario puede ver los errores y corregirlos.
     */
    if (!isValid) {
      return;
    }


        /**
     * Creamos el objeto del evento que enviaremos
     * a la página "Mis Eventos".
     *
     * IMPORTANTE:
     * Aquí todavía NO hacemos la petición HTTP.
     * Solamente construimos los datos.
     */
    const newEvent: CreatedEvent = {
      
      // Nombre del evento
      title: eventName.trim(),

      // Tipo seleccionado en el formulario
      activity_type: eventType.trim(),

      // Descripción temporal utilizando el cliente
      description: client.trim()
        ? `Cliente: ${client.trim()}`
        : "Evento pendiente de planificación logística.",

      // datetime-local devuelve:
      // 2026-11-15T09:00
      //
      // El backend actualmente maneja la fecha
      // como YYYY-MM-DD.
      event_date: eventDate.split("T")[0],

      /**
       * Convertimos las subtareas del formulario
       * al formato que maneja el backend.
       */
      tasks: subtasks.map((task) => ({
        title: task.name,
        scheduled_date: task.date,
        estimated_hours: task.hours,
        status: "pending",
      })),

      // Cantidad de tareas creadas
      total_tasks: subtasks.length,

      // Evento recién creado => ninguna completada
      completed_tasks: 0,
    };


    /*
     * 4. Enviamos el nuevo evento a la página
     *    que contiene la lista "Mis Eventos".
     *
     * Esta función viene desde actividad/page.tsx.
     */
    /**
     * Enviamos el evento a la página.
     *
     * La página se encargará de hacer el POST
     * al backend.
     */
    await onSave(newEvent);

    /**
     * Solo cerramos el modal después de que
     * el proceso de guardado haya terminado.
     */
    onClose();
  };


  /*
   * ==========================================================================
   * RENDER DEL MODAL
   * ==========================================================================
   */

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"

      /*
       * Si hacemos click fuera del modal,
       * se cierra.
       */
      onClick={onClose}
    >

      <div
        className="relative w-full max-w-6xl max-h-[96vh] overflow-hidden rounded-2xl bg-white shadow-2xl"

        /*
         * Evita que un click dentro del modal
         * cierre el modal.
         */
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
                Define los datos clave del evento y desglosa el plan
                operativo en subtareas con horas y plazos.
              </p>

            </div>
          </div>


          {/* Botón cerrar */}
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


        {/* ================================================================
            BODY
        ================================================================= */}

        <div className="max-h-[calc(96vh-150px)] overflow-y-auto bg-gray-50/50 p-5">

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


                  {/* ======================================================
                      NOMBRE DEL EVENTO
                  ======================================================= */}

                  <div className="md:col-span-2">

                    <label className="mb-1 block text-xs font-semibold text-gray-700">
                      Nombre del Evento *
                    </label>

                    <input
                      type="text"
                      value={eventName}
                      onChange={(e) => {

                        setEventName(e.target.value);

                        /*
                         * Cuando el usuario comienza a corregir
                         * el campo, eliminamos su mensaje de error.
                         */
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

                    {/* Mensaje de error */}
                    {errors.eventName && (
                      <p className="mt-1 text-xs text-red-600">
                        {errors.eventName}
                      </p>
                    )}

                  </div>


                  {/* ======================================================
                      TIPO DE EVENTO
                  ======================================================= */}

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

                      <option value="Boda / Social">
                        Boda / Social
                      </option>

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

                    {/* Mensaje de error */}
                    {errors.eventType && (
                      <p className="mt-1 text-xs text-red-600">
                        {errors.eventType}
                      </p>
                    )}

                  </div>


                  {/* ======================================================
                      CLIENTE / CONTACTO
                  ======================================================= */}

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


                  {/* ======================================================
                      FECHA Y HORA
                  ======================================================= */}

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

                    {/* Mensaje de error */}
                    {errors.eventDate && (
                      <p className="mt-1 text-xs text-red-600">
                        {errors.eventDate}
                      </p>
                    )}

                  </div>


                  {/* ======================================================
                      LUGAR
                  ======================================================= */}

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


                {/* ========================================================
                    LISTA DE SUBTAREAS YA AGREGADAS
                ========================================================= */}

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


                {/* ========================================================
                    FORMULARIO PARA NUEVA SUBTAREA
                ========================================================= */}

                <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4">


                  {/* Título */}
                  <div className="mb-4 flex items-center gap-2">

                    <span className="material-symbols-outlined text-indigo-600">
                      add_circle
                    </span>

                    <h4 className="text-sm font-semibold text-gray-900">
                      + Agregar Nueva Subtarea Logística
                    </h4>

                  </div>


                  {/* Campos */}
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-12">


                    {/* ====================================================
                        NOMBRE DE LA GESTIÓN
                    ===================================================== */}

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


                    {/* ====================================================
                        FECHA DE LA SUBTAREA
                    ===================================================== */}

                    <div className="md:col-span-3">

                      <label className="mb-1 block text-xs font-medium text-gray-700">
                        Plazo / Fecha objetivo *
                      </label>

                      <input
                        type="date"
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


                    {/* ====================================================
                        HORAS ESTIMADAS
                    ===================================================== */}

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


                    {/* ====================================================
                        PROVEEDOR / RESPONSABLE
                    ===================================================== */}

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


              {/* ==========================================================
                  CAPACIDAD DEL PLANNER
              =========================================================== */}

              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">

                <div className="mb-3 flex items-center justify-between">

                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900">
                    Capacidad del Planner
                  </h4>

                  <span className="material-symbols-outlined text-green-700">
                    health_and_safety
                  </span>

                </div>


                {/* Horas calculadas */}
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


                {/* Barra de capacidad */}
                <div className="mt-4">

                  <div className="flex justify-between text-xs text-gray-500">

                    <span>
                      Límite semanal recomendado
                    </span>

                    <span>
                      35.0 h
                    </span>

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


              {/* ==========================================================
                  ZONA DE RIESGO
              =========================================================== */}

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


        {/* ================================================================
            FOOTER
        ================================================================= */}

        <div className="flex flex-col justify-between gap-3 border-t border-gray-200 bg-white px-6 py-3 sm:flex-row sm:items-center">


          {/* Mensaje informativo */}
          <p className="text-xs text-gray-500">
            Los cambios se guardan localmente en tu sesión de la pestaña Eventos.
          </p>


          {/* Botones */}
          <div className="flex justify-end gap-2">


            {/* ============================================================
                CANCELAR
            ============================================================= */}

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-gray-100 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-200"
            >
              Cancelar
            </button>


            {/* ============================================================
                GUARDAR BORRADOR
            ============================================================= */}

            <button
              type="button"
              onClick={handleSaveDraft}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              Guardar como borrador
            </button>


            {/* ============================================================
                GUARDAR Y PUBLICAR
            ============================================================= */}

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
  );
}