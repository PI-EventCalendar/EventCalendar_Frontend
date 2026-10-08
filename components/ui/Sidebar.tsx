"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Settings } from "lucide-react";
function DashboardIcon() {
  return (
    <svg
      className="w-6 h-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <rect x="14" y="14" width="6" height="6" rx="1" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      className="w-6 h-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg
      className="w-6 h-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.7 1.7-..." />
    </svg>
  );
}

export default function Sidebar() {
  // Obtiene la ruta actual del navegador.
  // Ejemplos:
  // /hoy
  // /actividad
  // /actividad/20
  const pathname = usePathname();
  const router = useRouter();
  // ============================================================
  // CERRAR SESIÓN
  // ============================================================
  // Eliminamos los tokens utilizados para autenticar las
  // peticiones al backend.
  //
  // Al eliminar el access_token, apiClient ya no podrá enviar:
  // Authorization: Bearer <token>
  //
  // Después redirigimos al usuario al login para que tenga
  // que autenticarse nuevamente.
  // ============================================================
  const handleLogout = () => {
    // Eliminamos el token de acceso actual.
    localStorage.removeItem("access_token");

    // Eliminamos el refresh token si nuestra aplicación
    // lo está almacenando en localStorage.
    localStorage.removeItem("refresh_token");

    // Eliminamos información auxiliar del usuario, si existe.
    localStorage.removeItem("user_name");

    // Mandamos al usuario al login.
    router.push("/login");
  };

  // Inicio está activo únicamente en /hoy.
  const isInicioActive = pathname === "/hoy";

  // Eventos permanece activo tanto en /actividad
  // como en cualquier página hija, por ejemplo /actividad/20.
  const isEventosActive =
    pathname === "/actividad" || pathname.startsWith("/actividad/");

  return (
    <aside className="fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-gray-100 bg-white">
      {/* LOGO */}
      <div className="flex items-center gap-4 px-7 py-6">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white">
          <CalendarIcon />
        </div>

        <div className="flex flex-col">
          <span className="text-2xl font-bold leading-tight text-gray-900">
            EventCalendar
          </span>

          <span className="text-sm font-semibold tracking-wide text-gray-600">
            OPS & LOGISTICS
          </span>
        </div>
      </div>

      {/* MENÚ */}
      <div className="px-6 pt-8">
        <span className="px-3 text-base font-bold uppercase tracking-wide text-gray-600">
          Menú Principal
        </span>

        <nav className="mt-4 flex flex-col gap-2">
          <Link
            href="/hoy"
            className={`flex items-center gap-4 rounded-xl px-4 py-4 transition ${
              isInicioActive
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            }`}
          >
            <DashboardIcon />

            <span className="text-lg font-medium">Hoy</span>
          </Link>

          <Link
            href="/actividad"
            className={`flex items-center gap-4 rounded-xl px-4 py-4 transition ${
              isEventosActive
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            }`}
          >
            <CalendarIcon />

            <span className="text-lg font-medium">Eventos</span>
          </Link>

          <Link
            href="/configuracion"
            className="flex items-center gap-4 rounded-xl px-4 py-4 text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
          >
            <Settings className="h-6 w-6" />
            <span className="text-lg font-medium">Configuración</span>
          </Link>
        </nav>
      </div>

      {/* USUARIO */}
      <div className="mt-auto border-t border-gray-100 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-600">
            J
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-900">Juan</p>

            <p className="truncate text-xs text-gray-500">Administrador</p>
          </div>
        </div>

        {/* BOTÓN CERRAR SESIÓN */}
        <button
          type="button"
          onClick={handleLogout}
          className="mt-4 flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100 hover:text-red-600 cursor-pointer"
        >
          {/* Icono de salida */}
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"
            />

            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10 17l5-5-5-5"
            />

            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12H3" />
          </svg>

          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}
