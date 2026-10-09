"use client";

import React, { useState } from "react";
import { ConflictData, ResolutionAction } from "@/types";

interface ConflictModalProps {
  isOpen: boolean;
  conflictData: ConflictData | null;
  onClose: () => void;
  onResolve: (
    action: ResolutionAction,
    payload?: { newDate?: string; newHours?: number },
  ) => void;
}

export const ConflictModal: React.FC<ConflictModalProps> = ({
  isOpen,
  conflictData,
  onClose,
  onResolve,
}) => {
  const [selectedOption, setSelectedOption] =
    useState<ResolutionAction>("MOVE_DATE");
  const [newDate, setNewDate] = useState("");
  const [newHours, setNewHours] = useState(2.0);

  if (!isOpen || !conflictData) return null;

  const totalProjected = conflictData.currentHours + conflictData.addedHours;
  const taskTitle = conflictData.taskToReschedule?.title || "Gestión";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onResolve(selectedOption, { newDate, newHours });
  };

  /* Estilos compartidos de los botones de opción (pills) */
  const pillClass = (active: boolean) =>
    `inline-flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${
      active
        ? "border-red-600 bg-red-600 text-white"
        : "border-red-200 bg-white text-red-700 hover:bg-red-50"
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-gray-100 bg-white p-6 shadow-xl">
        {/* Header del modal */}
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Reprogramar subtarea
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              &quot;{taskTitle}&quot; — Ajusta la fecha y horas planificadas
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
                  Conflicto de Sobrecarga Diaria
                </h3>

                <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                  Límite excedido
                </span>
              </div>

              <p className="mt-1 text-sm leading-relaxed text-red-700">
                Al mover &quot;{taskTitle}&quot; para hoy, superas tu límite de{" "}
                {conflictData.limitHours}h diarias. Total proyectado:{" "}
                {totalProjected} horas.
              </p>
            </div>
          </div>

          {/* Estadísticas */}
          <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl border border-red-100 bg-white p-3 text-center">
            <div>
              <p className="text-xs text-gray-500">Horas actuales</p>
              <p className="text-lg font-bold text-slate-900">
                {Number(conflictData.currentHours).toFixed(2)}h
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">A reprogramar</p>
              <p className="text-lg font-bold text-orange-700">
                {Number(conflictData.addedHours).toFixed(2)}h
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">Límite diario</p>
              <p className="text-lg font-bold text-red-600">
                {Number(conflictData.limitHours).toFixed(2)}h
              </p>
            </div>
          </div>

          {/* Opciones para resolver */}
          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-red-200 pt-4">
            <span className="text-sm text-red-700">
              Opciones para resolver el conflicto:
            </span>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedOption("REDUCE_HOURS")}
                className={pillClass(selectedOption === "REDUCE_HOURS")}
              >
                ✏️ Ajustar horas
              </button>

              <button
                type="button"
                onClick={() => setSelectedOption("MOVE_DATE")}
                className={pillClass(selectedOption === "MOVE_DATE")}
              >
                📅 Cambiar fecha
              </button>

              <button
                type="button"
                onClick={() => setSelectedOption("FORCE")}
                className={pillClass(selectedOption === "FORCE")}
              >
                🚨 Forzar sobrecarga
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
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full rounded-xl border-2 border-amber-300 bg-amber-50/30 p-2.5 text-sm text-gray-900 outline-none focus:border-amber-400"
                required
              />
            </div>
          )}

          {selectedOption === "REDUCE_HOURS" && (
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-800">
                Horas estimadas *
              </label>
              <input
                type="number"
                step="0.5"
                value={newHours}
                onChange={(e) => setNewHours(parseFloat(e.target.value))}
                className="w-full rounded-xl border-2 border-amber-300 bg-amber-50/30 p-2.5 text-sm text-gray-900 outline-none focus:border-amber-400"
                required
              />
            </div>
          )}

          {selectedOption === "FORCE" && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              Se mantendrá la programación actual aunque supere tu límite de{" "}
              {conflictData.limitHours}h diarias.
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
              Confirmar reprogramación
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
