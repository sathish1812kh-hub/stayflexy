export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string,
    public readonly isOperational = true,
    public readonly details?: unknown[]
  ) {
    super(message)
    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor)
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', code = 'NOT_FOUND') {
    super(message, 404, code)
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists', code = 'CONFLICT') {
    super(message, 409, code)
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown[]) {
    super(message, 422, 'VALIDATION_ERROR', true, details)
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', code = 'UNAUTHORIZED') {
    super(message, 401, code)
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', code = 'FORBIDDEN') {
    super(message, 403, code)
  }
}

export class BadRequestError extends AppError {
  constructor(message: string, details?: unknown[]) {
    super(message, 400, 'BAD_REQUEST', true, details)
  }
}

export class InternalServerError extends AppError {
  constructor(message = 'Internal server error') {
    super(message, 500, 'INTERNAL_ERROR', false)
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message = 'Service temporarily unavailable') {
    super(message, 503, 'SERVICE_UNAVAILABLE')
  }
}

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError
}

// Prisma error to AppError mapping
export function fromPrismaError(err: unknown): AppError | null {
  if (typeof err !== 'object' || err === null) return null
  const e = err as Record<string, unknown>
  if (e['code'] === 'P2002')
    return new ConflictError('Resource already exists', 'DUPLICATE_ENTRY')
  if (e['code'] === 'P2025') return new NotFoundError('Record not found')
  if (e['code'] === 'P2003')
    return new BadRequestError('Foreign key constraint failed')
  if (e['code'] === 'P2014') return new BadRequestError('Relation violation')
  return null
}
