import type { Prisma } from "@prisma/client";
import { BaseRepository } from "@lib/baseRepository";
import type { Nullable, PaginatedResult, PaginationParams } from "@shared-types";
import type {
  NotificationTemplate,
  CreateTemplateData,
  UpdateTemplateData,
  TemplateFilter,
  NotificationTypeType,
} from "../types";

type PrismaTemplate = Prisma.NotificationTemplateGetPayload<Record<string, never>>;

function toTemplate(r: PrismaTemplate): NotificationTemplate {
  return {
    id: r.id,
    templateName: r.templateName,
    templateType: r.templateType as NotificationTypeType,
    subjectTemplate: r.subjectTemplate ?? null,
    bodyTemplate: r.bodyTemplate,
    variables: r.variables,
    isActive: r.isActive,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export class PrismaNotificationTemplateRepository extends BaseRepository<
  NotificationTemplate,
  CreateTemplateData,
  UpdateTemplateData
> {
  async findById(id: string): Promise<Nullable<NotificationTemplate>> {
    const r = await this.db.notificationTemplate.findFirst({ where: { id } });
    return r ? toTemplate(r) : null;
  }

  async findByName(name: string): Promise<Nullable<NotificationTemplate>> {
    const r = await this.db.notificationTemplate.findUnique({
      where: { templateName: name },
    });
    return r ? toTemplate(r) : null;
  }

  async findMany(params: PaginationParams): Promise<PaginatedResult<NotificationTemplate>> {
    const skip = this.buildSkip(params);
    const [records, total] = await Promise.all([
      this.db.notificationTemplate.findMany({
        skip,
        take: params.limit,
        orderBy: { createdAt: "desc" },
      }),
      this.db.notificationTemplate.count(),
    ]);
    return {
      data: records.map(toTemplate),
      meta: this.buildPaginationMeta(total, params),
    };
  }

  async findManyFiltered(
    filter: TemplateFilter
  ): Promise<PaginatedResult<NotificationTemplate>> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const params: PaginationParams = { page, limit };
    const skip = this.buildSkip(params);

    const where: Prisma.NotificationTemplateWhereInput = {
      ...(filter.templateType && {
        templateType: filter.templateType as PrismaTemplate["templateType"],
      }),
      ...(filter.isActive !== undefined && { isActive: filter.isActive }),
    };

    const [records, total] = await Promise.all([
      this.db.notificationTemplate.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.db.notificationTemplate.count({ where }),
    ]);

    return {
      data: records.map(toTemplate),
      meta: this.buildPaginationMeta(total, params),
    };
  }

  async create(data: CreateTemplateData): Promise<NotificationTemplate> {
    const r = await this.db.notificationTemplate.create({
      data: {
        templateName: data.templateName,
        templateType: data.templateType as PrismaTemplate["templateType"],
        subjectTemplate: data.subjectTemplate ?? null,
        bodyTemplate: data.bodyTemplate,
        variables: data.variables,
      },
    });
    return toTemplate(r);
  }

  async update(id: string, data: UpdateTemplateData): Promise<NotificationTemplate> {
    const payload: Prisma.NotificationTemplateUpdateInput = {};
    if (data.subjectTemplate !== undefined) payload.subjectTemplate = data.subjectTemplate;
    if (data.bodyTemplate !== undefined) payload.bodyTemplate = data.bodyTemplate;
    if (data.variables !== undefined) payload.variables = data.variables;
    if (data.isActive !== undefined) payload.isActive = data.isActive;

    const r = await this.db.notificationTemplate.update({
      where: { id },
      data: payload,
    });
    return toTemplate(r);
  }

  async hardDelete(id: string): Promise<void> {
    await this.db.notificationTemplate.delete({ where: { id } });
  }
}
