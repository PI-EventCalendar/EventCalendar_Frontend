"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Ban,
  CalendarDays,
  CalendarClock,
  Check,
  CheckCircle2,
  CircleHelp,
  Clock3,
  Filter,
  Pencil,
  Search,
  TimerReset,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import Sidebar from "@/components/ui/Sidebar";
import { RescheduleModal } from "@/features/tasks/components/RescheduleModal";
import { PostponeModal } from "@/features/tasks/components/PostponeModal";
import {
  useTasks,
  useUpdateTaskStatus,
  useDeleteTask,
} from "@/features/tasks/hooks/useTasks";
import { useDailyLoad } from "@/features/dashboard/hooks/useDashboard";
import type { Task, TaskStatus } from "@/features/tasks/types";
import { ProtectedRoute } from "@/shared/components/ProtectedRoute";

const labels: Record<TaskStatus, string> = {
  pending: "Pendiente",
  in_progress: "En progreso",
  completed: "Completada",
  postponed: "Pospuesta",
  cancelled: "Cancelada",
};
const dateOnly = (value: string) => new Date(`${value}T00:00:00`);
const sortTasks = (a: Task, b: Task) =>
  dateOnly(a.scheduled_date).getTime() - dateOnly(b.scheduled_date).getTime() ||
  Number(a.estimated_hours) - Number(b.estimated_hours);

