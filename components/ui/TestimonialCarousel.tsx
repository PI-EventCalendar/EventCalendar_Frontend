"use client";

import { useEffect, useState } from "react";

const testimonials = [
  {
    initials: "EM",
    name: "Elena Martínez",
    role: "Organizadora de eventos",
    comment:
      "EventCalendar cambió por completo cómo organizo mis eventos. Ahora puedo controlar la carga de trabajo sin sobrecargarme de horas.",
  },
  {
    initials: "CR",
    name: "Carlos Rodríguez",
    role: "Coordinador logístico",
    comment:
      "Con EventCalendar puedo organizar las tareas de cada evento y saber rápidamente qué actividades necesitan atención.",
  },
  {
    initials: "LS",
    name: "Laura Sánchez",
    role: "Productora de eventos",
    comment:
      "La planificación es mucho más clara. EventCalendar me ayuda a tener todas las tareas organizadas y cumplir con los plazos.",
  },
  {
    initials: "JM",
    name: "Javier Moreno",
    role: "Coordinador de operaciones",
    comment:
      "Ahora puedo visualizar la carga diaria antes de asignar nuevas tareas. Eso ha mejorado mucho nuestra organización.",
  },
];

export default function TestimonialCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex(
        (previousIndex) => (previousIndex + 1) % testimonials.length,
      );
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const testimonial = testimonials[currentIndex];

  return (
    /*
     * Esta es la ÚNICA card del carrusel.
     *
     * min-h hace que ocupe una zona considerable del
     * panel derecho, en lugar de quedar como una card pequeña.
     *
     * overflow-hidden evita que podamos ver el comentario
     * mientras está entrando o saliendo fuera del espacio.
     */
    <div className="relative z-10 mt-8 min-h-[260px] overflow-hidden rounded-xl bg-white/80 p-6 shadow-sm backdrop-blur-md">
      {/*
       * key={currentIndex}
       *
       * Cada vez que cambia el comentario, React vuelve a crear
       * este elemento y se ejecuta nuevamente la animación.
       */}
      <div
        key={currentIndex}
        className="absolute inset-0 flex items-center p-6 animate-testimonial-slide"
      >
        <div className="flex w-full items-start gap-5">
          {/* Avatar */}
          <div
            className="testimonial-item flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full border-2 border-indigo-200 bg-indigo-100 text-xl font-bold text-indigo-600"
            style={{ animationDelay: "0.1s" }}
          >
            {testimonial.initials}
          </div>

          {/* Información del testimonio */}
          <div
            className="testimonial-item flex min-w-0 flex-1 flex-col gap-2"
            style={{ animationDelay: "0.25s" }}
          >
            {/* Estrellas doradas */}
            <div
              className="flex gap-1 text-lg text-yellow-400"
              aria-label="5 de 5 estrellas"
            >
              <span>★</span>
              <span>★</span>
              <span>★</span>
              <span>★</span>
              <span>★</span>
            </div>

            {/* Comentario */}
            <blockquote className="max-w-2xl text-base leading-6 italic text-gray-700">
              {testimonial.comment}
            </blockquote>

            {/* Autor */}
            <div className="mt-2">
              <p className="text-sm font-bold text-gray-900">
                {testimonial.name}
              </p>

              <p className="text-xs text-gray-500">{testimonial.role}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
