"use client";

import React, { useState } from "react";

/*
 * ============================================================================
 * TIPOS
 * ============================================================================
 */

/**
 * Información que Django devuelve cuando una nueva subtarea
 * supera el límite diario de horas.
 */
export interface CreateEventConflict {
  error: string;
  detail: string;
  target_date: string;
  current_hours: string;
  attempted_hours: string;
  daily_hour_limit: string;
  suggested_dates: string[];
}

/**
 * Acciones para resolver el conflicto (igual que ConflictModal,
 * pero sin "FORCE": el backend de creación no permite forzar).
 */
export type CreateEventConflictAction = "MOVE_DATE" | "REDUCE_HOURS";

export interface CreateEventConflictPayload {
  newDate?: string;
  newHours?: number;
}

/*
 * ============================================================================
 * DETECTAR EL CONFLICTO DENTRO DE UN ERROR
 * ============================================================================
 */

/**
 * Busca un DailyOverloadConflict dentro del error recibido.
 *
 * No depende del status 409 ni de axios, porque el interceptor
 * de apiClient puede cambiar la forma del error. Revisa:
 *
 *  1. error.response.data.detail  -> { detail: { error: ... } }
 *  2. error.response.data         -> { error: ... }  (caso normal)
 *  3. error.data
 *  4. error
 *
 * Retorna null si el error NO es un conflicto de carga diaria.
 */
export function extractDailyOverloadConflict(
  error: unknown,
): CreateEventConflict | null {
  const err = error as {
    response?: { data?: { detail?: unknown } & Record<string, unknown> };
    data?: unknown;
  } | null;

  const candidates: unknown[] = [
    err?.response?.data?.detail,
    err?.response?.data,
    err?.data,
    error,
  ];

  for (const candidate of candidates) {
    if (
      candidate &&
      typeof candidate === "object" &&
      (candidate as Record<string, unknown>).error === "DailyOverloadConflict"
    ) {
      const data = candidate as Partial<CreateEventConflict>;

      return {
        error: String(data.error),
        detail: String(data.detail ?? ""),
        target_date: String(data.target_date ?? ""),
        current_hours: String(data.current_hours ?? ""),
        attempted_hours: String(data.attempted_hours ?? ""),
        daily_hour_limit: String(data.daily_hour_limit ?? ""),
        // Django puede enviar [] cuando no hay fechas libres.
        suggested_dates: Array.isArray(data.suggested_dates)
          ? data.suggested_dates
          : [],
      };
    }
  }

  return null;
}

/*
 * ============================================================================
 * PROPS
 * ============================================================================
 */

interface CreateEventConflictModalProps {
  /** Conflicto enviado por Django. Si es null, el modal no se muestra. */
  conflict: CreateEventConflict | null;

  /** El usuario cierra el modal sin resolver el conflicto. */
  onClose: () => void;

  /** El usuario confirma una solución (mover fecha o reducir horas). */
  onResolve: (
    action: CreateEventConflictAction,
    payload: CreateEventConflictPayload,
  ) => void;

  /** Nombre de la subtarea que produjo el conflicto (informativo). */
  taskName?: string;

  /** Horas actuales de esa subtarea (para calcular el máximo permitido). */
  taskHours?: number;

  /** Fecha del evento (YYYY-MM-DD): la subtarea no puede ir después. */
  maxDate?: string;

  /** true si el usuario ya corrigió una vez y el backend volvió a rechazar. */
  stillOverloaded?: boolean;
}

/*
 * ============================================================================
 * COMPONENTE
 * ============================================================================
 */

/**
 * Muestra el modal solo cuando existe un conflicto.
 *
 * El formulario real vive en CreateEventConflictForm y se monta con una
 * `key` distinta por conflicto: cada conflicto nuevo empieza con el
 * formulario limpio, sin necesidad de un useEffect que lo reinicie.
 */
export function CreateEventConflictModal({
  conflict,
  ...rest
}: CreateEventConflictModalProps) {
  if (!conflict) {
    return null;
  }

  return (
    <CreateEventConflictForm
      key={`${conflict.target_date}-${conflict.current_hours}-${conflict.attempted_hours}`}
      conflict={conflict}
      {...rest}
    />
  );
}

