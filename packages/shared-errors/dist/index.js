"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceUnavailableError = exports.InternalServerError = exports.BadRequestError = exports.ForbiddenError = exports.UnauthorizedError = exports.ValidationError = exports.ConflictError = exports.NotFoundError = exports.AppError = void 0;
exports.isAppError = isAppError;
exports.fromPrismaError = fromPrismaError;
class AppError extends Error {
    statusCode;
    code;
    isOperational;
    details;
    constructor(message, statusCode, code, isOperational = true, details) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = isOperational;
        this.details = details;
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
class NotFoundError extends AppError {
    constructor(message = 'Resource not found', code = 'NOT_FOUND') {
        super(message, 404, code);
    }
}
exports.NotFoundError = NotFoundError;
class ConflictError extends AppError {
    constructor(message = 'Resource already exists', code = 'CONFLICT') {
        super(message, 409, code);
    }
}
exports.ConflictError = ConflictError;
class ValidationError extends AppError {
    constructor(message, details) {
        super(message, 422, 'VALIDATION_ERROR', true, details);
    }
}
exports.ValidationError = ValidationError;
class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized', code = 'UNAUTHORIZED') {
        super(message, 401, code);
    }
}
exports.UnauthorizedError = UnauthorizedError;
class ForbiddenError extends AppError {
    constructor(message = 'Forbidden', code = 'FORBIDDEN') {
        super(message, 403, code);
    }
}
exports.ForbiddenError = ForbiddenError;
class BadRequestError extends AppError {
    constructor(message, details) {
        super(message, 400, 'BAD_REQUEST', true, details);
    }
}
exports.BadRequestError = BadRequestError;
class InternalServerError extends AppError {
    constructor(message = 'Internal server error') {
        super(message, 500, 'INTERNAL_ERROR', false);
    }
}
exports.InternalServerError = InternalServerError;
class ServiceUnavailableError extends AppError {
    constructor(message = 'Service temporarily unavailable') {
        super(message, 503, 'SERVICE_UNAVAILABLE');
    }
}
exports.ServiceUnavailableError = ServiceUnavailableError;
function isAppError(err) {
    return err instanceof AppError;
}
// Prisma error to AppError mapping
function fromPrismaError(err) {
    if (typeof err !== 'object' || err === null)
        return null;
    const e = err;
    if (e['code'] === 'P2002')
        return new ConflictError('Resource already exists', 'DUPLICATE_ENTRY');
    if (e['code'] === 'P2025')
        return new NotFoundError('Record not found');
    if (e['code'] === 'P2003')
        return new BadRequestError('Foreign key constraint failed');
    if (e['code'] === 'P2014')
        return new BadRequestError('Relation violation');
    return null;
}
