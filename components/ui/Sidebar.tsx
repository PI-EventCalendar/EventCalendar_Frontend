"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  CalendarDays,
  LayoutGrid,
  LogOut,
  Settings,
  SlidersHorizontal,
  CircleHelp,
} from "lucide-react";
import { useTasks } from "@/features/tasks/hooks/useTasks";
import { useAuth } from "@/features/auth/context/AuthContext";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const guide = [
  { title: "Hoy", image: "/tutorial/Tutorial%20-%20Vista%20hoy%20vacia.png", description: "Aquí ves las subtareas pendientes organizadas por fecha. Busca, filtra por evento o estado y usa Reprogramar, Posponer, Completar y Editar en cada subtarea. El indicador superior resume las horas planificadas frente a tu límite diario." },
  { title: "Eventos", image: "/tutorial/Tutorial%20-%20Eventos.png", description: "Consulta tus eventos, su avance y las subtareas asociadas. Abre un evento para revisar el plan; usa los controles de crear, editar o eliminar para mantenerlo actualizado." },
  { title: "Configuración", image: "/tutorial/Tutorial%20-%20Configuracion.png", description: "Define el máximo de horas que deseas planificar por día. Si el nuevo límite afecta subtareas existentes, podrás reducir sus horas o eliminarlas aquí antes de guardar." },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();
  const [showGuide, setShowGuide] = useState(false);
  const [guideStep, setGuideStep] = useState(0);
  const activeToday = pathname === "/hoy";
  const activeEvents =
    pathname === "/actividad" || pathname.startsWith("/actividad/");
  const activeSettings = pathname === "/configuracion";
  const { data } = useTasks();
  useEffect(() => {
    if (localStorage.getItem("eventcalendar_tutorial_pending") === "true") {
      localStorage.removeItem("eventcalendar_tutorial_pending");
      const timer = window.setTimeout(() => setShowGuide(true), 0);
      return () => window.clearTimeout(timer);
    }
  }, []);
  const taskList = Array.isArray(data) ? data : (data?.results ?? []);
  const todayCount = taskList.filter((task) =>
    ["pending", "in_progress", "postponed"].includes(task.status),
  ).length;
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[260px] flex-col border-r border-slate-100 bg-white lg:flex">
        <div className="flex items-center gap-3 px-5 py-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-white p-1 shadow-md">
            <img
              src="/event-calendar-logo.png"
              alt="EventCalendar"
              className="h-full w-full rounded-lg object-contain"
            />
          </div>
          <div>
            <p className="text-base font-bold leading-tight text-slate-900">
              EventCalendar
            </p>
            <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">
              OPS &amp; LOGISTICS
            </p>
          </div>
        </div>
        <div className="px-3 pt-5">
          <p className="px-2 py-2 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">
            Navegación operativa
          </p>
          <nav className="space-y-1">
            <Link
              href="/hoy"
              className={`flex h-10 items-center justify-between rounded-lg px-3 text-sm font-semibold transition ${activeToday ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"}`}
            >
              <span className="flex items-center gap-2">
                <LayoutGrid className="h-4 w-4" />
                Hoy
              </span>
              {activeToday && (
                <span className="rounded-full bg-emerald-300 px-2 py-0.5 text-[11px] text-emerald-950">
                  {todayCount ?? "—"}
                </span>
              )}
            </Link>
            <Link
              href="/actividad"
              className={`flex h-10 items-center justify-between rounded-lg px-3 text-sm font-semibold transition ${activeEvents ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"}`}
            >
              <span className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                Eventos
              </span>
            </Link>
            <Link
              href="/configuracion"
              className={`flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition ${activeSettings ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"}`}
            >
              <Settings className="h-4 w-4" />
              Configuración
            </Link>
            <button type="button" onClick={() => { setGuideStep(0); setShowGuide(true); }} className="flex h-10 w-full cursor-pointer items-center gap-2 rounded-lg px-3 text-left text-sm font-semibold text-slate-600 transition hover:bg-slate-100">
              <CircleHelp className="h-4 w-4" />Información general
            </button>
          </nav>
        </div>
        <div className="mt-auto border-t border-slate-100 p-3">
          <div className="rounded-xl bg-indigo-50 p-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                J
              </div>
              <span className="truncate text-xs font-semibold text-slate-800">
                Juan
              </span>
            </div>
            <button
              type="button"
              onClick={logout}
              className="mt-3 flex w-full items-center gap-2 rounded-lg px-1 text-xs font-semibold text-slate-600 cursor-pointer hover:text-red-600"
            >
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </button>
          </div>
        </div>
      </aside>
      <nav className="fixed inset-x-3 bottom-3 z-40 flex justify-around rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-lg backdrop-blur lg:hidden">
        <Link
          href="/hoy"
          aria-label="Hoy"
          className={`rounded-xl p-3 ${activeToday ? "bg-indigo-600 text-white" : "text-slate-600"}`}
        >
          <LayoutGrid className="h-5 w-5" />
        </Link>
        <Link
          href="/actividad"
          aria-label="Eventos"
          className={`rounded-xl p-3 ${activeEvents ? "bg-indigo-600 text-white" : "text-slate-600"}`}
        >
          <CalendarDays className="h-5 w-5" />
        </Link>
        <Link
          href="/configuracion"
          aria-label="Configuración"
          className="rounded-xl p-3 text-slate-600"
        >
          <SlidersHorizontal className="h-5 w-5" />
        </Link>
        <button type="button" aria-label="Información general" title="Información general" onClick={() => { setGuideStep(0); setShowGuide(true); }} className="cursor-pointer rounded-xl p-3 text-slate-600 hover:bg-slate-100">
          <CircleHelp className="h-5 w-5" />
        </button>
      </nav>
      <Dialog open={showGuide} onOpenChange={setShowGuide}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Información general · {guideStep + 1} de {guide.length}</p>
            <DialogTitle className="text-xl">{guide[guideStep].title}</DialogTitle>
            <DialogDescription>{guide[guideStep].description}</DialogDescription>
          </DialogHeader>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
            <img src={guide[guideStep].image} alt={`Captura de la pantalla ${guide[guideStep].title}`} className="block h-auto max-h-[min(52vh,390px)] w-full object-contain object-top" />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-1.5" aria-label="Pantallas del tutorial">{guide.map((page, index) => <button key={page.image} type="button" aria-label={`Mostrar ${page.title}`} onClick={() => setGuideStep(index)} className={`h-2.5 w-2.5 cursor-pointer rounded-full ${index === guideStep ? "bg-indigo-600" : "bg-slate-300"}`} />)}</div>
            <div className="flex gap-2"><Button type="button" variant="outline" onClick={() => setGuideStep((step) => Math.max(0, step - 1))} disabled={guideStep === 0}>Anterior</Button>{guideStep < guide.length - 1 ? <Button type="button" onClick={() => setGuideStep((step) => Math.min(guide.length - 1, step + 1))}>Siguiente</Button> : <Button type="button" onClick={() => setShowGuide(false)}>Listo</Button>}</div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

