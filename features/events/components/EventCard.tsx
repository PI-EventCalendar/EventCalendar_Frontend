"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "./ProgressBar";
import type { Event, EventStatus } from "../types";
import { CalendarDays, MapPin, Trash2, Pencil } from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<EventStatus, string> = {
  draft: "Borrador",
  active: "Activo",
  completed: "Completado",
  cancelled: "Cancelado",
};

const STATUS_VARIANT: Record<EventStatus, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "secondary",
  active: "default",
  completed: "outline",
  cancelled: "destructive",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-CO", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface EventCardProps {
  event: Event;
  onEdit?: (event: Event) => void;
  onDelete?: (id: number) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EventCard({ event, onEdit, onDelete }: EventCardProps) {
  return (
    <Card className="flex flex-col hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base font-semibold leading-snug line-clamp-2">
            {event.title}
          </CardTitle>
          <Badge variant={STATUS_VARIANT[event.status]} className="shrink-0">
            {STATUS_LABELS[event.status]}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-3">
        {event.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{event.description}</p>
        )}

        <div className="space-y-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5 shrink-0" />
            <span>
              {formatDate(event.start_date)} — {formatDate(event.end_date)}
            </span>
          </div>
          {event.location && (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{event.location}</span>
            </div>
          )}
        </div>

        <ProgressBar
          completed={event.completed_task_count}
          total={event.task_count}
        />
      </CardContent>

      <CardFooter className="pt-3 gap-2">
        {onEdit && (
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onEdit(event)}
            aria-label={`Editar evento ${event.title}`}
          >
            <Pencil className="h-3.5 w-3.5 mr-1" />
            Editar
          </Button>
        )}
        {onDelete && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onDelete(event.id)}
            aria-label={`Eliminar evento ${event.title}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
