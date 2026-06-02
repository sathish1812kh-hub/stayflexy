import type { Prisma, Prisma as PrismaNamespace } from "@prisma/client";
import { BaseRepository } from "@lib/baseRepository";
import type { Nullable, PaginatedResult, PaginationParams } from "@shared-types";
import type {
  OTAReservation,
  CreateOTAReservationData,
  UpdateOTAReservationData,
  OTAReservationFilter,
  ReservationImportStatusType,
} from "../types";

type PrismaOTAReservationRecord = Prisma.OTAReservationGetPayload<Record<string, never>>;

function toReservation(r: PrismaOTAReservationRecord): OTAReservation {
  return {
    id: r.id,
    organizationId: r.organizationId,
    hotelId: r.hotelId,
    providerId: r.providerId,
    externalReservationId: r.externalReservationId,
    bookingId: r.bookingId ?? null,
    syncStatus: r.syncStatus as ReservationImportStatusType,
    rawPayload: r.rawPayload as Record<string, unknown>,
    importedAt: r.importedAt ?? null,
    errorMessage: r.errorMessage ?? null,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export class PrismaOTAReservationRepository extends BaseRepository<
  OTAReservation,
  CreateOTAReservationData,
  UpdateOTAReservationData
> {
  async findById(id: string): Promise<Nullable<OTAReservation>> {
    const r = await this.db.oTAReservation.findFirst({ where: { id } });
    return r ? toReservation(r) : null;
  }

  async findByExternalId(providerId: string, externalId: string): Promise<Nullable<OTAReservation>> {
    const r = await this.db.oTAReservation.findUnique({
      where: { providerId_externalReservationId: { providerId, externalReservationId: externalId } },
    });
    return r ? toReservation(r) : null;
  }

  async findMany(params: PaginationParams): Promise<PaginatedResult<OTAReservation>> {
    const skip = this.buildSkip(params);
    const [records, total] = await Promise.all([
      this.db.oTAReservation.findMany({
        skip,
        take: params.limit,
        orderBy: { createdAt: "desc" },
      }),
      this.db.oTAReservation.count(),
    ]);
    return { data: records.map(toReservation), meta: this.buildPaginationMeta(total, params) };
  }

  async findManyFiltered(filter: OTAReservationFilter): Promise<PaginatedResult<OTAReservation>> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const params: PaginationParams = { page, limit };
    const skip = this.buildSkip(params);

    const where: Prisma.OTAReservationWhereInput = {
      ...(filter.organizationId && { organizationId: filter.organizationId }),
      ...(filter.hotelId && { hotelId: filter.hotelId }),
      ...(filter.providerId && { providerId: filter.providerId }),
      ...(filter.syncStatus && {
        syncStatus: filter.syncStatus as PrismaOTAReservationRecord["syncStatus"],
      }),
    };

    const [records, total] = await Promise.all([
      this.db.oTAReservation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.db.oTAReservation.count({ where }),
    ]);
    return { data: records.map(toReservation), meta: this.buildPaginationMeta(total, params) };
  }

  async create(data: CreateOTAReservationData): Promise<OTAReservation> {
    const r = await this.db.oTAReservation.create({
      data: {
        organizationId: data.organizationId,
        hotelId: data.hotelId,
        providerId: data.providerId,
        externalReservationId: data.externalReservationId,
        rawPayload: data.rawPayload as PrismaNamespace.InputJsonValue,
      },
    });
    return toReservation(r);
  }

  async update(id: string, data: UpdateOTAReservationData): Promise<OTAReservation> {
    const payload: Prisma.OTAReservationUpdateInput = {};
    if (data.syncStatus !== undefined)
      payload.syncStatus = data.syncStatus as PrismaOTAReservationRecord["syncStatus"];
    if (data.bookingId !== undefined) payload.booking = { connect: { id: data.bookingId } };
    if (data.importedAt !== undefined) payload.importedAt = data.importedAt;
    if (data.errorMessage !== undefined) payload.errorMessage = data.errorMessage;

    const r = await this.db.oTAReservation.update({ where: { id }, data: payload });
    return toReservation(r);
  }

  async updateStatus(
    id: string,
    status: ReservationImportStatusType,
    extra?: { bookingId?: string; importedAt?: Date; errorMessage?: string }
  ): Promise<OTAReservation> {
    const payload: Prisma.OTAReservationUpdateInput = {
      syncStatus: status as PrismaOTAReservationRecord["syncStatus"],
    };
    if (extra?.bookingId !== undefined) payload.booking = { connect: { id: extra.bookingId } };
    if (extra?.importedAt !== undefined) payload.importedAt = extra.importedAt;
    if (extra?.errorMessage !== undefined) payload.errorMessage = extra.errorMessage;

    const r = await this.db.oTAReservation.update({ where: { id }, data: payload });
    return toReservation(r);
  }

  async hardDelete(id: string): Promise<void> {
    await this.db.oTAReservation.delete({ where: { id } });
  }
}
