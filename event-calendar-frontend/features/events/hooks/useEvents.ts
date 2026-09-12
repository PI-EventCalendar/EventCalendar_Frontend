import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
} from "../services/eventService";
import type { CreateEventPayload, UpdateEventPayload } from "../types";

export const EVENTS_QUERY_KEY = ["events"] as const;
export const eventQueryKey = (id: number) => ["events", id] as const;

/** Hook para listar todos los eventos */
export function useEvents() {
  return useQuery({
    queryKey: EVENTS_QUERY_KEY,
    queryFn: getEvents,
  });
}

/** Hook para obtener un evento por ID */
export function useEvent(id: number) {
  return useQuery({
    queryKey: eventQueryKey(id),
    queryFn: () => getEventById(id),
    enabled: !!id,
  });
}

/** Hook para crear un evento */
export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateEventPayload) => createEvent(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: EVENTS_QUERY_KEY }),
  });
}

/** Hook para actualizar un evento */
export function useUpdateEvent(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateEventPayload) => updateEvent(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EVENTS_QUERY_KEY });
      qc.invalidateQueries({ queryKey: eventQueryKey(id) });
    },
  });
}

/** Hook para eliminar un evento */
export function useDeleteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteEvent(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: EVENTS_QUERY_KEY }),
  });
}
