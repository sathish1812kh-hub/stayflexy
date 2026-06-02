import type { Request, Response, NextFunction } from 'express'
import { validate } from '@stayflexi/shared-validation'
import { successResponse, buildPaginationMeta } from '@stayflexi/shared-types'
import { UnauthorizedError } from '@stayflexi/shared-errors'
import {
  createWorkflowDtoSchema,
  executeWorkflowDtoSchema,
  createRuleDtoSchema,
  listWorkflowsQuerySchema,
} from '../../application/dtos/workflow.dto'
import type { CreateWorkflow } from '../../application/use-cases/CreateWorkflow'
import type { ExecuteWorkflow } from '../../application/use-cases/ExecuteWorkflow'
import type { RetryWorkflow } from '../../application/use-cases/RetryWorkflow'
import type { GetWorkflow } from '../../application/use-cases/GetWorkflow'
import type { ListWorkflows } from '../../application/use-cases/ListWorkflows'
import type { IAutomationRuleRepository } from '../../domain/repositories/IAutomationRuleRepository'

export class WorkflowController {
  constructor(
    private readonly createWorkflowUC: CreateWorkflow,
    private readonly executeWorkflowUC: ExecuteWorkflow,
    private readonly retryWorkflowUC: RetryWorkflow,
    private readonly getWorkflowUC: GetWorkflow,
    private readonly listWorkflowsUC: ListWorkflows,
    private readonly ruleRepo: IAutomationRuleRepository,
  ) {}

  private getAuth(req: Request): {
    userId: string
    orgId: string
    correlationId: string
  } {
    const userId = req.headers['x-user-id'] as string | undefined
    const orgId = req.headers['x-organization-id'] as string | undefined
    const correlationId = req.headers['x-correlation-id'] as string | undefined
    if (!userId || !orgId) {
      throw new UnauthorizedError('Authentication required')
    }
    return { userId, orgId, correlationId: correlationId ?? '' }
  }

  // POST /api/v1/workflows
  createExecution = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { orgId, correlationId } = this.getAuth(req)
      const dto = validate(createWorkflowDtoSchema, req.body)
      const result = await this.createWorkflowUC.execute(dto, orgId, correlationId)
      res.status(202).json(successResponse(result, correlationId))
    } catch (err) {
      next(err)
    }
  }

  // POST /api/v1/workflows/execute
  executeWorkflow = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { orgId, correlationId } = this.getAuth(req)
      const dto = validate(executeWorkflowDtoSchema, req.body)
      const result = await this.executeWorkflowUC.execute(dto, orgId, correlationId)
      res.status(202).json(successResponse(result, correlationId))
    } catch (err) {
      next(err)
    }
  }

  // GET /api/v1/workflows/:id
  getExecution = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { orgId, correlationId } = this.getAuth(req)
      const id = req.params['id']
      if (!id) {
        res.status(400).json({
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'Missing execution id',
            statusCode: 400,
          },
        })
        return
      }
      const data = await this.getWorkflowUC.execute(id, orgId)
      res.json(successResponse(data, correlationId))
    } catch (err) {
      next(err)
    }
  }

  // GET /api/v1/workflows  or  GET /api/v1/workflows/executions
  listExecutions = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { orgId, correlationId } = this.getAuth(req)
      const query = validate(listWorkflowsQuerySchema, req.query)
      const result = await this.listWorkflowsUC.execute(orgId, {
        hotelId: query.hotelId,
        executionStatus: query.executionStatus,
        triggerSource: query.triggerSource,
        workflowName: query.workflowName,
        page: query.page,
        limit: query.limit,
      })
      res.json({
        success: true,
        data: result.data,
        meta: result.meta,
        correlationId,
      })
    } catch (err) {
      next(err)
    }
  }

  // POST /api/v1/workflows/:id/retry
  retryExecution = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { orgId, correlationId } = this.getAuth(req)
      const id = req.params['id']
      if (!id) {
        res.status(400).json({
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'Missing execution id',
            statusCode: 400,
          },
        })
        return
      }
      const result = await this.retryWorkflowUC.execute(id, orgId, correlationId)
      res.status(202).json(successResponse(result, correlationId))
    } catch (err) {
      next(err)
    }
  }

  // POST /api/v1/workflows/rules
  createRule = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { userId, orgId, correlationId } = this.getAuth(req)
      const dto = validate(createRuleDtoSchema, req.body)
      const rule = await this.ruleRepo.create({
        organizationId: orgId,
        hotelId: dto.hotelId,
        ruleName: dto.ruleName,
        triggerType: dto.triggerType,
        conditionPayload: dto.conditionPayload,
        actionPayload: dto.actionPayload,
        priority: dto.priority,
        createdById: userId,
      })
      res.status(201).json(successResponse(rule.toJSON(), correlationId))
    } catch (err) {
      next(err)
    }
  }

  // GET /api/v1/workflows/rules
  listRules = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { orgId, correlationId } = this.getAuth(req)
      const hotelId = req.query['hotelId'] as string | undefined
      const page = parseInt(String(req.query['page'] ?? '1'), 10)
      const limit = Math.min(parseInt(String(req.query['limit'] ?? '20'), 10), 100)

      const rules = await this.ruleRepo.findByOrganization(orgId, hotelId)

      // Manual pagination on the in-memory result
      const total = rules.length
      const start = (Math.max(1, page) - 1) * limit
      const paged = rules.slice(start, start + limit)
      const meta = buildPaginationMeta(total, page, limit)

      res.json({
        success: true,
        data: paged.map(r => r.toJSON()),
        meta,
        correlationId,
      })
    } catch (err) {
      next(err)
    }
  }
}
