import jwt from 'jsonwebtoken'
import type { Request, Response, NextFunction } from 'express'
import { parse, Kind, type OperationDefinitionNode } from 'graphql'

interface JwtPayload {
  sub: string
  organizationId?: string
  primaryRole: string
  iat: number
  exp: number
}

interface PublicRoute {
  method: string
  path: RegExp
}

// Public routes that do not require authentication
const PUBLIC_ROUTES: PublicRoute[] = [
  { method: 'POST', path: /^\/api\/v1\/auth\/register$/ },
  { method: 'POST', path: /^\/api\/v1\/auth\/login$/ },
  { method: 'POST', path: /^\/api\/v1\/auth\/refresh$/ },
  { method: 'GET', path: /^\/health/ },
  { method: 'GET', path: /^\/metrics$/ },
]

export function createAuthMiddleware(jwtSecret: string, serviceKey: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Check if route is public
    const isPublic = PUBLIC_ROUTES.some(
      (route) => req.method === route.method && route.path.test(req.path),
    )
    if (isPublic) {
      next()
      return
    }

    // Service-to-service calls via X-Service-Key header
    const serviceKeyHeader = req.headers['x-service-key']
    if (serviceKeyHeader === serviceKey) {
      next()
      return
    }

    // JWT validation
    const authHeader = req.headers['authorization']
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or invalid authorization header',
          statusCode: 401,
        },
      })
      return
    }

    const token = authHeader.slice(7)
    try {
      const payload = jwt.verify(token, jwtSecret) as JwtPayload

      // Inject user context headers for downstream services
      req.headers['x-user-id'] = payload.sub
      req.headers['x-user-role'] = payload.primaryRole
      if (payload.organizationId) {
        req.headers['x-organization-id'] = payload.organizationId
      }
      next()
    } catch (error) {
      const message = error instanceof jwt.TokenExpiredError ? 'Token expired' : 'Invalid token'
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message, statusCode: 401 },
      })
    }
  }
}

// GraphQL root fields reachable WITHOUT authentication. Everything else on
// /graphql requires a valid JWT, exactly like the REST proxy. Kept minimal:
// `login` is the only operation a client must call before it holds a token.
const PUBLIC_GRAPHQL_FIELDS = new Set(['login'])

/**
 * Returns true only when the request executes exclusively public root fields
 * (see PUBLIC_GRAPHQL_FIELDS). Any unparseable body, ambiguous multi-operation
 * request, or presence of a single non-public root field returns false so the
 * caller falls back to requiring a valid token. This is what lets `login` be
 * called before the client holds a token without opening any other operation.
 */
function isPublicGraphQLRequest(body: unknown): boolean {
  if (!body || typeof body !== 'object') return false
  const { query, operationName } = body as { query?: unknown; operationName?: unknown }
  if (typeof query !== 'string') return false

  let doc
  try {
    doc = parse(query)
  } catch {
    return false
  }

  const operations = doc.definitions.filter(
    (d): d is OperationDefinitionNode => d.kind === Kind.OPERATION_DEFINITION,
  )
  if (operations.length === 0) return false

  // With multiple operations, GraphQL requires operationName to disambiguate.
  const op =
    typeof operationName === 'string'
      ? operations.find((o) => o.name?.value === operationName)
      : operations.length === 1
        ? operations[0]
        : undefined
  if (!op) return false

  const selections = op.selectionSet.selections
  if (selections.length === 0) return false
  return selections.every(
    (sel) => sel.kind === Kind.FIELD && PUBLIC_GRAPHQL_FIELDS.has(sel.name.value),
  )
}

/**
 * Auth for the GraphQL endpoint. Validates the Bearer token when present and
 * injects the downstream x-user-* headers. Requests without a valid token are
 * rejected with 401 UNLESS they execute only public operations (login) — the
 * same protection the REST proxy applies, carved out just enough that a client
 * can obtain a token in the first place.
 *
 * Client-supplied x-user-* headers are always stripped first so identity can
 * only ever come from a verified token — never from a spoofed request header.
 */
export function createGraphQLAuthMiddleware(jwtSecret: string, serviceKey: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Trust internal service-to-service calls as-is.
    if (req.headers['x-service-key'] === serviceKey) {
      next()
      return
    }

    // Never trust identity headers supplied by an external client.
    delete req.headers['x-user-id']
    delete req.headers['x-user-role']
    delete req.headers['x-organization-id']

    const authHeader = req.headers['authorization']
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const payload = jwt.verify(authHeader.slice(7), jwtSecret) as JwtPayload
        req.headers['x-user-id'] = payload.sub
        req.headers['x-user-role'] = payload.primaryRole
        if (payload.organizationId) {
          req.headers['x-organization-id'] = payload.organizationId
        }
        next()
        return
      } catch {
        // Invalid token → only public operations may proceed (checked below).
      }
    }

    if (isPublicGraphQLRequest(req.body)) {
      next()
      return
    }

    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required', statusCode: 401 },
    })
  }
}
