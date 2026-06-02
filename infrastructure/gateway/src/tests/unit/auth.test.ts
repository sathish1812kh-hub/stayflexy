import jwt from 'jsonwebtoken'
import { createAuthMiddleware } from '../../middleware/auth'

const SECRET = 'test-secret-key'
const SERVICE_KEY = 'test-service-key-xyz'

function makeReq(method: string, path: string, headers: Record<string, string> = {}) {
  return { headers: { ...headers }, method, path }
}

function makeRes() {
  const res = {
    statusCode: 0,
    body: null as unknown,
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  }
  return res
}

describe('createAuthMiddleware', () => {
  const middleware = createAuthMiddleware(SECRET, SERVICE_KEY)

  describe('public routes', () => {
    it('calls next() for POST /api/v1/auth/register', () => {
      const req = makeReq('POST', '/api/v1/auth/register')
      const res = makeRes()
      const next = jest.fn()

      middleware(req as any, res as any, next)

      expect(next).toHaveBeenCalledTimes(1)
      expect(res.status).not.toHaveBeenCalled()
    })

    it('calls next() for POST /api/v1/auth/login', () => {
      const req = makeReq('POST', '/api/v1/auth/login')
      const res = makeRes()
      const next = jest.fn()

      middleware(req as any, res as any, next)

      expect(next).toHaveBeenCalledTimes(1)
      expect(res.status).not.toHaveBeenCalled()
    })

    it('calls next() for POST /api/v1/auth/refresh', () => {
      const req = makeReq('POST', '/api/v1/auth/refresh')
      const res = makeRes()
      const next = jest.fn()

      middleware(req as any, res as any, next)

      expect(next).toHaveBeenCalledTimes(1)
      expect(res.status).not.toHaveBeenCalled()
    })

    it('calls next() for GET /health/live', () => {
      const req = makeReq('GET', '/health/live')
      const res = makeRes()
      const next = jest.fn()

      middleware(req as any, res as any, next)

      expect(next).toHaveBeenCalledTimes(1)
      expect(res.status).not.toHaveBeenCalled()
    })

    it('calls next() for GET /metrics', () => {
      const req = makeReq('GET', '/metrics')
      const res = makeRes()
      const next = jest.fn()

      middleware(req as any, res as any, next)

      expect(next).toHaveBeenCalledTimes(1)
      expect(res.status).not.toHaveBeenCalled()
    })
  })

  describe('service-key bypass', () => {
    it('calls next() when correct service key header is provided on a protected route', () => {
      const req = makeReq('GET', '/api/v1/bookings', { 'x-service-key': SERVICE_KEY })
      const res = makeRes()
      const next = jest.fn()

      middleware(req as any, res as any, next)

      expect(next).toHaveBeenCalledTimes(1)
      expect(res.status).not.toHaveBeenCalled()
    })
  })

  describe('JWT validation', () => {
    it('calls next() and injects x-user-id, x-user-role for valid JWT', () => {
      const token = jwt.sign(
        { sub: 'user-123', primaryRole: 'admin', iat: Math.floor(Date.now() / 1000) },
        SECRET,
        { expiresIn: '1h' }
      )
      const req = makeReq('GET', '/api/v1/bookings', { authorization: `Bearer ${token}` })
      const res = makeRes()
      const next = jest.fn()

      middleware(req as any, res as any, next)

      expect(next).toHaveBeenCalledTimes(1)
      expect(req.headers['x-user-id']).toBe('user-123')
      expect(req.headers['x-user-role']).toBe('admin')
    })

    it('also injects x-organization-id when JWT contains organizationId', () => {
      const token = jwt.sign(
        { sub: 'user-456', primaryRole: 'staff', organizationId: 'org-789', iat: Math.floor(Date.now() / 1000) },
        SECRET,
        { expiresIn: '1h' }
      )
      const req = makeReq('GET', '/api/v1/bookings', { authorization: `Bearer ${token}` })
      const res = makeRes()
      const next = jest.fn()

      middleware(req as any, res as any, next)

      expect(next).toHaveBeenCalledTimes(1)
      expect(req.headers['x-user-id']).toBe('user-456')
      expect(req.headers['x-user-role']).toBe('staff')
      expect(req.headers['x-organization-id']).toBe('org-789')
    })
  })

  describe('unauthorized cases', () => {
    it('returns 401 when Authorization header is missing on a protected route', () => {
      const req = makeReq('GET', '/api/v1/bookings')
      const res = makeRes()
      const next = jest.fn()

      middleware(req as any, res as any, next)

      expect(next).not.toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({ code: 'UNAUTHORIZED', statusCode: 401 }),
        })
      )
    })

    it('returns 401 when Authorization header is not Bearer scheme', () => {
      const req = makeReq('GET', '/api/v1/bookings', { authorization: 'Basic dXNlcjpwYXNz' })
      const res = makeRes()
      const next = jest.fn()

      middleware(req as any, res as any, next)

      expect(next).not.toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('returns 401 for an invalid JWT token', () => {
      const req = makeReq('GET', '/api/v1/bookings', { authorization: 'Bearer not.a.valid.token' })
      const res = makeRes()
      const next = jest.fn()

      middleware(req as any, res as any, next)

      expect(next).not.toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('returns 401 with "Token expired" message for an expired JWT', () => {
      const token = jwt.sign(
        { sub: 'user-999', primaryRole: 'guest', iat: Math.floor(Date.now() / 1000) - 7200 },
        SECRET,
        { expiresIn: -1 }
      )
      const req = makeReq('GET', '/api/v1/bookings', { authorization: `Bearer ${token}` })
      const res = makeRes()
      const next = jest.fn()

      middleware(req as any, res as any, next)

      expect(next).not.toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ message: 'Token expired' }),
        })
      )
    })
  })
})
