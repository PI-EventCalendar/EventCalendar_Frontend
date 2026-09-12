'use client';

import React, { useState } from 'react';
import { TaskStatus } from '@/types';

// Datos de ejemplo (mock) mientras conectas Django
const mockEvent = {
  id: 1,
  title: 'Gala Anual Innovatech 2026',
  description: 'Organización logística del evento principal corporativo.',
  event_date: '2026-11-15',
  tasks: [
    { id: 101, title: 'Confirmar catering para 150 pax', estimated_hours: 1.5, scheduled_date: '2026-09-12', status: 'PENDING' as TaskStatus },
    { id: 102, title: 'Reservar salón principal', estimated_hours: 2.0, scheduled_date: '2026-09-14', status: 'COMPLETED' as TaskStatus },
    { id: 103, title: 'Enviar invitaciones VIP', estimated_hours: 1.0, scheduled_date: '2026-09-15', status: 'COMPLETED' as TaskStatus },
  ],
};

export default function EventDetailPage() {
  const [event] = useState(mockEvent);

  // Cálculo de progreso (Tarea Núcleo T4)
  const completedTasks = event.tasks.filter((t) => t.status === 'COMPLETED').length;
  const totalTasks = event.tasks.length;
  const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      
      {/* Header del Evento */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b pb-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Plan Logístico</span>
          <h1 className="text-3xl font-bold text-gray-900">{event.title}</h1>
          <p className="text-sm text-gray-500 mt-1">{event.description}</p>
        </div>
        <button className="self-start md:self-auto rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 shadow-sm transition">
          + Añadir Gestión Logística
        </button>
      </div>

      {/* Widget de Barra de Progreso (Tarea Núcleo T4) */}
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm space-y-3">
        <div className="flex justify-between items-center text-sm font-semibold">
          <span className="text-gray-700">Progreso de Preparación del Evento</span>
          <span className="text-indigo-600 font-bold">{progressPercentage}% Completado</span>
        </div>
        <div className="h-3 w-full rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full bg-indigo-600 transition-all duration-500 rounded-full"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <p className="text-xs text-gray-500">
          {completedTasks} de {totalTasks} gestiones logísticas ejecutadas.
        </p>
      </div>

      {/* Listado de Subtareas (Tarea Núcleo T1) */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900">Gestiones Logísticas</h2>
        
        {event.tasks.length === 0 ? (
          /* Empty State */
          <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center">
            <p className="text-gray-500 text-sm">No hay gestiones planificadas para este evento aún.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {event.tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:border-gray-300 transition"
              >
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={task.status === 'COMPLETED'}
                    readOnly
                    className="h-5 w-5 rounded border-gray-300 text-indigo-600"
                  />
                  <div>
                    <h3 className={`text-sm font-semibold ${task.status === 'COMPLETED' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                      {task.title}
                    </h3>
                    <span className="text-xs text-gray-500">
                      Fecha: {task.scheduled_date} • Est: {task.estimated_hours}h
                    </span>
                  </div>
                </div>

                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    task.status === 'COMPLETED'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {task.status === 'COMPLETED' ? 'Completado' : 'Pendiente'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}