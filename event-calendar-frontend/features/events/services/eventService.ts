import apiClient from "@/lib/axios";
import type { PaginatedResponse } from "@/types/api";
import type { Event, CreateEventPayload, UpdateEventPayload } from "../types";

/** GET /events/ — lista todos los eventos del usuario autenticado */
export async function getEvents(): Promise<PaginatedResponse<Event>> {
  const { data } = await apiClient.get<PaginatedResponse<Event>>("/events/");
  return data;
}

/** GET /events/{id}/ — obtiene un evento por ID */
export async function getEventById(id: number): Promise<Event> {
  const { data } = await apiClient.get<Event>(`/events/${id}/`);
  return data;
}

/** POST /events/ — crea un nuevo evento */
export async function createEvent(payload: CreateEventPayload): Promise<Event> {
  const { data } = await apiClient.post<Event>("/events/", payload);
  return data;
}

/** PATCH /events/{id}/ — actualiza parcialmente un evento */
export async function updateEvent(id: number, payload: UpdateEventPayload): Promise<Event> {
  const { data } = await apiClient.patch<Event>(`/events/${id}/`, payload);
  return data;
}

/** DELETE /events/{id}/ — elimina un evento */
export async function deleteEvent(id: number): Promise<void> {
  await apiClient.delete(`/events/${id}/`);
}
