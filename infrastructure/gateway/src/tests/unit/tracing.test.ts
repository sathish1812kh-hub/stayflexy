import { EventEmitter } from 'events'
import { tracingMiddleware } from '../../middleware/tracing'

function makeReq(headers: Record<string, string> = {}): {
  headers: Record<string, string | undefined>
  method: string
  path: string
} {
  return { headers, method: 'GET', path: '/test' }
}

function makeRes(): EventEmitter & {
  headers: Record<string, string>
  setHeader(k: string, v: string): void
  getHeader(k: string): string | undefined
} {
  const emitter = new EventEmitter() as EventEmitter & {
    headers: Record<string, string>
    setHeader(k: string, v: string): void
    getHeader(k: string): string | undefined
  }
  emitter.headers = {}
  emitter.setHeader = (k: string, v: string) => {
    emitter.headers[k.toLowerCase()] = v
  }
  emitter.getHeader = (k: string) => emitter.headers[k.toLowerCase()]
  return emitter
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

describe('tracingMiddleware', () => {
  it('propagates x-correlation-id when present in request', () => {
    const req = makeReq({ 'x-correlation-id': 'existing-id-123' })
    const res = makeRes()
    const next = jest.fn()

    tracingMiddleware(req as any, res as any, next)

    expect(req.headers['x-correlation-id']).toBe('existing-id-123')
    expect(res.headers['x-correlation-id']).toBe('existing-id-123')
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('generates a UUID when x-correlation-id header is absent', () => {
    const req = makeReq({})
    const res = makeRes()
    const next = jest.fn()

    tracingMiddleware(req as any, res as any, next)

    const correlationId = req.headers['x-correlation-id']
    expect(correlationId).toBeDefined()
    expect(typeof correlationId).toBe('string')
    expect(UUID_REGEX.test(correlationId as string)).toBe(true)
  })

  it('always sets x-request-id header on the response', () => {
    const req = makeReq({})
    const res = makeRes()
    const next = jest.fn()

    tracingMiddleware(req as any, res as any, next)

    const requestId = res.headers['x-request-id']
    expect(requestId).toBeDefined()
    expect(UUID_REGEX.test(requestId as string)).toBe(true)
  })

  it('sets x-response-time header after response finish event', () => {
    jest.useFakeTimers()
    const req = makeReq({})
    const res = makeRes()
    const next = jest.fn()

    tracingMiddleware(req as any, res as any, next)

    // Advance time before finish
    jest.advanceTimersByTime(50)
    res.emit('finish')

    const responseTime = res.headers['x-response-time']
    expect(responseTime).toBeDefined()
    expect(responseTime).toMatch(/^\d+ms$/)

    jest.useRealTimers()
  })

  it('x-request-id is a different UUID than x-correlation-id when no id provided', () => {
    const req = makeReq({})
    const res = makeRes()
    const next = jest.fn()

    tracingMiddleware(req as any, res as any, next)

    const correlationId = res.headers['x-correlation-id']
    const requestId = res.headers['x-request-id']
    expect(correlationId).not.toBe(requestId)
  })
})
