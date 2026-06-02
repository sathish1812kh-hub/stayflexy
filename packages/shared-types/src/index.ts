// Service identity
export type ServiceName =
  | 'auth-service'
  | 'organization-service'
  | 'hotel-service'
  | 'inventory-service'
  | 'booking-service'
  | 'payment-service'
  | 'ota-service'
  | 'analytics-service'
  | 'notification-service'
  | 'workflow-service'
  | 'api-gateway'

// Auth context injected by API gateway via headers
export interface AuthUser {
  userId: string
  organizationId: string | null
  primaryRole: string
  correlationId: string
  isServiceCall: boolean
}

// Extract from Express request headers (x-user-id, x-organization-id, x-user-role, x-correlation-id, x-service-key)
export function extractAuthUser(
  headers: Record<string, string | string[] | undefined>,
  serviceKey: string
): AuthUser | null {
  const userId = Array.isArray(headers['x-user-id'])
    ? headers['x-user-id'][0]
    : headers['x-user-id']
  const correlationId =
    (Array.isArray(headers['x-correlation-id'])
      ? headers['x-correlation-id'][0]
      : headers['x-correlation-id']) ?? ''
  const serviceKeyHeader = Array.isArray(headers['x-service-key'])
    ? headers['x-service-key'][0]
    : headers['x-service-key']

  if (serviceKeyHeader && serviceKeyHeader === serviceKey) {
    return {
      userId: 'service',
      organizationId: null,
      primaryRole: 'SERVICE',
      correlationId,
      isServiceCall: true,
    }
  }
  if (!userId) return null
  const orgId = Array.isArray(headers['x-organization-id'])
    ? headers['x-organization-id'][0]
    : headers['x-organization-id']
  const role = Array.isArray(headers['x-user-role'])
    ? headers['x-user-role'][0]
    : headers['x-user-role']
  return {
    userId,
    organizationId: orgId ?? null,
    primaryRole: role ?? 'FRONT_DESK',
    correlationId,
    isServiceCall: false,
  }
}

// Event envelope
export interface ServiceEvent<T = unknown> {
  eventId: string
  eventType: string
  aggregateId: string
  aggregateType: string
  organizationId: string
  version: number
  timestamp: string
  correlationId?: string
  causationId?: string
  payload: T
  metadata?: Record<string, unknown>
}

// Pagination
export interface PaginationParams {
  page: number
  limit: number
}

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export interface PaginatedResult<T> {
  data: T[]
  meta: PaginationMeta
}

export function buildPaginationMeta(
  total: number,
  page: number,
  limit: number
): PaginationMeta {
  const totalPages = Math.ceil(total / limit)
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  }
}

export function parsePaginationParams(
  query: Record<string, string | string[] | undefined>
): PaginationParams {
  const page = Math.max(1, parseInt(String(query['page'] ?? '1'), 10))
  const limit = Math.min(
    100,
    Math.max(1, parseInt(String(query['limit'] ?? '20'), 10))
  )
  return { page, limit }
}

// API response shapes
export interface ApiSuccess<T> {
  success: true
  data: T
  meta?: PaginationMeta
  correlationId?: string
}

export interface ApiError {
  success: false
  error: {
    code: string
    message: string
    statusCode: number
    details?: unknown[]
  }
  correlationId?: string
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError

export function successResponse<T>(
  data: T,
  correlationId?: string
): ApiSuccess<T> {
  return { success: true, data, correlationId }
}

// Service-to-service HTTP client
export { ServiceHttpClient, ServiceClientError } from './service-client'
export type { ServiceClientOptions, ServiceRequestOptions } from './service-client'

export function paginatedSuccess<T>(
  data: T[],
  meta: PaginationMeta,
  correlationId?: string
): ApiSuccess<T[]> & { meta: PaginationMeta } {
  return { success: true, data, meta, correlationId }
}
