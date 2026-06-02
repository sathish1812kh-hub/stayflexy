import { AppError, type ErrorCode } from "./AppError";

export class BadRequestError extends AppError {
  constructor(message = "Bad request", details?: unknown) {
    super({ message, code: "BAD_REQUEST", statusCode: 400, details });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized", details?: unknown) {
    super({ message, code: "UNAUTHORIZED", statusCode: 401, details });
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden", details?: unknown) {
    super({ message, code: "FORBIDDEN", statusCode: 403, details });
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found", details?: unknown) {
    super({ message, code: "NOT_FOUND", statusCode: 404, details });
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflict", details?: unknown) {
    super({ message, code: "CONFLICT", statusCode: 409, details });
  }
}

export class ValidationError extends AppError {
  constructor(message = "Validation failed", details?: unknown) {
    super({ message, code: "VALIDATION_ERROR", statusCode: 422, details });
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = "Too many requests", details?: unknown) {
    super({ message, code: "TOO_MANY_REQUESTS", statusCode: 429, details });
  }
}

export class InternalServerError extends AppError {
  constructor(message = "Internal server error", cause?: Error) {
    super({ message, code: "INTERNAL_SERVER_ERROR", statusCode: 500, cause });
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message = "Service unavailable", details?: unknown) {
    super({ message, code: "SERVICE_UNAVAILABLE", statusCode: 503, details });
  }
}

export const HTTP_STATUS_TO_ERROR_CODE: Record<number, ErrorCode> = {
  400: "BAD_REQUEST",
  401: "UNAUTHORIZED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  422: "VALIDATION_ERROR",
  429: "TOO_MANY_REQUESTS",
  500: "INTERNAL_SERVER_ERROR",
  503: "SERVICE_UNAVAILABLE",
};
