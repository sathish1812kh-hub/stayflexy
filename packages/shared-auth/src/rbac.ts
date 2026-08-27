// ─── RBAC enforcement primitives ───────────────────────────────────────────────
// Dependency-free permission middleware shared by all microservices.
//
// Contract: the gateway/BFF resolves a user's effective permissions (Redis-cached,
// invalidated on role change) and forwards them on the `x-permissions` header as a
// comma-separated list of `resource:action` keys. Services enforce locally with
// requirePermission() after their authMiddleware has populated req.user.
//
// Wildcard semantics (identical to auth-service ManageRoles):
//   '*'            → all permissions
//   'resource:*'   → every action on the resource
//   'resource:act' → exact match

// Structural Express-compatible types (keeps this package dependency-free).
interface RhHeaders {
  [key: string]: string | string[] | undefined
}
interface RhUser {
  userId: string
  primaryRole: string
  isServiceCall: boolean
}
interface Rh {
  headers: RhHeaders
  user?: RhUser
}
interface Rs {
  status(code: number): { json(body: unknown): void }
}
type NextFn = () => void

export const PERMISSIONS_HEADER = 'x-permissions'

export interface RequirePermissionOptions {
  /** Header carrying the permission keys. Default: 'x-permissions'. */
  permissionsHeader?: string
  /** Role that bypasses all permission checks. Default: 'SUPER_ADMIN'. */
  superAdminRole?: string
}

/** Parse the comma-separated permissions header into a deduped key list. */
export function parsePermissionsHeader(value: string | string[] | undefined): string[] {
  const raw = Array.isArray(value) ? value.join(',') : value
  if (!raw) return []
  const keys = raw
    .split(',')
    .map((k) => k.trim())
    .filter((k) => k.length > 0)
  return Array.from(new Set(keys))
}

/** Serialize permission keys for the x-permissions header. */
export function buildPermissionsHeader(keys: string[]): string {
  return Array.from(new Set(keys)).join(',')
}

/** Wildcard-aware permission check: '*', 'resource:*', or exact 'resource:action'. */
export function hasPermission(keys: string[], resource: string, action: string): boolean {
  return (
    keys.includes('*') || keys.includes(`${resource}:*`) || keys.includes(`${resource}:${action}`)
  )
}

/**
 * Express middleware enforcing `resource:action` for the authenticated user.
 * Must run AFTER the service's authMiddleware (requires req.user).
 *
 * Bypass: service-to-service calls (isServiceCall) and the super-admin role.
 * Errors mirror the platform error shape:
 *   { success: false, error: { code, message, statusCode } }
 */
export function requirePermission(
  resource: string,
  action: string,
  options: RequirePermissionOptions = {},
): (req: Rh, res: Rs, next: NextFn) => void {
  const headerName = options.permissionsHeader ?? PERMISSIONS_HEADER
  const superAdminRole = options.superAdminRole ?? 'SUPER_ADMIN'

  return (req, res, next) => {
    const user = req.user
    if (!user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          statusCode: 401,
        },
      })
      return
    }

    if (user.isServiceCall || user.primaryRole === superAdminRole) {
      next()
      return
    }

    const keys = parsePermissionsHeader(req.headers[headerName])
    if (hasPermission(keys, resource, action)) {
      next()
      return
    }

    res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: `You do not have permission to perform "${action}" on "${resource}"`,
        statusCode: 403,
      },
    })
  }
}
