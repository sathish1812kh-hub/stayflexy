import type { Request, Response, NextFunction } from 'express'
import { validate } from '@stayflexi/shared-validation'
import { successResponse } from '@stayflexi/shared-types'
import { UnauthorizedError } from '@stayflexi/shared-errors'
import {
  createHousekeepingTaskDtoSchema,
  updateHousekeepingTaskDtoSchema,
  assignHousekeepingTaskDtoSchema,
  listHousekeepingTasksDtoSchema,
} from '../../application/dtos/housekeeping.dto'
import type { CreateHousekeepingTask } from '../../application/use-cases/CreateHousekeepingTask'
import type { UpdateTaskStatus } from '../../application/use-cases/UpdateTaskStatus'
import type { AssignTask } from '../../application/use-cases/AssignTask'
import type { ListTasks } from '../../application/use-cases/ListTasks'
import type { IHousekeepingTaskRepository } from '../../domain/repositories/IHousekeepingTaskRepository'

function getAuth(req: Request) {
  const userId = req.headers['x-user-id'] as string | undefined
  const orgId = req.headers['x-organization-id'] as string | undefined
  const correlationId = req.headers['x-correlation-id'] as string | undefined
  if (!userId) throw new UnauthorizedError('Authentication required')
  if (!orgId) throw new UnauthorizedError('Organization context required')
  return { userId, orgId, correlationId }
}

export class HousekeepingController {
  constructor(
    private readonly createTaskUC: CreateHousekeepingTask,
    private readonly updateStatusUC: UpdateTaskStatus,
    private readonly assignTaskUC: AssignTask,
    private readonly listTasksUC: ListTasks,
    private readonly taskRepo: IHousekeepingTaskRepository,
  ) {}

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId, orgId, correlationId } = getAuth(req)
      const dto = validate(
        createHousekeepingTaskDtoSchema as unknown as import('zod').ZodTypeAny,
        req.body,
      ) as unknown as Parameters<CreateHousekeepingTask['execute']>[0]
      const task = await this.createTaskUC.execute(dto, orgId, userId)
      res.status(201).json({ ...successResponse(task.toJSON(), correlationId) })
    } catch (err) {
      next(err)
    }
  }

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId, correlationId } = getAuth(req)
      const id = req.params['id'] as string
      const task = await this.taskRepo.findById(id)
      if (!task || !task.belongsToOrganization(orgId)) {
        const { NotFoundError } = await import('@stayflexi/shared-errors')
        throw new NotFoundError('Housekeeping task not found')
      }
      res.json({ ...successResponse(task.toJSON(), correlationId) })
    } catch (err) {
      next(err)
    }
  }

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId, correlationId } = getAuth(req)
      const id = req.params['id'] as string
      const dto = validate(
        updateHousekeepingTaskDtoSchema as unknown as import('zod').ZodTypeAny,
        req.body,
      )
      // If taskStatus is present, use dedicated use-case for transition validation
      if ((dto as unknown as { taskStatus?: string }).taskStatus) {
        const updated = await this.updateStatusUC.execute(
          id,
          (
            dto as unknown as {
              taskStatus: import('../../domain/entities/HousekeepingTask').HousekeepingTaskStatus
            }
          ).taskStatus,
          orgId,
        )
        res.json({
          ...successResponse(
            (updated as unknown as { toJSON: () => unknown }).toJSON(),
            correlationId,
          ),
        })
        return
      }
      const updated = await this.taskRepo.update(
        id,
        dto as Parameters<IHousekeepingTaskRepository['update']>[1],
      )
      res.json({ ...successResponse(updated.toJSON(), correlationId) })
    } catch (err) {
      next(err)
    }
  }

  updateStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId, correlationId } = getAuth(req)
      const id = req.params['id'] as string
      const { taskStatus } = req.body as {
        taskStatus: import('../../domain/entities/HousekeepingTask').HousekeepingTaskStatus
      }
      const task = await this.updateStatusUC.execute(id, taskStatus, orgId)
      res.json({
        ...successResponse((task as unknown as { toJSON: () => unknown }).toJSON(), correlationId),
      })
    } catch (err) {
      next(err)
    }
  }

  assign = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId, correlationId } = getAuth(req)
      const id = req.params['id'] as string
      const dto = validate(
        assignHousekeepingTaskDtoSchema as unknown as import('zod').ZodTypeAny,
        req.body,
      ) as unknown as { assignedTo: string }
      const task = await this.assignTaskUC.execute(id, dto.assignedTo, orgId)
      res.json({ ...successResponse(task.toJSON(), correlationId) })
    } catch (err) {
      next(err)
    }
  }

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId, correlationId } = getAuth(req)
      const dto = validate(
        listHousekeepingTasksDtoSchema as unknown as import('zod').ZodSchema<unknown>,
        req.query as Record<string, string | undefined>,
      ) as unknown as {
        hotelId?: string
        roomId?: string
        assignedTo?: string
        taskStatus?: import('../../domain/entities/HousekeepingTask').HousekeepingTaskStatus
        priority?: import('../../domain/entities/HousekeepingTask').HousekeepingPriority
        page: number
        limit: number
      }
      const result = await this.listTasksUC.execute(orgId, dto)
      res.json({
        success: true,
        data: result.data.map((t) => t.toJSON()),
        meta: { ...result.meta, correlationId },
      })
    } catch (err) {
      next(err)
    }
  }

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId } = getAuth(req)
      const id = req.params['id'] as string
      const task = await this.taskRepo.findById(id)
      if (!task || !task.belongsToOrganization(orgId)) {
        const { NotFoundError } = await import('@stayflexi/shared-errors')
        throw new NotFoundError('Housekeeping task not found')
      }
      await this.taskRepo.delete(id)
      res.status(204).send()
    } catch (err) {
      next(err)
    }
  }
}
