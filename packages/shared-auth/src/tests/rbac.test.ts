import {
  PERMISSIONS_HEADER,
  buildPermissionsHeader,
  hasPermission,
  parsePermissionsHeader,
  requirePermission,
} from '../index'

interface MockResponse {
  statusCode?: number
  body?: unknown
  status(code: number): { json(body: unknown): void }
}

function makeRes(): MockResponse & { status(code: number): { json(body: unknown): void } } {
  return {
    status(code: number) {
      this.statusCode = code
      return {
        json: (body: unknown) => {
          this.body = body
        },
      }
    },
  }
}

function makeReq(
  headers: Record<string, string | string[] | undefined> = {},
  user?: { userId: string; primaryRole: string; isServiceCall: boolean },
): { headers: Record<string, string | string[] | undefined>; user?: typeof user } {
  return { headers, user }
}

describe('hasPermission', () => {
  it('matches exact resource:action', () => {
    expect(hasPermission(['booking:create'], 'booking', 'create')).toBe(true)
  })

  it('matches resource-level wildcard', () => {
    expect(hasPermission(['booking:*'], 'booking', 'cancel')).toBe(true)
  })

  it('matches global wildcard', () => {
    expect(hasPermission(['*'], 'anything', 'atall')).toBe(true)
  })

  it('rejects missing permission', () => {
    expect(hasPermission(['booking:read'], 'booking', 'create')).toBe(false)
    expect(hasPermission([], 'booking', 'read')).toBe(false)
  })

  it('does not let a different resource wildcard leak', () => {
    expect(hasPermission(['payment:*'], 'booking', 'read')).toBe(false)
  })
})

describe('parsePermissionsHeader / buildPermissionsHeader', () => {
  it('parses comma-separated keys and trims whitespace', () => {
    expect(parsePermissionsHeader('booking:read, booking:create ,  hotel:*')).toEqual([
      'booking:read',
      'booking:create',
      'hotel:*',
    ])
  })

  it('returns empty array for undefined/empty values', () => {
    expect(parsePermissionsHeader(undefined)).toEqual([])
    expect(parsePermissionsHeader('')).toEqual([])
    expect(parsePermissionsHeader('  ')).toEqual([])
  })

  it('handles array-typed headers and dedupes', () => {
    expect(parsePermissionsHeader(['a:b', 'a:b', 'c:d'])).toEqual(['a:b', 'c:d'])
  })

  it('builds a header string', () => {
    expect(buildPermissionsHeader(['booking:read', 'hotel:*'])).toBe('booking:read,hotel:*')
  })

  it('exposes the default header name', () => {
    expect(PERMISSIONS_HEADER).toBe('x-permissions')
  })
})

describe('requirePermission middleware', () => {
  const next = jest.fn()

  beforeEach(() => {
    next.mockClear()
  })

  function errBody(res: MockResponse): {
    success: boolean
    error: { code: string; message: string; statusCode: number }
  } {
    return res.body as {
      success: boolean
      error: { code: string; message: string; statusCode: number }
    }
  }

  it('401s when req.user is missing (no authMiddleware)', () => {
    const mw = requirePermission('booking', 'create')
    const req = makeReq({ 'x-permissions': '*' })
    const res = makeRes()
    mw(req, res, next)
    expect(next).not.toHaveBeenCalled()
    expect(res.statusCode).toBe(401)
    expect(errBody(res).error.code).toBe('UNAUTHORIZED')
  })

  it('bypasses service-to-service calls', () => {
    const mw = requirePermission('booking', 'create')
    const req = makeReq({}, { userId: 'svc', primaryRole: 'SERVICE', isServiceCall: true })
    mw(req, makeRes(), next)
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('bypasses the super-admin role', () => {
    const mw = requirePermission('booking', 'create')
    const req = makeReq({}, { userId: 'u1', primaryRole: 'SUPER_ADMIN', isServiceCall: false })
    mw(req, makeRes(), next)
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('allows a user with the exact permission', () => {
    const mw = requirePermission('booking', 'create')
    const req = makeReq(
      { 'x-permissions': 'booking:read,booking:create' },
      { userId: 'u2', primaryRole: 'FRONT_DESK', isServiceCall: false },
    )
    mw(req, makeRes(), next)
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('allows a user with a resource-level wildcard', () => {
    const mw = requirePermission('booking', 'update')
    const req = makeReq(
      { 'x-permissions': 'booking:*' },
      { userId: 'u3', primaryRole: 'ORG_ADMIN', isServiceCall: false },
    )
    mw(req, makeRes(), next)
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('403s when the permission is missing', () => {
    const mw = requirePermission('booking', 'delete')
    const req = makeReq(
      { 'x-permissions': 'booking:read' },
      { userId: 'u4', primaryRole: 'FRONT_DESK', isServiceCall: false },
    )
    const res = makeRes()
    mw(req, res, next)
    expect(next).not.toHaveBeenCalled()
    expect(res.statusCode).toBe(403)
    expect(errBody(res).error.code).toBe('FORBIDDEN')
    expect(errBody(res).error.message).toContain('delete')
  })

  it('403s when the permissions header is absent', () => {
    const mw = requirePermission('hotel', 'create')
    const req = makeReq({}, { userId: 'u5', primaryRole: 'FRONT_DESK', isServiceCall: false })
    const res = makeRes()
    mw(req, res, next)
    expect(next).not.toHaveBeenCalled()
    expect(res.statusCode).toBe(403)
  })

  it('honors a custom header name', () => {
    const mw = requirePermission('room', 'read', { permissionsHeader: 'x-p' })
    const allowed = makeReq(
      { 'x-p': 'room:read' },
      { userId: 'u6', primaryRole: 'STAFF', isServiceCall: false },
    )
    mw(allowed, makeRes(), next)
    expect(next).toHaveBeenCalledTimes(1)

    next.mockClear()
    const denied = makeReq(
      { 'x-permissions': 'room:read' },
      { userId: 'u6', primaryRole: 'STAFF', isServiceCall: false },
    )
    const res = makeRes()
    mw(denied, res, next)
    expect(next).not.toHaveBeenCalled()
    expect(res.statusCode).toBe(403)
  })
})
