'use client';

import React, { useState } from 'react';
import { ConflictModal } from '@/features/tasks/components/ConflictModal';
import { ConflictData, ResolutionAction, Task } from '@/types';

export default function DashboardPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [conflictData, setConflictData] = useState<ConflictData | null>(null);

  // Simulación de prueba de reprogramación con conflicto (Tarea T3)
  const handleTestConflict = () => {

    const mockTasks: Task[] = [

      {
        id: 1,
        event: 1,
        title: "Reunión de logística",
        scheduled_date: "2026-09-20",
        estimated_hours: 2,
        status: "pending",
        priority: "high",
        description: "",
        due_date: null,
        category: null,
        category_detail: null,
        provider_name: "",
        provider_company: "",
        notes: "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as Task,
    ];

    setConflictData({
      hasConflict: true,
      currentHours: 4.0,
      addedHours: 4.0,
      limitHours: 6.0,
      taskToReschedule: mockTasks[0],
    });
    setIsModalOpen(true);
  };

  const handleResolveConflict = (action: ResolutionAction, payload?: any) => {
    console.log('Resolución seleccionada:', action, payload);
    setIsModalOpen(false);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hola, Juan 👋</h1>
          <p className="text-sm text-gray-500">Tienes gestiones urgentes programadas para hoy.</p>
        </div>
        <button
          onClick={handleTestConflict}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition"
        >
          Probar Alerta de Conflicto (T3)
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Columna Izquierda: Tareas de Hoy */}
        <div className="md:col-span-2 space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Gestiones Prioritarias del Día</h2>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <span className="text-xs text-indigo-600 font-bold">Gala Anual Innovatech</span>
                <h3 className="text-sm font-semibold text-gray-900">Confirmar catering para 150 pax</h3>
              </div>
              <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded font-bold">Urgente</span>
            </div>
            <div className="text-xs text-gray-500 flex justify-between">
              <span>Horas estimadas: 1.5h</span>
              <button onClick={handleTestConflict} className="text-indigo-600 font-semibold hover:underline">
                Posponer...
              </button>
            </div>
          </div>
        </div>

        {/* Columna Derecha: Carga Diaria */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Carga de Trabajo Diaria</h2>
          <div className="text-center py-4">
            <span className="text-4xl font-extrabold text-indigo-600">4.0h</span>
            <span className="text-sm text-gray-500 block mt-1">de 6.0h límite diario</span>
          </div>
          <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full bg-indigo-600 rounded-full" style={{ width: '66%' }} />
          </div>
        </div>
      </div>

      {/* Modal de Conflicto Integrado */}
      <ConflictModal
        isOpen={isModalOpen}
        conflictData={conflictData}
        onClose={() => setIsModalOpen(false)}
        onResolve={handleResolveConflict}
      />
    </div>
  );
}