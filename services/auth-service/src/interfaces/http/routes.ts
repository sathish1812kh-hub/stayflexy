import { Router } from 'express'
import type { AuthController } from './AuthController'

export function createAuthRouter(controller: AuthController): Router {
  const router = Router()
  router.post('/api/v1/auth/register', controller.register)
  router.post('/api/v1/auth/login', controller.login)
  router.post('/api/v1/auth/logout', controller.logout)
  router.post('/api/v1/auth/refresh', controller.refresh)
  router.get('/api/v1/auth/me', controller.me)
  return router
}
