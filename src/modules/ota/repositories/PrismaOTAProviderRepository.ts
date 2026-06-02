import { type Prisma, Prisma as PrismaNamespace } from "@prisma/client";
import { BaseRepository } from "@lib/baseRepository";
import type { Nullable, PaginatedResult, PaginationParams } from "@shared-types";
import type {
  OTAProvider,
  CreateOTAProviderData,
  UpdateOTAProviderData,
  OTAProviderFilter,
  OTAProviderStatusType,
} from "../types";

type PrismaOTAProviderRecord = Prisma.OTAProviderGetPayload<Record<string, never>>;

function toProvider(r: PrismaOTAProviderRecord): OTAProvider {
  return {
    id: r.id,
    providerName: r.providerName,
    providerCode: r.providerCode,
    status: r.status as OTAProviderStatusType,
    description: r.description ?? null,
    webhookUrl: r.webhookUrl ?? null,
    metadata: r.metadata as Record<string, unknown> | null,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export class PrismaOTAProviderRepository extends BaseRepository<
  OTAProvider,
  CreateOTAProviderData,
  UpdateOTAProviderData
> {
  async findById(id: string): Promise<Nullable<OTAProvider>> {
    const r = await this.db.oTAProvider.findFirst({ where: { id } });
    return r ? toProvider(r) : null;
  }

  async findByCode(code: string): Promise<Nullable<OTAProvider>> {
    const r = await this.db.oTAProvider.findUnique({ where: { providerCode: code } });
    return r ? toProvider(r) : null;
  }

  async findMany(params: PaginationParams): Promise<PaginatedResult<OTAProvider>> {
    const skip = this.buildSkip(params);
    const [records, total] = await Promise.all([
      this.db.oTAProvider.findMany({
        skip,
        take: params.limit,
        orderBy: { createdAt: "desc" },
      }),
      this.db.oTAProvider.count(),
    ]);
    return { data: records.map(toProvider), meta: this.buildPaginationMeta(total, params) };
  }

  async findManyFiltered(filter: OTAProviderFilter): Promise<PaginatedResult<OTAProvider>> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const params: PaginationParams = { page, limit };
    const skip = this.buildSkip(params);

    const where: Prisma.OTAProviderWhereInput = {
      ...(filter.status && { status: filter.status as PrismaOTAProviderRecord["status"] }),
    };

    const [records, total] = await Promise.all([
      this.db.oTAProvider.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.db.oTAProvider.count({ where }),
    ]);
    return { data: records.map(toProvider), meta: this.buildPaginationMeta(total, params) };
  }

  async create(data: CreateOTAProviderData): Promise<OTAProvider> {
    const r = await this.db.oTAProvider.create({
      data: {
        providerName: data.providerName,
        providerCode: data.providerCode,
        description: data.description ?? null,
        webhookUrl: data.webhookUrl ?? null,
        metadata: (data.metadata ?? PrismaNamespace.JsonNull) as PrismaNamespace.InputJsonValue,
      },
    });
    return toProvider(r);
  }

  async update(id: string, data: UpdateOTAProviderData): Promise<OTAProvider> {
    const payload: Prisma.OTAProviderUpdateInput = {};
    if (data.providerName !== undefined) payload.providerName = data.providerName;
    if (data.providerCode !== undefined) payload.providerCode = data.providerCode;
    if (data.status !== undefined) payload.status = data.status as PrismaOTAProviderRecord["status"];
    if (data.description !== undefined) payload.description = data.description;
    if (data.webhookUrl !== undefined) payload.webhookUrl = data.webhookUrl;
    if (data.metadata !== undefined)
      payload.metadata = (data.metadata ?? PrismaNamespace.JsonNull) as PrismaNamespace.InputJsonValue;

    const r = await this.db.oTAProvider.update({ where: { id }, data: payload });
    return toProvider(r);
  }

  async hardDelete(id: string): Promise<void> {
    await this.db.oTAProvider.delete({ where: { id } });
  }
}
