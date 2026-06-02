import type { NotificationTemplate } from '../entities/NotificationTemplate'

export interface CreateTemplateData {
  templateName: string
  templateType: string
  subjectTemplate?: string
  bodyTemplate: string
  variables?: string[]
}

export interface ITemplateRepository {
  findById(id: string): Promise<NotificationTemplate | null>
  findByName(name: string): Promise<NotificationTemplate | null>
  findAll(templateType?: string): Promise<NotificationTemplate[]>
  create(data: CreateTemplateData): Promise<NotificationTemplate>
  update(
    id: string,
    data: Partial<CreateTemplateData> & { isActive?: boolean },
  ): Promise<NotificationTemplate>
}
