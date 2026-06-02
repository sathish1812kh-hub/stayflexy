// ─── Core response types ──────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
  correlationId?: string;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    statusCode: number;
    details?: unknown[];
  };
  correlationId?: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedSuccess<T> extends ApiSuccess<T[]> {
  meta: PaginationMeta;
}

// ─── Helper functions ─────────────────────────────────────────────────────────

export function successResponse<T>(data: T, correlationId?: string): ApiSuccess<T> {
  return {
    success: true,
    data,
    ...(correlationId !== undefined ? { correlationId } : {}),
  };
}

export function paginatedResponse<T>(
  data: T[],
  meta: PaginationMeta,
  correlationId?: string,
): PaginatedSuccess<T> {
  return {
    success: true,
    data,
    meta,
    ...(correlationId !== undefined ? { correlationId } : {}),
  };
}

export function errorResponse(
  code: string,
  message: string,
  statusCode: number,
  details?: unknown[],
  correlationId?: string,
): ApiError {
  return {
    success: false,
    error: {
      code,
      message,
      statusCode,
      ...(details !== undefined && details.length > 0 ? { details } : {}),
    },
    ...(correlationId !== undefined ? { correlationId } : {}),
  };
}

export function buildPaginationMeta(
  total: number,
  page: number,
  limit: number,
): PaginationMeta {
  const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}
