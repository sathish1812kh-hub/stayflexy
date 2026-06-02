import { createRateLimitMiddleware } from '../../middleware/rateLimit'

function makePipeline(count: number) {
  return {
    incr: jest.fn().mockReturnThis(),
    expire: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([[null, count], [null, 1]]),
  }
}

function makeRedis(count: number) {
  const pipeline = makePipeline(count)
  return {
    pipeline: jest.fn().mockReturnValue(pipeline),
    _pipeline: pipeline,
  }
}

function makeReq(headers: Record<string, string> = {}) {
  return {
    headers,
    socket: { remoteAddress: '10.0.0.1' },
  }
}

function makeRes() {
  const headers: Record<string, string | number> = {}
  return {
    headers,
    setHeader: jest.fn((k: string, v: string | number) => { headers[k] = v }),
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  }
}

describe('createRateLimitMiddleware', () => {
  const WINDOW_MS = 60_000
  const MAX_REQUESTS = 100

  it('calls next() and sets x-ratelimit-* headers for first request (count=1)', async () => {
    const redis = makeRedis(1)
    const middleware = createRateLimitMiddleware(redis as any, WINDOW_MS, MAX_REQUESTS)
    const req = makeReq()
    const res = makeRes()
    const next = jest.fn()

    await middleware(req as any, res as any, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(res.setHeader).toHaveBeenCalledWith('x-ratelimit-limit', MAX_REQUESTS)
    expect(res.setHeader).toHaveBeenCalledWith('x-ratelimit-remaining', MAX_REQUESTS - 1)
    expect(res.setHeader).toHaveBeenCalledWith('x-ratelimit-reset', expect.any(Number))
  })

  it('calls next() when count equals max requests (exactly at limit)', async () => {
    const redis = makeRedis(MAX_REQUESTS)
    const middleware = createRateLimitMiddleware(redis as any, WINDOW_MS, MAX_REQUESTS)
    const req = makeReq()
    const res = makeRes()
    const next = jest.fn()

    await middleware(req as any, res as any, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(res.status).not.toHaveBeenCalled()
  })

  it('returns 429 when count exceeds max requests', async () => {
    const redis = makeRedis(MAX_REQUESTS + 1)
    const middleware = createRateLimitMiddleware(redis as any, WINDOW_MS, MAX_REQUESTS)
    const req = makeReq()
    const res = makeRes()
    const next = jest.fn()

    await middleware(req as any, res as any, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(429)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'RATE_LIMIT_EXCEEDED', statusCode: 429 }),
      })
    )
  })

  it('calls next() when redis exec() rejects (fail-open)', async () => {
    const pipeline = {
      incr: jest.fn().mockReturnThis(),
      expire: jest.fn().mockReturnThis(),
      exec: jest.fn().mockRejectedValue(new Error('Redis connection failed')),
    }
    const redis = { pipeline: jest.fn().mockReturnValue(pipeline) }
    const middleware = createRateLimitMiddleware(redis as any, WINDOW_MS, MAX_REQUESTS)
    const req = makeReq()
    const res = makeRes()
    const next = jest.fn()

    await middleware(req as any, res as any, next)

    expect(next).toHaveBeenCalledTimes(1)
  })

  it('uses x-forwarded-for header for IP key', async () => {
    const redis = makeRedis(1)
    const middleware = createRateLimitMiddleware(redis as any, WINDOW_MS, MAX_REQUESTS)
    const req = makeReq({ 'x-forwarded-for': '203.0.113.42, 10.0.0.1' })
    const res = makeRes()
    const next = jest.fn()

    await middleware(req as any, res as any, next)

    expect(redis._pipeline.incr).toHaveBeenCalledWith(
      expect.stringContaining('203.0.113.42')
    )
  })

  it('uses "unknown" when no IP is available', async () => {
    const redis = makeRedis(1)
    const middleware = createRateLimitMiddleware(redis as any, WINDOW_MS, MAX_REQUESTS)
    const req = {
      headers: {},
      socket: { remoteAddress: undefined },
    }
    const res = makeRes()
    const next = jest.fn()

    await middleware(req as any, res as any, next)

    expect(redis._pipeline.incr).toHaveBeenCalledWith(
      expect.stringContaining('unknown')
    )
  })
})
