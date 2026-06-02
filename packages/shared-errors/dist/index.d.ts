export declare class AppError extends Error {
    readonly statusCode: number;
    readonly code: string;
    readonly isOperational: boolean;
    readonly details?: unknown[] | undefined;
    constructor(message: string, statusCode: number, code: string, isOperational?: boolean, details?: unknown[] | undefined);
}
export declare class NotFoundError extends AppError {
    constructor(message?: string, code?: string);
}
export declare class ConflictError extends AppError {
    constructor(message?: string, code?: string);
}
export declare class ValidationError extends AppError {
    constructor(message: string, details?: unknown[]);
}
export declare class UnauthorizedError extends AppError {
    constructor(message?: string, code?: string);
}
export declare class ForbiddenError extends AppError {
    constructor(message?: string, code?: string);
}
export declare class BadRequestError extends AppError {
    constructor(message: string, details?: unknown[]);
}
export declare class InternalServerError extends AppError {
    constructor(message?: string);
}
export declare class ServiceUnavailableError extends AppError {
    constructor(message?: string);
}
export declare function isAppError(err: unknown): err is AppError;
export declare function fromPrismaError(err: unknown): AppError | null;
