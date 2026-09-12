"use client";

import { useDailyLoad } from "../hooks/useDashboard";
import { ProgressBar } from "@/features/events/components/ProgressBar";
import { LoadingSpinner } from "@/shared/components/LoadingSpinner";
import { TrendingUp } from "lucide-react";

interface DailyLoadWidgetProps {
  date?: string;  // YYYY-MM-DD, por defecto hoy
}

export function DailyLoadWidget({ date }: DailyLoadWidgetProps) {
  const { data, isLoading, isError } = useDailyLoad(date);

  if (isLoading) return <LoadingSpinner />;
  if (isError) return <p className="text-sm text-destructive">Error al cargar la carga diaria.</p>;
  if (!data) return null;

  const loadLevel =
    data.load_percentage >= 80
      ? "Alta"
      : data.load_percentage >= 50
        ? "Media"
        : "Baja";

  const loadColor =
    data.load_percentage >= 80
      ? "text-destructive"
      : data.load_percentage >= 50
        ? "text-yellow-600"
        : "text-green-600";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sm font-medium">
          <TrendingUp className="h-4 w-4" />
          <span>Carga del día</span>
        </div>
        <span className={`text-sm font-semibold ${loadColor}`}>{loadLevel}</span>
      </div>

      <ProgressBar
        completed={data.completed_count}
        total={data.task_count}
        showLabel={true}
      />

      <p className="text-xs text-muted-foreground text-center">
        {data.task_count === 0
          ? "Sin tareas programadas"
          : `${data.task_count} tarea${data.task_count !== 1 ? "s" : ""} programada${data.task_count !== 1 ? "s" : ""}`}
      </p>
    </div>
  );
}
