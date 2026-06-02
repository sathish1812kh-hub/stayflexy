// FILE: src/modules/synchronization/repositories/PrismaSyncEventRepository.ts
import { type Prisma, Prisma as PrismaNamespace } from "@prisma/client";
import { BaseRepository } from "@lib/baseRepository";
import type { PaginatedResult, PaginationParams } from "@shared-types";
import type {
  SyncEvent,
  CreateSyncEventData,
  SyncEventFilter,
  SyncStatusType,
  SyncEventTypeType,
} from "../types";

type PrismaSyncEvent = Prisma.SyncEventGetPayload<Record<string, never>>;

function toSyncEvent(r: PrismaSyncEvent): SyncEvent {
  return {
    id: r.id,
    syncJobId: r.syncJobId,
    eventType: r.eventType as SyncEventTypeType,
    payload: r.payload as Record<string, unknown> | null,
    processingStatus: r.processingStatus as SyncStatusType,
    errorMessage: r.errorMessage ?? null,
    createdAt: r.createdAt,
  };
}

export class PrismaSyncEventRepository extends BaseRepository<
  SyncEvent,
  CreateSyncEventData,
  Record<string, never>
> {
  async findById(id: string): Promise<SyncEvent | null> {
    const r = await this.db.syncEvent.findFirst({ where: { id } });
    return r ? toSyncEvent(r) : null;
  }

  async findMany(params: PaginationParams): Promise<PaginatedResult<SyncEvent>> {
    const skip = this.buildSkip(params);
    const [records, total] = await Promise.all([
      this.db.syncEvent.findMany({
        skip,
        take: params.limit,
        orderBy: { createdAt: "desc" },
      }),
      this.db.syncEvent.count(),
    ]);
    return {
      data: records.map(toSyncEvent),
      meta: this.buildPaginationMeta(total, params),
    };
  }

  async findManyFiltered(filter: SyncEventFilter): Promise<PaginatedResult<SyncEvent>> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.SyncEventWhereInput = {
      ...(filter.syncJobId !== undefined && { syncJobId: filter.syncJobId }),
      ...(filter.eventType !== undefined && {
        eventType: filter.eventType as Prisma.EnumSyncEventTypeFilter,
      }),
      ...(filter.processingStatus !== undefined && {
        processingStatus: filter.processingStatus as Prisma.EnumSyncStatusFilter,
      }),
    };

    const [records, total] = await Promise.all([
      this.db.syncEvent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.db.syncEvent.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    return {
      data: records.map(toSyncEvent),
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async findByJob(syncJobId: string): Promise<SyncEvent[]> {
    const records = await this.db.syncEvent.findMany({
      where: { syncJobId },
      orderBy: { createdAt: "asc" },
    });
    return records.map(toSyncEvent);
  }

  async create(data: CreateSyncEventData): Promise<SyncEvent> {
    const r = await this.db.syncEvent.create({
      data: {
        syncJobId: data.syncJobId,
        eventType: data.eventType as Parameters<
          typeof this.db.syncEvent.create
        >[0]["data"]["eventType"],
        payload: (data.payload ?? PrismaNamespace.JsonNull) as PrismaNamespace.InputJsonValue,
        processingStatus: data.processingStatus as Parameters<
          typeof this.db.syncEvent.create
        >[0]["data"]["processingStatus"],
        errorMessage: data.errorMessage ?? null,
      },
    });
    return toSyncEvent(r);
  }

  // SyncEvents are immutable — update is not supported.
  update(_id: string, _data: Record<string, never>): Promise<SyncEvent> {
    return Promise.reject(new Error("SyncEvents are immutable"));
  }

  async hardDelete(id: string): Promise<void> {
    await this.db.syncEvent.delete({ where: { id } });
  }
}
