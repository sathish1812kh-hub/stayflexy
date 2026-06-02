import { Router } from 'express'
import type { PrismaClient } from '@stayflexi/shared-database'
import type Redis from 'ioredis'

export function createHealthRouter(db: PrismaClient, redis: Redis): Router {
  const router = Router()

  router.get('/health/live', (_req, res) => {
    res.json({ status: 'ok', service: 'pricing-engine-service', uptime: process.uptime() })
  })

  router.get('/health/ready', async (_req, res) => {
    const checks: Record<string, string> = {}
    let healthy = true
    try {
      await (db as any).$queryRaw`SELECT 1`
      checks['database'] = 'ok'
    } catch {
      checks['database'] = 'error'
      healthy = false
    }
    try {
      await redis.ping()
      checks['redis'] = 'ok'
    } catch {
      checks['redis'] = 'error'
      healthy = false
    }
    res.status(healthy ? 200 : 503).json({ status: healthy ? 'ok' : 'not-ready', checks })
  })

  return router
}
