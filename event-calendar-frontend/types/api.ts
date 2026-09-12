/** Respuesta genérica paginada del backend Django (DRF PageNumberPagination) */
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/** Respuesta de error estándar de DRF */
export interface ApiError {
  detail?: string;
  [field: string]: string | string[] | undefined;
}