function CreateEventConflictForm({
  conflict,
  onClose,
  onResolve,
  taskName,
  taskHours,
  maxDate,
  stillOverloaded = false,
}: CreateEventConflictModalProps & { conflict: CreateEventConflict }) {
  const [selectedOption, setSelectedOption] =
    useState<CreateEventConflictAction>("MOVE_DATE");
  const [newDate, setNewDate] = useState("");
  const [newHours, setNewHours] = useState("");
  const [formError, setFormError] = useState("");

  const currentHours = Number(conflict.current_hours);
  const attemptedHours = Number(conflict.attempted_hours);
  const limitHours = Number(conflict.daily_hour_limit);
  const totalProjected = currentHours + attemptedHours;

  /*
   * Horas máximas que puede tener la subtarea en la fecha afectada:
   * límite - horas actuales - horas de las OTRAS subtareas nuevas
   * programadas ese mismo día.
   */
  const otherNewHours =
    taskHours !== undefined ? Math.max(0, attemptedHours - taskHours) : 0;

  const maxHours = Math.max(
    0,
    Math.round((limitHours - currentHours - otherNewHours) * 100) / 100,
  );

  const canReduce = maxHours > 0;

  const selectOption = (option: CreateEventConflictAction) => {
    setSelectedOption(option);
    setFormError("");
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setFormError("");

    if (selectedOption === "MOVE_DATE") {
      if (!newDate) {
        setFormError("Selecciona la nueva fecha.");
        return;
      }

      if (newDate === conflict.target_date) {
        setFormError("Elige una fecha distinta a la que produjo el conflicto.");
        return;
      }

      if (maxDate && newDate > maxDate) {
        setFormError(
          `La fecha no puede ser posterior a la fecha del evento (${maxDate}).`,
        );
        return;
      }

      onResolve("MOVE_DATE", { newDate });
      return;
    }

    // REDUCE_HOURS
    const hours = Number(newHours);

    if (!newHours || Number.isNaN(hours) || hours <= 0) {
      setFormError("Ingresa unas horas válidas (mayores a 0).");
      return;
    }

    if (hours > maxHours) {
      setFormError(
        `Para el ${conflict.target_date} puedes programar máximo ${maxHours} h.`,
      );
      return;
    }

    onResolve("REDUCE_HOURS", { newHours: hours });
  };

  /* Estilos compartidos de los botones de opción (pills) */
  const pillClass = (active: boolean, disabled = false) =>
    `inline-flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${
      disabled
        ? "cursor-not-allowed border-red-100 bg-white/60 text-red-300"
        : active
          ? "border-red-600 bg-red-600 text-white"
          : "border-red-200 bg-white text-red-700 hover:bg-red-50"
    }`;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-gray-100 bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header del modal */}
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Programar subtarea
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {taskName ? `"${taskName}" — ` : ""}Ajusta la fecha y horas
              planificadas
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {/* Tarjeta de conflicto */}
        <div className="mb-5 rounded-2xl border border-red-200 bg-red-50/60 p-4">
          {/* Cabecera de la tarjeta */}
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-100 text-lg">
              ⚠️
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-lg font-bold text-red-900">
                  {stillOverloaded
                    ? "El día continúa sobrecargado"
                    : "Conflicto de Sobrecarga Diaria"}
                </h3>

                <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                  Límite excedido
                </span>
              </div>

              <p className="mt-1 text-sm leading-relaxed text-red-700">
                {taskName
                  ? `Al programar "${taskName}" el ${conflict.target_date}, superas tu límite de ${conflict.daily_hour_limit}h diarias.`
                  : conflict.detail}{" "}
                Total proyectado: {totalProjected.toFixed(2)} horas.
              </p>
            </div>
          </div>

          {/* Estadísticas */}
          <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl border border-red-100 bg-white p-3 text-center">
            <div>
              <p className="text-xs text-gray-500">Horas actuales</p>
              <p className="text-lg font-bold text-slate-900">
                {currentHours.toFixed(2)}h
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">A programar</p>
              <p className="text-lg font-bold text-orange-700">
                {attemptedHours.toFixed(2)}h
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">Límite diario</p>
              <p className="text-lg font-bold text-red-600">
                {limitHours.toFixed(2)}h
              </p>
            </div>
          </div>

          {/* Fechas sugeridas */}
          <div className="mt-4">
            {conflict.suggested_dates.length > 0 ? (
              <>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-700">
                  Fechas con disponibilidad:
                </p>

                <div className="flex flex-wrap gap-2">
                  {conflict.suggested_dates.map((date) => (
                    <button
                      key={date}
                      type="button"
                      onClick={() => {
                        setSelectedOption("MOVE_DATE");
                        setNewDate(date);
                        setFormError("");
                      }}
                      className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm font-semibold transition-colors ${
                        selectedOption === "MOVE_DATE" && newDate === date
                          ? "border-green-600 bg-green-600 text-white"
                          : "border-green-300 bg-green-50 text-green-800 hover:bg-green-100"
                      }`}
                    >
                      📅 {date}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                📋 No hay fechas disponibles automáticamente. Ingresa una fecha
                manualmente.
              </p>
            )}
          </div>

          {/* Opciones para resolver */}
          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-red-200 pt-4">
            <span className="text-sm text-red-700">
              Opciones para resolver el conflicto:
            </span>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!canReduce}
                title={
                  !canReduce
                    ? "Ese día ya no tiene horas disponibles."
                    : undefined
                }
                onClick={() => selectOption("REDUCE_HOURS")}
                className={pillClass(
                  selectedOption === "REDUCE_HOURS",
                  !canReduce,
                )}
              >
                ✏️ Ajustar horas
              </button>

              <button
                type="button"
                onClick={() => selectOption("MOVE_DATE")}
                className={pillClass(selectedOption === "MOVE_DATE")}
              >
                📅 Cambiar fecha
              </button>
            </div>
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {selectedOption === "MOVE_DATE" && (
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-800">
                Nueva fecha *
              </label>
              <input
                type="date"
                value={newDate}
                max={maxDate}
                onChange={(e) => {
                  setNewDate(e.target.value);
                  setFormError("");
                }}
                className="w-full rounded-xl border-2 border-amber-300 bg-amber-50/30 p-2.5 text-sm text-gray-900 outline-none focus:border-amber-400"
              />
            </div>
          )}

          {selectedOption === "REDUCE_HOURS" && canReduce && (
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-800">
                Horas estimadas *{" "}
                <span className="font-normal text-gray-400">
                  (0.5–{maxHours}h)
                </span>
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                max={maxHours}
                value={newHours}
                onChange={(e) => {
                  setNewHours(e.target.value);
                  setFormError("");
                }}
                placeholder={`Máximo ${maxHours} h`}
                className="w-full rounded-xl border-2 border-amber-300 bg-amber-50/30 p-2.5 text-sm text-gray-900 outline-none focus:border-amber-400"
              />
              <p className="mt-1 text-xs text-gray-500">
                Disponible el {conflict.target_date}: {maxHours} h
              </p>
            </div>
          )}

          {/* Error de validación */}
          {formError && (
            <p role="alert" className="text-sm font-medium text-red-600">
              {formError}
            </p>
          )}

          {/* Botones */}
          <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 hover:bg-gray-50"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-700"
            >
              Aplicar cambio
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
