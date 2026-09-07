import crypto from 'crypto'

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

export interface ServiceTokenClaims {
  iss: string
  aud: string
  orgId?: string
  role?: string
}

export function signServiceToken(
  claims: ServiceTokenClaims,
  secret: string,
  expiresInSeconds: number = 300,
): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const now = Math.floor(Date.now() / 1000)
  const payloadData = {
    ...claims,
    role: claims.role ?? 'SERVICE',
    iat: now,
    exp: now + expiresInSeconds,
  }
  const payload = Buffer.from(JSON.stringify(payloadData)).toString('base64url')
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${header}.${payload}`)
    .digest('base64url')
  return `${header}.${payload}.${signature}`
}

export function verifyServiceToken(
  token: string,
  secret: string,
  expectedAudience?: string,
): (ServiceTokenClaims & { role: string; exp?: number }) | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const [header, payload, signature] = parts
    if (!header || !payload || !signature) return null
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(`${header}.${payload}`)
      .digest('base64url')
    if (signature !== expectedSig) return null
    const decoded = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8'),
    ) as ServiceTokenClaims & {
      role: string
      exp?: number
    }
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) return null
    if (expectedAudience && decoded.aud !== '*' && decoded.aud !== expectedAudience) {
      return null
    }
    return decoded
  } catch {
    return null
  }
}

// Extract from Express request headers (x-user-id, x-organization-id, x-user-role, x-correlation-id, x-service-key, x-service-token)
export function extractAuthUser(
  headers: Record<string, string | string[] | undefined>,
  serviceKey: string,
  expectedAudience?: string,
): AuthUser | null {
  const correlationId =
    (Array.isArray(headers['x-correlation-id'])
      ? headers['x-correlation-id'][0]
      : headers['x-correlation-id']) ?? ''

  // 1. Scoped S2S JWT token support (ADR-002)
  const serviceToken = Array.isArray(headers['x-service-token'])
    ? headers['x-service-token'][0]
    : headers['x-service-token']
  if (serviceToken) {
    const verified = verifyServiceToken(serviceToken, serviceKey, expectedAudience)
    if (verified) {
      return {
        userId: verified.iss,
        organizationId: verified.orgId ?? null,
        primaryRole: verified.role ?? 'SERVICE',
        correlationId,
        isServiceCall: true,
      }
    }
  }

  // 2. Legacy S2S Key fallback
  const serviceKeyHeader = Array.isArray(headers['x-service-key'])
    ? headers['x-service-key'][0]
    : headers['x-service-key']
  const orgHeader = Array.isArray(headers['x-organization-id'])
    ? headers['x-organization-id'][0]
    : headers['x-organization-id']

  if (serviceKeyHeader && serviceKeyHeader === serviceKey) {
    return {
      userId: 'service',
      organizationId: orgHeader ?? null,
      primaryRole: 'SERVICE',
      correlationId,
      isServiceCall: true,
    }
  }

  // 3. User session from gateway
  const userId = Array.isArray(headers['x-user-id'])
    ? headers['x-user-id'][0]
    : headers['x-user-id']
  if (!userId) return null
  const role = Array.isArray(headers['x-user-role'])
    ? headers['x-user-role'][0]
    : headers['x-user-role']
  if (!role) return null

  return {
    userId,
    organizationId: orgHeader ?? null,
    primaryRole: role,
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

export function buildPaginationMeta(total: number, page: number, limit: number): PaginationMeta {
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
  query: Record<string, string | string[] | undefined>,
): PaginationParams {
  const page = Math.max(1, parseInt(String(query['page'] ?? '1'), 10))
  const limit = Math.min(100, Math.max(1, parseInt(String(query['limit'] ?? '20'), 10)))
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

export function successResponse<T>(data: T, correlationId?: string): ApiSuccess<T> {
  return { success: true, data, correlationId }
}

// Service-to-service HTTP client
export { ServiceHttpClient, ServiceClientError } from './service-client'
export type { ServiceClientOptions, ServiceRequestOptions } from './service-client'

export function paginatedSuccess<T>(
  data: T[],
  meta: PaginationMeta,
  correlationId?: string,
): ApiSuccess<T[]> & { meta: PaginationMeta } {
  return { success: true, data, meta, correlationId }
}
