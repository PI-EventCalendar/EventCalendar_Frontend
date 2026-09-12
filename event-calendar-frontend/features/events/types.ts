export type EventStatus = "draft" | "active" | "completed" | "cancelled";

export interface Event {
  id: number;
  title: string;
  description: string;
  start_date: string;    // ISO 8601
  end_date: string;      // ISO 8601
  location: string;
  status: EventStatus;
  owner: number;         // user id
  task_count: number;
  completed_task_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateEventPayload {
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  location?: string;
  status?: EventStatus;
}

export type UpdateEventPayload = Partial<CreateEventPayload>;
