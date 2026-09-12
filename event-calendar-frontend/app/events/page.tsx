'use client';

import React, { useState } from 'react';
import Link from 'next/link';

// Datos de prueba (mock) de la lista de eventos
const mockEvents = [
  {
    id: 1,
    title: 'Gala Anual Innovatech 2026',
    description: 'Organización logística del evento principal corporativo.',
    event_date: '2026-11-15',
    total_tasks: 3,
    completed_tasks: 2,
  },
  {
    id: 2,
    title: 'Boda Carolina & Mateo',
    description: 'Coordinación de proveedores, banquetes y montaje.',
    event_date: '2026-12-05',
    total_tasks: 5,
    completed_tasks: 1,
  },
];

export default function EventsListPage() {
  const [events] = useState(mockEvents);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mis Eventos</h1>
          <p className="text-sm text-gray-500 mt-1">Gestiona los planes logísticos de tus eventos activos.</p>
        </div>
        <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 shadow-sm transition">
          + Crear Nuevo Evento
        </button>
      </div>

      {/* Grid de Eventos (Tarea Núcleo T1) */}
      {events.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <p className="text-gray-500">No tienes eventos creados aún.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => {
            const progress = Math.round((event.completed_tasks / event.total_tasks) * 100);

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
                  </div>
                  <h2 className="text-lg font-bold text-gray-900">{event.title}</h2>
                  <p className="text-sm text-gray-500 line-clamp-2">{event.description}</p>
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
                    href={`/events/${event.id}`}
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
  );
}