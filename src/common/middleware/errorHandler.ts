import { type NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "@errors/AppError";
import { errorResponse } from "@utils/apiResponse";
import { logger } from "@utils/logger";

export function handleRouteError(error: unknown): NextResponse {
  if (error instanceof AppError) {
    if (error.statusCode >= 500) {
      logger.error(error.message, error instanceof Error ? error : undefined, undefined, error.code);
    }
    return errorResponse(error.code, error.message, error.statusCode, error.details);
  }

  if (error instanceof ZodError) {
    const details = error.errors.map((e) => ({
      field: e.path.join("."),
      message: e.message,
    }));
    return errorResponse("VALIDATION_ERROR", "Validation failed", 422, details);
  }

  const unknownError = error instanceof Error ? error : new Error(String(error));
  logger.error("Unhandled error", unknownError);

  return errorResponse(
    "INTERNAL_SERVER_ERROR",
    "An unexpected error occurred",
    500
  );
}
