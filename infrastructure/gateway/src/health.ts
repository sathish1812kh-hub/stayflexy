import { Router } from 'express'
import Redis from 'ioredis'

export function createHealthRouter(redis: Redis, startTime: Date): Router {
  const router = Router()

  router.get('/live', (_req, res) => {
    res.status(200).json({
      status: 'alive',
      service: 'api-gateway',
      uptime: Date.now() - startTime.getTime(),
    })
  })

  router.get('/ready', async (_req, res) => {
    try {
      await redis.ping()
      res.status(200).json({ status: 'ready', checks: { redis: 'ok' } })
    } catch (error) {
      res.status(503).json({
        status: 'not ready',
        checks: { redis: 'error' },
        error: String(error),
      })
    }
  })

  router.get('/status', async (_req, res) => {
    const ping = await redis.ping().catch(() => null)
    res.json({
      service: 'api-gateway',
      version: '2.0.0',
      uptime: Date.now() - startTime.getTime(),
      checks: { redis: ping === 'PONG' ? 'ok' : 'error' },
      timestamp: new Date().toISOString(),
    })
  })

  return router
}
