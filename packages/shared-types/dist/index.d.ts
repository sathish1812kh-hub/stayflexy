export type ServiceName = 'auth-service' | 'organization-service' | 'hotel-service' | 'inventory-service' | 'booking-service' | 'payment-service' | 'ota-service' | 'analytics-service' | 'notification-service' | 'workflow-service' | 'api-gateway';
export interface AuthUser {
    userId: string;
    organizationId: string | null;
    primaryRole: string;
    correlationId: string;
    isServiceCall: boolean;
}
export declare function extractAuthUser(headers: Record<string, string | string[] | undefined>, serviceKey: string): AuthUser | null;
export interface ServiceEvent<T = unknown> {
    eventId: string;
    eventType: string;
    aggregateId: string;
    aggregateType: string;
    organizationId: string;
    version: number;
    timestamp: string;
    correlationId?: string;
    causationId?: string;
    payload: T;
    metadata?: Record<string, unknown>;
}
export interface PaginationParams {
    page: number;
    limit: number;
}
export interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
}
export interface PaginatedResult<T> {
    data: T[];
    meta: PaginationMeta;
}
export declare function buildPaginationMeta(total: number, page: number, limit: number): PaginationMeta;
export declare function parsePaginationParams(query: Record<string, string | string[] | undefined>): PaginationParams;
export interface ApiSuccess<T> {
    success: true;
    data: T;
    meta?: PaginationMeta;
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
export declare function successResponse<T>(data: T, correlationId?: string): ApiSuccess<T>;
export { ServiceHttpClient, ServiceClientError } from './service-client';
export type { ServiceClientOptions, ServiceRequestOptions } from './service-client';
export declare function paginatedSuccess<T>(data: T[], meta: PaginationMeta, correlationId?: string): ApiSuccess<T[]> & {
    meta: PaginationMeta;
};
