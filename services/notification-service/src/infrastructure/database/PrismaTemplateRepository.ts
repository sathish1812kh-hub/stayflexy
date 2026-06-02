import type { PrismaClient } from '@prisma/client'
import type { NotificationType } from '@prisma/client'
import { fromPrismaError } from '@stayflexi/shared-errors'
import { NotificationTemplate } from '../../domain/entities/NotificationTemplate'
import type { NotificationTemplateProps } from '../../domain/entities/NotificationTemplate'
import type {
  ITemplateRepository,
  CreateTemplateData,
} from '../../domain/repositories/ITemplateRepository'

type PrismaTemplate = {
  id: string
  templateName: string
  templateType: string
  subjectTemplate: string | null
  bodyTemplate: string
  variables: string[]
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

function mapToEntity(r: PrismaTemplate): NotificationTemplate {
  const props: NotificationTemplateProps = {
    id: r.id,
    templateName: r.templateName,
    templateType: r.templateType,
    subjectTemplate: r.subjectTemplate,
    bodyTemplate: r.bodyTemplate,
    variables: r.variables,
    isActive: r.isActive,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }
  return new NotificationTemplate(props)
}

export class PrismaTemplateRepository implements ITemplateRepository {
  constructor(private readonly db: PrismaClient) {}

  async findById(id: string): Promise<NotificationTemplate | null> {
    try {
      const r = await this.db.notificationTemplate.findUnique({ where: { id } })
      return r ? mapToEntity(r) : null
    } catch (err) {
      const e = fromPrismaError(err)
      if (e) throw e
      throw err
    }
  }

  async findByName(name: string): Promise<NotificationTemplate | null> {
    try {
      const r = await this.db.notificationTemplate.findUnique({
        where: { templateName: name },
      })
      return r ? mapToEntity(r) : null
    } catch (err) {
      const e = fromPrismaError(err)
      if (e) throw e
      throw err
    }
  }

  async findAll(templateType?: string): Promise<NotificationTemplate[]> {
    try {
      const records = await this.db.notificationTemplate.findMany({
        where: {
          ...(templateType !== undefined
            ? { templateType: templateType as NotificationType }
            : {}),
          isActive: true,
        },
        orderBy: { templateName: 'asc' },
      })
      return records.map(mapToEntity)
    } catch (err) {
      const e = fromPrismaError(err)
      if (e) throw e
      throw err
    }
  }

  async create(data: CreateTemplateData): Promise<NotificationTemplate> {
    try {
      const r = await this.db.notificationTemplate.create({
        data: {
          templateName: data.templateName,
          templateType: data.templateType as NotificationType,
          subjectTemplate: data.subjectTemplate ?? null,
          bodyTemplate: data.bodyTemplate,
          variables: data.variables ?? [],
        },
      })
      return mapToEntity(r)
    } catch (err) {
      const e = fromPrismaError(err)
      if (e) throw e
      throw err
    }
  }

  async update(
    id: string,
    data: Partial<CreateTemplateData> & { isActive?: boolean },
  ): Promise<NotificationTemplate> {
    try {
      const r = await this.db.notificationTemplate.update({
        where: { id },
        data: {
          ...(data.templateName !== undefined && { templateName: data.templateName }),
          ...(data.templateType !== undefined && {
            templateType: data.templateType as NotificationType,
          }),
          ...(data.subjectTemplate !== undefined && {
            subjectTemplate: data.subjectTemplate,
          }),
          ...(data.bodyTemplate !== undefined && { bodyTemplate: data.bodyTemplate }),
          ...(data.variables !== undefined && { variables: data.variables }),
          ...(data.isActive !== undefined && { isActive: data.isActive }),
        },
      })
      return mapToEntity(r)
    } catch (err) {
      const e = fromPrismaError(err)
      if (e) throw e
      throw err
    }
  }
}
