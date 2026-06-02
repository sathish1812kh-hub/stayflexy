import { BaseService } from "@lib/baseService";
import { NotFoundError, ConflictError } from "@errors/HttpError";
import type { PaginatedResult } from "@shared-types";
import type { PrismaNotificationTemplateRepository } from "../repositories/PrismaNotificationTemplateRepository";
import type { NotificationTemplate, CreateTemplateData, UpdateTemplateData } from "../types";
import type {
  CreateTemplateDtoType,
  UpdateTemplateDtoType,
  TemplateFilterDtoType,
} from "../dto";
import { NOTIFICATION_ERRORS } from "../constants";

export class NotificationTemplateService extends BaseService {
  protected readonly moduleName = "NotificationTemplateService";

  constructor(
    private readonly templateRepo: PrismaNotificationTemplateRepository
  ) {
    super();
  }

  async createTemplate(
    dto: CreateTemplateDtoType
  ): Promise<NotificationTemplate> {
    return this.execute("createTemplate", async () => {
      const existing = await this.templateRepo.findByName(dto.templateName);
      if (existing) {
        throw new ConflictError(NOTIFICATION_ERRORS.TEMPLATE_NAME_EXISTS);
      }

      const data: CreateTemplateData = {
        templateName: dto.templateName,
        templateType: dto.templateType,
        subjectTemplate: dto.subjectTemplate,
        bodyTemplate: dto.bodyTemplate,
        variables: dto.variables,
      };

      return this.templateRepo.create(data);
    });
  }

  async updateTemplate(
    id: string,
    dto: UpdateTemplateDtoType
  ): Promise<NotificationTemplate> {
    return this.execute("updateTemplate", async () => {
      const existing = await this.templateRepo.findById(id);
      if (!existing) {
        throw new NotFoundError(NOTIFICATION_ERRORS.TEMPLATE_NOT_FOUND);
      }

      const data: UpdateTemplateData = {
        subjectTemplate: dto.subjectTemplate,
        bodyTemplate: dto.bodyTemplate,
        variables: dto.variables,
        isActive: dto.isActive,
      };

      return this.templateRepo.update(id, data);
    });
  }

  async getTemplate(id: string): Promise<NotificationTemplate> {
    return this.execute("getTemplate", async () => {
      const template = await this.templateRepo.findById(id);
      if (!template) {
        throw new NotFoundError(NOTIFICATION_ERRORS.TEMPLATE_NOT_FOUND);
      }
      return template;
    });
  }

  async getTemplateByName(name: string): Promise<NotificationTemplate> {
    return this.execute("getTemplateByName", async () => {
      const template = await this.templateRepo.findByName(name);
      if (!template) {
        throw new NotFoundError(NOTIFICATION_ERRORS.TEMPLATE_NOT_FOUND);
      }
      return template;
    });
  }

  async listTemplates(
    filter: TemplateFilterDtoType
  ): Promise<PaginatedResult<NotificationTemplate>> {
    return this.execute("listTemplates", async () => {
      return this.templateRepo.findManyFiltered({
        templateType: filter.templateType,
        isActive: filter.isActive,
        page: filter.page,
        limit: filter.limit,
      });
    });
  }
}
