'use client';

import React, { useState } from 'react';
import { ConflictData, ResolutionAction } from '@/types';

interface ConflictModalProps {
  isOpen: boolean;
  conflictData: ConflictData | null;
  onClose: () => void;
  onResolve: (action: ResolutionAction, payload?: { newDate?: string; newHours?: number }) => void;
}

export const ConflictModal: React.FC<ConflictModalProps> = ({
  isOpen,
  conflictData,
  onClose,
  onResolve,
}) => {
  const [selectedOption, setSelectedOption] = useState<ResolutionAction>('MOVE_DATE');
  const [newDate, setNewDate] = useState('');
  const [newHours, setNewHours] = useState(2.0);

  if (!isOpen || !conflictData) return null;

  const totalProjected = conflictData.currentHours + conflictData.addedHours;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onResolve(selectedOption, { newDate, newHours });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl border border-gray-100">
        
        {/* Header */}
        <div className="flex items-center space-x-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600 font-bold">
            ⚠️
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Conflicto de Sobrecarga Diaria</h2>
            <p className="text-sm text-gray-500">Límite de capacidad excedido para hoy</p>
          </div>
        </div>

        {/* Info Box */}
        <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-700">
          <p className="font-medium">
            Al mover &quot;{conflictData.taskToReschedule?.title || 'Gestión'}&quot; para hoy, superas tu límite de {conflictData.limitHours}h diarias.
          </p>
          <p className="mt-1 font-semibold">Total proyectado: {totalProjected} horas.</p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Opción 1: Mover fecha */}
          <label className={`block rounded-lg border p-4 cursor-pointer transition ${selectedOption === 'MOVE_DATE' ? 'border-indigo-600 bg-indigo-50/50' : 'border-gray-200'}`}>
            <div className="flex items-center space-x-3">
              <input
                type="radio"
                name="resolution"
                checked={selectedOption === 'MOVE_DATE'}
                onChange={() => setSelectedOption('MOVE_DATE')}
                className="h-4 w-4 text-indigo-600"
              />
              <span className="font-semibold text-gray-900">Mover a otra fecha disponible</span>
            </div>
            {selectedOption === 'MOVE_DATE' && (
              <div className="mt-3 pl-7">
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full rounded-md border border-gray-300 p-2 text-sm text-gray-900"
                  required
                />
              </div>
            )}
          </label>

          {/* Opción 2: Reducir horas */}
          <label className={`block rounded-lg border p-4 cursor-pointer transition ${selectedOption === 'REDUCE_HOURS' ? 'border-indigo-600 bg-indigo-50/50' : 'border-gray-200'}`}>
            <div className="flex items-center space-x-3">
              <input
                type="radio"
                name="resolution"
                checked={selectedOption === 'REDUCE_HOURS'}
                onChange={() => setSelectedOption('REDUCE_HOURS')}
                className="h-4 w-4 text-indigo-600"
              />
              <span className="font-semibold text-gray-900">Reducir horas estimadas</span>
            </div>
            {selectedOption === 'REDUCE_HOURS' && (
              <div className="mt-3 pl-7">
                <input
                  type="number"
                  step="0.5"
                  value={newHours}
                  onChange={(e) => setNewHours(parseFloat(e.target.value))}
                  className="w-full rounded-md border border-gray-300 p-2 text-sm text-gray-900"
                  required
                />
              </div>
            )}
          </label>

          {/* Opción 3: Forzar */}
          <label className={`block rounded-lg border p-4 cursor-pointer transition ${selectedOption === 'FORCE' ? 'border-red-600 bg-red-50/50' : 'border-gray-200'}`}>
            <div className="flex items-center space-x-3">
              <input
                type="radio"
                name="resolution"
                checked={selectedOption === 'FORCE'}
                onChange={() => setSelectedOption('FORCE')}
                className="h-4 w-4 text-red-600"
              />
              <span className="font-semibold text-gray-900">Forzar sobrecarga diaria</span>
            </div>
          </label>

          {/* Botones */}
          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Confirmar reprogramación
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};