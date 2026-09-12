"use client";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useTodayTasks } from "../hooks/useDashboard";
import { useUpdateTaskStatus } from "@/features/tasks/hooks/useTasks";
import { LoadingSpinner } from "@/shared/components/LoadingSpinner";
import type { TaskStatus } from "@/features/tasks/types";
import { CheckCircle2, Circle } from "lucide-react";

const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: "Pendiente",
  in_progress: "En progreso",
  completed: "Completada",
  cancelled: "Cancelada",
};

export function TodayTaskList() {
  const { data, isLoading, isError } = useTodayTasks();
  const { mutate: changeStatus } = useUpdateTaskStatus();

  if (isLoading) return <LoadingSpinner />;
  if (isError) return <p className="text-sm text-destructive">Error al cargar las tareas.</p>;
  if (!data || data.tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <CheckCircle2 className="h-10 w-10 mb-2 opacity-30" />
        <p className="text-sm">No tienes tareas para hoy 🎉</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{data.total} tareas</span>
        <span>{data.completed} completadas · {data.pending} pendientes</span>
      </div>
      <Separator />
      <ul className="space-y-2">
        {data.tasks.map((task) => {
          const isCompleted = task.status === "completed";
          return (
            <li
              key={task.id}
              className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors"
            >
              <button
                type="button"
                className="mt-0.5 text-muted-foreground hover:text-primary transition-colors"
                onClick={() =>
                  changeStatus({ id: task.id, status: isCompleted ? "pending" : "completed" })
                }
                aria-label={isCompleted ? "Marcar como pendiente" : "Marcar como completada"}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                ) : (
                  <Circle className="h-4 w-4" />
                )}
              </button>

              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${isCompleted ? "line-through text-muted-foreground" : ""}`}>
                  {task.title}
                </p>
                {task.due_date && (
                  <p className="text-xs text-muted-foreground">
                    {new Date(task.due_date).toLocaleTimeString("es-CO", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                )}
              </div>

              <Badge variant="outline" className="text-xs shrink-0">
                {STATUS_LABELS[task.status]}
              </Badge>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
