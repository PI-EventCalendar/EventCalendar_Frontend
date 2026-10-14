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

  const limit = Number(data.daily_hour_limit);
  const scheduled = Number(data.total_hours_scheduled);
  const loadPercentage = limit > 0 ? Math.min(100, Math.max(0, scheduled / limit * 100)) : 0;
  const loadLevel =
    loadPercentage >= 80
      ? "Alta"
      : loadPercentage >= 50
        ? "Media"
        : "Baja";

  const loadColor =
    loadPercentage >= 80
      ? "text-destructive"
      : loadPercentage >= 50
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
        completed={data.tasks.filter((task) => task.status === "completed").length}
        total={data.tasks.length}
        showLabel={true}
      />

      <p className="text-xs text-muted-foreground text-center">
        {data.tasks.length === 0
          ? "Sin tareas programadas"
          : `${data.tasks.length} tarea${data.tasks.length !== 1 ? "s" : ""} programada${data.tasks.length !== 1 ? "s" : ""}`}
      </p>
    </div>
  );
}
