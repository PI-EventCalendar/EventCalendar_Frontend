"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { Task, TaskStatus, TaskPriority } from "../types";
import { Calendar, Clock, Tag, Pencil, Trash2, RefreshCw } from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: "Pendiente",
  in_progress: "En progreso",
  completed: "Completada",
  cancelled: "Cancelada",
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  urgent: "Urgente",
};

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: "bg-blue-100 text-blue-700",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("es-CO", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface TaskCardProps {
  task: Task;
  onEdit?: (task: Task) => void;
  onDelete?: (id: number) => void;
  onReschedule?: (task: Task) => void;
  onStatusChange?: (id: number, status: TaskStatus) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TaskCard({ task, onEdit, onDelete, onReschedule, onStatusChange }: TaskCardProps) {
  const isCompleted = task.status === "completed";

  return (
    <Card className={`flex flex-col transition-opacity duration-200 ${isCompleted ? "opacity-60" : ""}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start gap-2 justify-between">
          <CardTitle className={`text-sm font-medium leading-snug ${isCompleted ? "line-through text-muted-foreground" : ""}`}>
            {task.title}
          </CardTitle>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${PRIORITY_COLORS[task.priority]}`}>
            {PRIORITY_LABELS[task.priority]}
          </span>
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-2">
        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
        )}

        <div className="space-y-1 text-xs text-muted-foreground">
          {task.due_date && (
            <div className="flex items-center gap-1.5">
              <Clock className="h-3 w-3 shrink-0" />
              <span>{formatDate(task.due_date)}</span>
            </div>
          )}
          {task.category_detail && (
            <div className="flex items-center gap-1.5">
              <Tag className="h-3 w-3 shrink-0" />
              <span
                className="px-1.5 py-0.5 rounded text-white text-[10px] font-medium"
                style={{ backgroundColor: task.category_detail.color }}
              >
                {task.category_detail.name}
              </span>
            </div>
          )}
        </div>

        <Separator />

        {/* Cambio rápido de estado */}
        {onStatusChange && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Estado:</span>
            <Badge
              variant={isCompleted ? "outline" : "default"}
              className="cursor-pointer text-xs"
              onClick={() =>
                onStatusChange(task.id, isCompleted ? "pending" : "completed")
              }
              aria-label={isCompleted ? "Marcar como pendiente" : "Marcar como completada"}
            >
              {STATUS_LABELS[task.status]}
            </Badge>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-2 gap-1.5 flex-wrap">
        {onEdit && (
          <Button variant="outline" size="sm" onClick={() => onEdit(task)} aria-label="Editar tarea">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
        {onReschedule && task.due_date && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onReschedule(task)}
            aria-label="Reprogramar tarea"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        )}
        {onDelete && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onDelete(task.id)}
            aria-label="Eliminar tarea"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
