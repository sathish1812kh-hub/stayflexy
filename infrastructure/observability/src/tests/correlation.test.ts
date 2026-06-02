import { correlationMiddleware, getCorrelationId } from '../correlation'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function makeReq(headers: Record<string, string | string[] | undefined> = {}) {
  return { headers } as { headers: Record<string, string | string[] | undefined> } & Record<string, unknown>
}

function makeRes() {
  const headers: Record<string, string> = {}
  return {
    headers,
    setHeader(k: string, v: string) { headers[k.toLowerCase()] = v },
  }
}

describe('getCorrelationId', () => {
  it('returns "no-context" when called outside any AsyncLocalStorage context', () => {
    expect(getCorrelationId()).toBe('no-context')
  })
})

describe('correlationMiddleware', () => {
  it('generates a UUID and sets it on req and as response header when no x-correlation-id is provided', () => {
    const req = makeReq()
    const res = makeRes()
    const next = jest.fn()

    correlationMiddleware(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    const correlationId = req['correlationId'] as string
    expect(typeof correlationId).toBe('string')
    expect(UUID_REGEX.test(correlationId)).toBe(true)
    expect(res.headers['x-correlation-id']).toBe(correlationId)
  })

  it('propagates existing x-correlation-id without generating a new one', () => {
    const req = makeReq({ 'x-correlation-id': 'existing-corr-id-abc' })
    const res = makeRes()
    const next = jest.fn()

    correlationMiddleware(req, res, next)

    expect(req['correlationId']).toBe('existing-corr-id-abc')
    expect(res.headers['x-correlation-id']).toBe('existing-corr-id-abc')
  })

  it('propagates first value when x-correlation-id is an array', () => {
    const req = makeReq({ 'x-correlation-id': ['first-id', 'second-id'] })
    const res = makeRes()
    const next = jest.fn()

    correlationMiddleware(req, res, next)

    expect(req['correlationId']).toBe('first-id')
    expect(res.headers['x-correlation-id']).toBe('first-id')
  })

  it('getCorrelationId() returns correct ID inside next() callback', (done) => {
    const req = makeReq({ 'x-correlation-id': 'sync-check-id-999' })
    const res = makeRes()

    correlationMiddleware(req, res, () => {
      expect(getCorrelationId()).toBe('sync-check-id-999')
      done()
    })
  })

  it('sets req.correlationId to the correlation ID after middleware runs', () => {
    const req = makeReq({ 'x-correlation-id': 'set-on-req-test' })
    const res = makeRes()
    const next = jest.fn()

    correlationMiddleware(req, res, next)

    expect(req['correlationId']).toBe('set-on-req-test')
  })
})
