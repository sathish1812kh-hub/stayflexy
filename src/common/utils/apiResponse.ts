import { NextResponse } from "next/server";
import type { ErrorCode } from "@errors/AppError";

interface SuccessResponse<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

interface ErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
  };
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export function successResponse<T>(
  data: T,
  statusCode = 200,
  meta?: Record<string, unknown>
): NextResponse<SuccessResponse<T>> {
  return NextResponse.json(
    { success: true, data, ...(meta && { meta }) },
    { status: statusCode }
  );
}

export function createdResponse<T>(
  data: T,
  meta?: Record<string, unknown>
): NextResponse<SuccessResponse<T>> {
  return successResponse(data, 201, meta);
}

export function paginatedResponse<T>(
  data: T[],
  pagination: PaginationMeta
): NextResponse<SuccessResponse<T[]>> {
  return successResponse(data, 200, { pagination });
}

export function errorResponse(
  code: ErrorCode,
  message: string,
  statusCode: number,
  details?: unknown
): NextResponse<ErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error: { code, message, ...(details !== undefined && { details }) },
    },
    { status: statusCode }
  );
}

export function noContentResponse(): NextResponse<never> {
  return new NextResponse(null, { status: 204 });
}
