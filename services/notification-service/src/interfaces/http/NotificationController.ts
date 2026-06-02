import type { Request, Response, NextFunction } from 'express'
import { validate } from '@stayflexi/shared-validation'
import { successResponse, paginatedSuccess } from '@stayflexi/shared-types'
import { UnauthorizedError } from '@stayflexi/shared-errors'
import {
  sendNotificationDtoSchema,
  listNotificationsQuerySchema,
  createTemplateDtoSchema,
} from '../../application/dtos/notification.dto'
import type { SendNotification } from '../../application/use-cases/SendNotification'
import type { RetryNotification } from '../../application/use-cases/RetryNotification'
import type { GetNotification } from '../../application/use-cases/GetNotification'
import type { ListNotifications } from '../../application/use-cases/ListNotifications'
import type { ITemplateRepository } from '../../domain/repositories/ITemplateRepository'

export class NotificationController {
  constructor(
    private readonly sendNotificationUC: SendNotification,
    private readonly retryNotificationUC: RetryNotification,
    private readonly getNotificationUC: GetNotification,
    private readonly listNotificationsUC: ListNotifications,
    private readonly templateRepo: ITemplateRepository,
  ) {}

  private getAuth(req: Request): { userId: string; orgId: string; correlationId: string } {
    const userId = req.headers['x-user-id'] as string | undefined
    const orgId = req.headers['x-organization-id'] as string | undefined
    const correlationId = req.headers['x-correlation-id'] as string | undefined
    if (!userId || !orgId) {
      throw new UnauthorizedError('Authentication required')
    }
    return { userId, orgId, correlationId: correlationId ?? '' }
  }

  send = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId, correlationId } = this.getAuth(req)
      const dto = validate(sendNotificationDtoSchema, req.body)
      // Enforce organizationId from header (gateway-injected), override body value
      const notification = await this.sendNotificationUC.execute(
        { ...dto, organizationId: orgId },
        correlationId,
      )
      res.status(202).json(successResponse(notification.toJSON(), correlationId))
    } catch (err) {
      next(err)
    }
  }

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId, correlationId } = this.getAuth(req)
      const id = req.params['id']
      if (!id) {
        res.status(400).json({
          success: false,
          error: { code: 'BAD_REQUEST', message: 'Missing notification id', statusCode: 400 },
        })
        return
      }
      const notification = await this.getNotificationUC.execute(id, orgId)
      res.json(successResponse(notification.toJSON(), correlationId))
    } catch (err) {
      next(err)
    }
  }

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId, correlationId } = this.getAuth(req)
      const query = validate(listNotificationsQuerySchema, req.query)
      const result = await this.listNotificationsUC.execute(orgId, {
        hotelId: query.hotelId,
        notificationType: query.notificationType,
        deliveryStatus: query.deliveryStatus,
        page: query.page,
        limit: query.limit,
      })
      res.json(
        paginatedSuccess(
          result.data.map((n) => n.toJSON()),
          result.meta,
          correlationId,
        ),
      )
    } catch (err) {
      next(err)
    }
  }

  retry = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId, correlationId } = this.getAuth(req)
      const id = req.params['id']
      if (!id) {
        res.status(400).json({
          success: false,
          error: { code: 'BAD_REQUEST', message: 'Missing notification id', statusCode: 400 },
        })
        return
      }
      const notification = await this.retryNotificationUC.execute(id, orgId)
      res.json(successResponse(notification.toJSON(), correlationId))
    } catch (err) {
      next(err)
    }
  }

  createTemplate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { correlationId } = this.getAuth(req)
      const dto = validate(createTemplateDtoSchema, req.body)
      const template = await this.templateRepo.create({
        templateName: dto.templateName,
        templateType: dto.templateType,
        subjectTemplate: dto.subjectTemplate,
        bodyTemplate: dto.bodyTemplate,
        variables: dto.variables,
      })
      res.status(201).json(successResponse(template.toJSON(), correlationId))
    } catch (err) {
      next(err)
    }
  }

  listTemplates = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { correlationId } = this.getAuth(req)
      const templateType = req.query['type'] as string | undefined
      const templates = await this.templateRepo.findAll(templateType)
      res.json(successResponse(templates.map((t) => t.toJSON()), correlationId))
    } catch (err) {
      next(err)
    }
  }
}