type Actions = {
  reschedule: (task: Task) => void;
  postpone: (task: Task) => void;
  complete: (task: Task) => void;
  remove: (task: Task) => void;
  edit: (task: Task) => void;
};
function TaskCard({
  task,
  urgency,
  actions,
}: {
  task: Task;
  urgency?: "overdue" | "today";
  actions: Actions;
}) {
  const tint =
    urgency === "overdue"
      ? "border-red-100 bg-[#fff1f3]"
      : urgency === "today"
        ? "border-amber-200 bg-[#fff8f1]"
        : "border-slate-100 bg-white";
  return (
    <li
      className={`flex flex-col gap-3 rounded-xl border px-3 py-3 shadow-sm transition hover:shadow-md md:flex-row md:items-center md:justify-between ${tint}`}
    >
      <div className="flex min-w-0 items-start gap-3">
        <span
          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${task.status === "completed" ? "bg-emerald-700 text-white" : urgency === "overdue" ? "border border-red-300 bg-red-100 text-red-600" : "border-2 border-slate-300 bg-white"}`}
          title={urgency === "overdue" ? "Tarea vencida" : labels[task.status]}
        >
          {task.status === "completed" ? (
            <Check className="h-4 w-4" />
          ) : urgency === "overdue" ? (
            <Ban className="h-4 w-4" />
          ) : null}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-slate-900">
              {task.title}
            </h3>
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
              {task.event_title ?? "Sin evento"}
            </span>
            {urgency && (
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${urgency === "overdue" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}
              >
                {urgency === "overdue" ? "Vencida" : "Para hoy"}
              </span>
            )}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 tabular-nums">
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              {task.scheduled_date}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock3 className="h-3.5 w-3.5" />
              {task.estimated_hours} h estimadas
            </span>
            <span>Estado: {labels[task.status]}</span>
          </div>
          {task.notes && (
            <details className="mt-1 text-xs text-slate-600">
              <summary className="cursor-pointer font-medium">Ver nota</summary>
              <p>{task.notes}</p>
            </details>
          )}
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
        <button
          type="button"
          aria-label={`Reprogramar ${task.title}`}
          title="Reprogramar"
          onClick={() => actions.reschedule(task)}
          className="inline-flex items-center gap-1 rounded-lg border border-indigo-100 bg-white px-2.5 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-50 focus:outline-none cursor-pointer focus:ring-2 focus:ring-indigo-500"
        >
          <CalendarClock className="h-4 w-4" />
          Reprogramar
        </button>
        {task.status !== "completed" && (
          <button
            type="button"
            aria-label={`Posponer ${task.title}`}
            title="Posponer"
            onClick={() => actions.postpone(task)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none cursor-pointer focus:ring-2 focus:ring-indigo-500"
          >
            <TimerReset className="h-4 w-4" />
            Posponer
          </button>
        )}
        {urgency === "today" && task.status !== "completed" && (
          <button
            type="button"
            aria-label={`Completar ${task.title}`}
            title="Completar"
            onClick={() => actions.complete(task)}
            className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 cursor-pointer focus:ring-indigo-500"
          >
            <CheckCircle2 className="h-4 w-4" />
            Completar
          </button>
        )}
        {urgency !== "today" && (
          <button
            type="button"
            aria-label={`Eliminar ${task.title}`}
            title="Eliminar"
            onClick={() => actions.remove(task)}
            className="rounded-lg p-2 text-red-600 transition hover:bg-red-50 focus:outline-none cursor-pointer focus:ring-2 focus:ring-red-500"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          aria-label={`Editar ${task.title}`}
          title="Editar subtarea"
          onClick={() => actions.edit(task)}
          className="rounded-lg p-2 text-slate-600 transition hover:bg-indigo-100 hover:text-indigo-700 focus:outline-none focus:ring-2 cursor-pointer focus:ring-indigo-500"
        >
          <Pencil className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
}

function Group({
  title,
  tasks,
  urgency,
  actions,
}: {
  title: string;
  tasks: Task[];
  urgency?: "overdue" | "today";
  actions: Actions;
}) {
  const color =
    urgency === "overdue"
      ? "bg-red-600"
      : urgency === "today"
        ? "bg-amber-400"
        : "bg-indigo-600";
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <span className={`h-3 w-3 rounded-full ${color}`} />
        <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
        <span className="text-xs text-slate-500">{tasks.length}</span>
      </div>
      {tasks.length ? (
        <ul className="space-y-2">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              urgency={urgency}
              actions={actions}
            />
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
          No hay subtareas en este grupo.
        </p>
      )}
    </section>
  );
}

export default function TodayPage() {
  return (
    <ProtectedRoute>
      <TodayContent />
    </ProtectedRoute>
  );
}
function TodayContent() {
  const { data, isLoading, isError, refetch } = useTasks();
  const tasks = useMemo(
    () => (Array.isArray(data) ? data : (data?.results ?? [])),
    [data],
  );
  const { data: load } = useDailyLoad();
  const statusMutation = useUpdateTaskStatus();
  const deleteMutation = useDeleteTask();
  const [selected, setSelected] = useState<Task | null>(null);
  const [postpone, setPostpone] = useState<Task | null>(null);
  const [optimistic, setOptimistic] = useState<Record<number, TaskStatus>>({});
  const [search, setSearch] = useState("");
  const [eventFilter, setEventFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | TaskStatus>("all");
  const [ordering, setOrdering] = useState(false);
  const [message, setMessage] = useState("");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentTasks = tasks.map((task) =>
    optimistic[task.id] ? { ...task, status: optimistic[task.id] } : task,
  );
  const active = currentTasks.filter(
    (task) =>
      task.status !== "completed" || optimistic[task.id] === "completed",
  );
  const activities = useMemo(
    () =>
      Array.from(
        new Map(
          tasks.map((task) => [
            String(task.event),
            { id: String(task.event), title: task.event_title ?? "Sin evento" },
          ]),
        ).values(),
      ),
    [tasks],
  );
  const matches = active
    .filter((task) =>
      `${task.title} ${task.event_title ?? ""}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    )
    .filter(
      (task) => eventFilter === "all" || String(task.event) === eventFilter,
    )
    .filter((task) => statusFilter === "all" || task.status === statusFilter);
  const overdue = matches
    .filter((task) => dateOnly(task.scheduled_date) < today)
    .sort(sortTasks);
  const todayTasks = matches
    .filter(
      (task) => dateOnly(task.scheduled_date).getTime() === today.getTime(),
    )
    .sort(sortTasks);
  const upcoming = matches
    .filter((task) => dateOnly(task.scheduled_date) > today)
    .sort(sortTasks);
  const todayHours = active
    .filter(
      (task) =>
        dateOnly(task.scheduled_date).getTime() === today.getTime() &&
        task.status !== "completed",
    )
    .reduce((sum, task) => sum + Number(task.estimated_hours), 0);
  const dailyLimit = Number(load?.daily_hour_limit ?? 0);
  const reportedHours = Number(load?.total_hours_scheduled ?? todayHours);
  const percent =
    dailyLimit > 0
      ? Math.min(100, Math.max(0, (reportedHours / dailyLimit) * 100))
      : 0;
  const remainingHours =
    dailyLimit > 0 ? Math.max(0, dailyLimit - reportedHours) : 0;
  const clear = () => {
    setSearch("");
    setEventFilter("all");
    setStatusFilter("all");
  };
  const complete = (task: Task) => {
    setOptimistic((prev) => ({ ...prev, [task.id]: "completed" }));
    setMessage("Subtarea marcada como completada");
    window.setTimeout(async () => {
      try {
        await statusMutation.mutateAsync({ id: task.id, status: "completed" });
        setOptimistic((prev) => {
          const next = { ...prev };
          delete next[task.id];
          return next;
        });
      } catch {
        setOptimistic((prev) => {
          const next = { ...prev };
          delete next[task.id];
          return next;
        });
        setMessage("No se pudo completar la subtarea. Inténtalo nuevamente.");
      }
    }, 1200);
  };
  const remove = async (task: Task) => {
    if (!window.confirm(`¿Eliminar “${task.title}”?`)) return;
    try {
      await deleteMutation.mutateAsync(task.id);
      setMessage("Subtarea eliminada");
    } catch {
      setMessage("No se pudo eliminar la subtarea.");
    }
  };
  const actions: Actions = {
    reschedule: setSelected,
    postpone: setPostpone,
    complete,
    remove,
    edit: (task) => {
      if (task.event) window.location.href = `/actividad/${task.event}`;
    },
  };
  return (
    <div className="min-h-screen bg-[#faf8ff] text-[#131b2e]">
      <Sidebar />
      <main className="min-h-screen px-4 pb-12 pt-6 sm:px-6 lg:ml-64 lg:px-8">
        <header className="mb-6 flex items-end justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <p className="text-sm font-semibold">Panel de Operaciones</p>
            <h1 className="mt-8 text-3xl font-bold sm:text-4xl">
              Hoy — Centro de Control Diario
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Monitoreo y ejecución de subtareas logísticas priorizadas
              automáticamente{" "}
              <button
                type="button"
                onClick={() => setOrdering((v) => !v)}
                className="ml-2 inline-flex items-center gap-1 font-semibold cursor-pointer text-indigo-700 underline"
              >
                <CircleHelp className="h-4 w-4" />
                ¿Cómo se ordena?
              </button>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full bg-indigo-100 px-3 py-1.5 text-xs font-semibold sm:inline-flex">
              ●{" "}
              {new Intl.DateTimeFormat("es-CO", {
                day: "numeric",
                month: "long",
                year: "numeric",
              }).format(new Date())}
            </span>
          </div>
        </header>
        {ordering && (
          <div className="mb-4 rounded-xl border border-indigo-100 bg-white p-3 text-sm text-slate-600 shadow-sm">
            Vencidas: más antigua a más reciente. Para hoy y próximas: fecha y,
            en empate, menor cantidad de horas estimadas.
          </div>
        )}
        <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            tone="red"
            label="ATENCIÓN CRÍTICA"
            value={overdue.length}
            detail="subtareas vencidas"
            icon={<TriangleAlert className="h-4 w-4" />}
          />
          <Metric
            tone="amber"
            label="COMPROMISOS DE HOY"
            value={todayTasks.length}
            detail="en agenda"
            icon={<Clock3 className="h-4 w-4" />}
          />
          <Metric
            tone="slate"
            label="EN ESPERA"
            value={upcoming.length}
            detail="próximas subtareas"
            icon={<CalendarDays className="h-4 w-4" />}
          />
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase text-indigo-700">
                CARGA VS CAPACIDAD
              </p>
              <span
                className={`rounded-full px-2 py-1 text-[11px] font-semibold ${load?.is_overloaded ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}
              >
                {load?.is_overloaded
                  ? "Excedida"
                  : percent >= 70
                    ? "Moderada"
                    : "Saludable"}
              </span>
            </div>
            <p className="mt-3 text-2xl font-bold tabular-nums">
              {reportedHours.toFixed(1)}{" "}
              <span className="text-sm font-normal text-slate-500">
                h / {dailyLimit > 0 ? dailyLimit.toFixed(1) : "—"} h límite
                diario
              </span>
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-indigo-100">
              <div
                className={`h-full rounded-full transition-all ${load?.is_overloaded ? "bg-red-600" : "bg-emerald-700"}`}
                style={{ width: `${percent}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {dailyLimit > 0
                ? `Restan ${remainingHours.toFixed(1)} h disponibles hoy`
                : "Límite diario no disponible"}
            </p>
          </div>
        </section>
        {message && (
          <p
            role="status"
            className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
          >
            {message}
          </p>
        )}
        <section className="mb-6 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="grid gap-2 md:grid-cols-[1fr_auto_auto_auto] md:items-end">
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold text-slate-600">
                Buscar subtareas
              </span>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar subtarea logística..."
                  className="h-9 w-full rounded-md border border-transparent bg-indigo-50 pl-9 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                />
              </div>
            </label>
            <label>
              <span className="mb-1 block text-[11px] font-semibold text-slate-600">
                Actividad o Evento
              </span>
              <select
                value={eventFilter}
                onChange={(e) => setEventFilter(e.target.value)}
                className="h-9 w-full rounded-md border border-transparent bg-indigo-50 px-3 text-sm outline-none cursor-pointer focus:border-indigo-400"
              >
                {" "}
                <option value="all">Todos los eventos</option>
                {activities.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-1 block text-[11px] font-semibold cursor-pointer text-slate-600">
                Estado
              </span>
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as "all" | TaskStatus)
                }
                className="h-9 w-full rounded-md border border-transparent bg-indigo-50 px-3 text-sm outline-none cursor-pointer focus:border-indigo-400"
              >
                <option value="all">Todos los estados</option>
                {Object.entries(labels)
                  .filter(([key]) => key !== "completed")
                  .map(([key, value]) => (
                    <option key={key} value={key}>
                      {value}
                    </option>
                  ))}
              </select>
            </label>
            <button
              type="button"
              onClick={clear}
              disabled={
                !search && eventFilter === "all" && statusFilter === "all"
              }
              className="h-9 whitespace-nowrap rounded-md border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition cursor-pointer hover:bg-slate-50 disabled:opacity-50"
            >
              <Filter className="mr-1 inline h-3.5 w-3.5" />
              Limpiar filtros
            </button>
          </div>
        </section>
        {isLoading && (
          <p className="text-sm text-slate-500">Cargando subtareas...</p>
        )}
        {isError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            No se pudieron cargar las subtareas.{" "}
            <button
              type="button"
              onClick={() => refetch()}
              className="font-semibold underline"
            >
              Reintentar
            </button>
          </div>
        )}
        {!isLoading && !isError && tasks.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
            Aún no hay subtareas.{" "}
            <Link
              href="/actividad"
              className="font-semibold text-indigo-700 underline"
            >
              Crear evento
            </Link>
          </div>
        )}
        {!isLoading && !isError && tasks.length > 0 && !matches.length && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-600">
            No hay subtareas para estos filtros.{" "}
            <button
              type="button"
              onClick={clear}
              className="ml-2 font-semibold text-indigo-700 underline"
            >
              Limpiar filtros
            </button>
          </div>
        )}
        {matches.length > 0 && (
          <div className="space-y-8">
            <Group
              title="Vencidas"
              tasks={overdue}
              urgency="overdue"
              actions={actions}
            />
            <Group
              title="Para Hoy"
              tasks={todayTasks}
              urgency="today"
              actions={actions}
            />
            <Group title="Próximas" tasks={upcoming} actions={actions} />
          </div>
        )}
        <RescheduleModal
          task={selected}
          open={!!selected}
          onOpenChange={(open) => !open && setSelected(null)}
          onSuccess={() => setMessage("Fecha actualizada correctamente")}
        />
        <PostponeModal
          task={postpone}
          open={!!postpone}
          onOpenChange={(open) => !open && setPostpone(null)}
          onSuccess={() => setMessage("Subtarea pospuesta correctamente")}
        />
      </main>
    </div>
  );
}

function Metric({
  tone,
  label,
  value,
  detail,
  icon,
}: {
  tone: "red" | "amber" | "slate";
  label: string;
  value: number;
  detail: string;
  icon: React.ReactNode;
}) {
  const colors =
    tone === "red"
      ? "border-red-100 bg-red-50 text-red-700"
      : tone === "amber"
        ? "border-amber-100 bg-amber-50 text-amber-800"
        : "border-slate-200 bg-white text-slate-700";
  return (
    <div className={`rounded-xl border p-4 shadow-sm ${colors}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase">{label}</p>
        <span className="rounded-lg bg-white/70 p-2">{icon}</span>
      </div>
      <p className="mt-3 text-3xl font-bold tabular-nums">{value}</p>
      <p className="text-xs">{detail}</p>
    </div>
  );
}
