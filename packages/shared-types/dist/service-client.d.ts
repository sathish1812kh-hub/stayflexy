export interface ServiceClientOptions {
    baseUrl: string;
    serviceKey: string;
    timeoutMs?: number;
    maxRetries?: number;
    retryDelayMs?: number;
}
export interface ServiceRequestOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    path: string;
    body?: unknown;
    correlationId?: string;
    organizationId?: string;
    userId?: string;
    userRole?: string;
}
export declare class ServiceClientError extends Error {
    readonly statusCode: number;
    readonly responseBody: unknown;
    constructor(message: string, statusCode: number, responseBody: unknown);
}
/**
 * Lightweight HTTP client for service-to-service calls.
 * Propagates correlation ID, auth headers, and service key.
 * Retries transient 5xx and network errors with exponential backoff.
 */
export declare class ServiceHttpClient {
    private readonly options;
    private readonly timeoutMs;
    private readonly maxRetries;
    private readonly retryDelayMs;
    constructor(options: ServiceClientOptions);
    request<T>(opts: ServiceRequestOptions): Promise<T>;
    get<T>(path: string, opts?: Omit<ServiceRequestOptions, 'method' | 'path'>): Promise<T>;
    post<T>(path: string, body: unknown, opts?: Omit<ServiceRequestOptions, 'method' | 'path' | 'body'>): Promise<T>;
    patch<T>(path: string, body: unknown, opts?: Omit<ServiceRequestOptions, 'method' | 'path' | 'body'>): Promise<T>;
    private doRequest;
    private sleep;
}
