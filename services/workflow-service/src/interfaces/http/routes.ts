import { Router } from 'express'
import type { WorkflowController } from './WorkflowController'

export function createWorkflowApiRouter(controller: WorkflowController): Router {
  const router = Router()

  // Workflow executions
  router.post('/api/v1/workflows', controller.createExecution)
  router.get('/api/v1/workflows/executions', controller.listExecutions)
  router.post('/api/v1/workflows/execute', controller.executeWorkflow)

  // Rules — must come before /:id to avoid route shadowing
  router.post('/api/v1/workflows/rules', controller.createRule)
  router.get('/api/v1/workflows/rules', controller.listRules)

  // Parameterised routes last
  router.get('/api/v1/workflows', controller.listExecutions)
  router.get('/api/v1/workflows/:id', controller.getExecution)
  router.post('/api/v1/workflows/:id/retry', controller.retryExecution)

  return router
}
