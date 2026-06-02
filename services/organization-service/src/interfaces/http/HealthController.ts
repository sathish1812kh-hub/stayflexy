import type { Request, Response } from 'express'
import type { PrismaClient } from '@prisma/client'
import type Redis from 'ioredis'
import { Router } from 'express'

export function createHealthRouter(db: PrismaClient, redis: Redis): Router {
  const router = Router()
  const startTime = Date.now()

  router.get('/health/live', (_req: Request, res: Response) => {
    res.json({
      status: 'alive',
      service: 'organization-service',
      uptime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    })
  })

  router.get('/health/ready', async (_req: Request, res: Response) => {
    const checks: Record<string, string> = {}
    try {
      await db.$queryRaw`SELECT 1`
      checks['database'] = 'ok'
    } catch {
      checks['database'] = 'error'
    }
    try {
      await redis.ping()
      checks['redis'] = 'ok'
    } catch {
      checks['redis'] = 'error'
    }
    const ready = Object.values(checks).every((v) => v === 'ok')
    res.status(ready ? 200 : 503).json({
      status: ready ? 'ready' : 'not ready',
      checks,
    })
  })

  router.get('/health/status', async (_req: Request, res: Response) => {
    const checks: Record<string, string> = {}
    try {
      await db.$queryRaw`SELECT 1`
      checks['database'] = 'ok'
    } catch {
      checks['database'] = 'error'
    }
    try {
      await redis.ping()
      checks['redis'] = 'ok'
    } catch {
      checks['redis'] = 'error'
    }
    const healthy = Object.values(checks).every((v) => v === 'ok')
    res.status(healthy ? 200 : 503).json({
      service: 'organization-service',
      version: '2.0.0',
      status: healthy ? 'healthy' : 'degraded',
      checks,
      uptime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    })
  })

  return router
}
