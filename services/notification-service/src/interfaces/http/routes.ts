import { Router } from 'express'
import type { NotificationController } from './NotificationController'

export function createNotificationApiRouter(controller: NotificationController): Router {
  const router = Router()

  // Notification sending
  router.post('/api/v1/notifications/send', controller.send)

  // Template routes (before /:id to avoid conflict)
  router.post('/api/v1/notifications/templates', controller.createTemplate)
  router.get('/api/v1/notifications/templates', controller.listTemplates)

  // Notification CRUD + retry
  router.get('/api/v1/notifications', controller.list)
  router.get('/api/v1/notifications/:id', controller.getById)
  router.post('/api/v1/notifications/:id/retry', controller.retry)

  return router
}
