import { type Prisma, Prisma as PrismaNamespace } from "@prisma/client";
import { BaseRepository } from "@lib/baseRepository";
import type { Nullable, PaginatedResult, PaginationParams } from "@shared-types";
import type {
  OTAMapping,
  CreateOTAMappingData,
  UpdateOTAMappingData,
  OTAMappingFilter,
  SyncStatusType,
} from "../types";

type PrismaOTAMappingRecord = Prisma.OTAMappingGetPayload<Record<string, never>>;

function toMapping(r: PrismaOTAMappingRecord): OTAMapping {
  return {
    id: r.id,
    organizationId: r.organizationId,
    hotelId: r.hotelId,
    roomTypeId: r.roomTypeId ?? null,
    providerId: r.providerId,
    externalHotelId: r.externalHotelId,
    externalRoomTypeId: r.externalRoomTypeId ?? null,
    syncStatus: r.syncStatus as SyncStatusType,
    isActive: r.isActive,
    lastSyncedAt: r.lastSyncedAt ?? null,
    metadata: r.metadata as Record<string, unknown> | null,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export class PrismaOTAMappingRepository extends BaseRepository<
  OTAMapping,
  CreateOTAMappingData,
  UpdateOTAMappingData
> {
  async findById(id: string): Promise<Nullable<OTAMapping>> {
    const r = await this.db.oTAMapping.findFirst({ where: { id } });
    return r ? toMapping(r) : null;
  }

  async findMany(params: PaginationParams): Promise<PaginatedResult<OTAMapping>> {
    const skip = this.buildSkip(params);
    const [records, total] = await Promise.all([
      this.db.oTAMapping.findMany({
        skip,
        take: params.limit,
        orderBy: { createdAt: "desc" },
      }),
      this.db.oTAMapping.count(),
    ]);
    return { data: records.map(toMapping), meta: this.buildPaginationMeta(total, params) };
  }

  async findManyFiltered(filter: OTAMappingFilter): Promise<PaginatedResult<OTAMapping>> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const params: PaginationParams = { page, limit };
    const skip = this.buildSkip(params);

    const where: Prisma.OTAMappingWhereInput = {
      ...(filter.organizationId && { organizationId: filter.organizationId }),
      ...(filter.hotelId && { hotelId: filter.hotelId }),
      ...(filter.providerId && { providerId: filter.providerId }),
      ...(filter.roomTypeId && { roomTypeId: filter.roomTypeId }),
      ...(filter.isActive !== undefined && { isActive: filter.isActive }),
      ...(filter.syncStatus && { syncStatus: filter.syncStatus as PrismaOTAMappingRecord["syncStatus"] }),
    };

    const [records, total] = await Promise.all([
      this.db.oTAMapping.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.db.oTAMapping.count({ where }),
    ]);
    return { data: records.map(toMapping), meta: this.buildPaginationMeta(total, params) };
  }

  async findByHotelAndProvider(hotelId: string, providerId: string): Promise<Nullable<OTAMapping>> {
    const r = await this.db.oTAMapping.findFirst({
      where: { hotelId, providerId, roomTypeId: null },
    });
    return r ? toMapping(r) : null;
  }

  async findByRoomTypeAndProvider(roomTypeId: string, providerId: string): Promise<Nullable<OTAMapping>> {
    const r = await this.db.oTAMapping.findFirst({
      where: { roomTypeId, providerId },
    });
    return r ? toMapping(r) : null;
  }

  async findActiveByHotel(hotelId: string): Promise<OTAMapping[]> {
    const records = await this.db.oTAMapping.findMany({
      where: { hotelId, isActive: true },
      orderBy: { createdAt: "desc" },
    });
    return records.map(toMapping);
  }

  async create(data: CreateOTAMappingData): Promise<OTAMapping> {
    const r = await this.db.oTAMapping.create({
      data: {
        organizationId: data.organizationId,
        hotelId: data.hotelId,
        roomTypeId: data.roomTypeId ?? null,
        providerId: data.providerId,
        externalHotelId: data.externalHotelId,
        externalRoomTypeId: data.externalRoomTypeId ?? null,
        metadata: (data.metadata ?? PrismaNamespace.JsonNull) as PrismaNamespace.InputJsonValue,
      },
    });
    return toMapping(r);
  }

  async update(id: string, data: UpdateOTAMappingData): Promise<OTAMapping> {
    const payload: Prisma.OTAMappingUpdateInput = {};
    if (data.isActive !== undefined) payload.isActive = data.isActive;
    if (data.metadata !== undefined)
      payload.metadata = (data.metadata ?? PrismaNamespace.JsonNull) as PrismaNamespace.InputJsonValue;
    if (data.externalRoomTypeId !== undefined) payload.externalRoomTypeId = data.externalRoomTypeId;

    const r = await this.db.oTAMapping.update({ where: { id }, data: payload });
    return toMapping(r);
  }

  async updateSyncStatus(id: string, status: SyncStatusType, lastSyncedAt?: Date): Promise<OTAMapping> {
    const r = await this.db.oTAMapping.update({
      where: { id },
      data: {
        syncStatus: status as PrismaOTAMappingRecord["syncStatus"],
        ...(lastSyncedAt !== undefined && { lastSyncedAt }),
      },
    });
    return toMapping(r);
  }

  async hardDelete(id: string): Promise<void> {
    await this.db.oTAMapping.delete({ where: { id } });
  }
}
