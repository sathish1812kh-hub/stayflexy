// FILE: src/modules/room/repositories/PrismaRoomTypeRepository.ts
import { type Prisma } from "@prisma/client";
import { RoomTypeRepository } from "./index";
import type { RoomType, CreateRoomTypeData, UpdateRoomTypeData, RoomTypeStatus, BedType } from "../types";
import type { Nullable, PaginatedResult, PaginationParams } from "@shared-types";

type PrismaRoomTypeRecord = Prisma.RoomTypeGetPayload<Record<string, never>>;

function toRoomType(r: PrismaRoomTypeRecord): RoomType {
  return {
    id: r.id,
    hotelId: r.hotelId,
    organizationId: r.organizationId,
    name: r.name,
    slug: r.slug,
    description: r.description ?? null,
    maxAdults: r.maxAdults,
    maxChildren: r.maxChildren,
    maxOccupancy: r.maxOccupancy,
    basePrice: r.basePrice.toNumber(),
    sizeM2: r.sizeM2 ? r.sizeM2.toNumber() : null,
    bedType: r.bedType as BedType,
    amenities: r.amenities,
    status: r.status as RoomTypeStatus,
    totalRooms: r.totalRooms,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    deletedAt: r.deletedAt ?? null,
  };
}

export class PrismaRoomTypeRepository extends RoomTypeRepository {
  async findById(id: string): Promise<Nullable<RoomType>> {
    const r = await this.db.roomType.findFirst({ where: { id, deletedAt: null } });
    return r ? toRoomType(r) : null;
  }

  async findBySlug(hotelId: string, slug: string): Promise<Nullable<RoomType>> {
    const r = await this.db.roomType.findFirst({
      where: { hotelId, slug, deletedAt: null },
    });
    return r ? toRoomType(r) : null;
  }

  async findByHotel(hotelId: string, params: PaginationParams): Promise<PaginatedResult<RoomType>> {
    const skip = this.buildSkip(params);
    const where = { hotelId, deletedAt: null };
    const [records, total] = await Promise.all([
      this.db.roomType.findMany({
        where,
        skip,
        take: params.limit,
        orderBy: { createdAt: "desc" },
      }),
      this.db.roomType.count({ where }),
    ]);
    return { data: records.map(toRoomType), meta: this.buildPaginationMeta(total, params) };
  }

  async findMany(params: PaginationParams): Promise<PaginatedResult<RoomType>> {
    const skip = this.buildSkip(params);
    const where = { deletedAt: null };
    const [records, total] = await Promise.all([
      this.db.roomType.findMany({
        where,
        skip,
        take: params.limit,
        orderBy: { createdAt: "desc" },
      }),
      this.db.roomType.count({ where }),
    ]);
    return { data: records.map(toRoomType), meta: this.buildPaginationMeta(total, params) };
  }

  async findByStatus(
    status: RoomTypeStatus,
    params: PaginationParams
  ): Promise<PaginatedResult<RoomType>> {
    const skip = this.buildSkip(params);
    const where = { status: status as PrismaRoomTypeRecord["status"], deletedAt: null };
    const [records, total] = await Promise.all([
      this.db.roomType.findMany({
        where,
        skip,
        take: params.limit,
        orderBy: { createdAt: "desc" },
      }),
      this.db.roomType.count({ where }),
    ]);
    return { data: records.map(toRoomType), meta: this.buildPaginationMeta(total, params) };
  }

  async findByHotelAndStatus(
    hotelId: string,
    status: RoomTypeStatus,
    params: PaginationParams
  ): Promise<PaginatedResult<RoomType>> {
    const skip = this.buildSkip(params);
    const where = {
      hotelId,
      status: status as PrismaRoomTypeRecord["status"],
      deletedAt: null,
    };
    const [records, total] = await Promise.all([
      this.db.roomType.findMany({
        where,
        skip,
        take: params.limit,
        orderBy: { createdAt: "desc" },
      }),
      this.db.roomType.count({ where }),
    ]);
    return { data: records.map(toRoomType), meta: this.buildPaginationMeta(total, params) };
  }

  async create(data: CreateRoomTypeData): Promise<RoomType> {
    const r = await this.db.roomType.create({
      data: {
        hotelId: data.hotelId,
        organizationId: data.organizationId,
        name: data.name,
        slug: data.slug,
        description: data.description ?? null,
        maxAdults: data.maxAdults,
        maxChildren: data.maxChildren,
        maxOccupancy: data.maxOccupancy,
        basePrice: data.basePrice,
        sizeM2: data.sizeM2 ?? null,
        bedType: data.bedType as PrismaRoomTypeRecord["bedType"],
        amenities: data.amenities,
        status: data.status as PrismaRoomTypeRecord["status"],
      },
    });
    return toRoomType(r);
  }

  async update(id: string, data: UpdateRoomTypeData): Promise<RoomType> {
    const payload: Prisma.RoomTypeUpdateInput = {};
    if (data.name !== undefined) payload.name = data.name;
    if (data.slug !== undefined) payload.slug = data.slug;
    if (data.description !== undefined) payload.description = data.description;
    if (data.maxAdults !== undefined) payload.maxAdults = data.maxAdults;
    if (data.maxChildren !== undefined) payload.maxChildren = data.maxChildren;
    if (data.maxOccupancy !== undefined) payload.maxOccupancy = data.maxOccupancy;
    if (data.basePrice !== undefined) payload.basePrice = data.basePrice;
    if (data.sizeM2 !== undefined) payload.sizeM2 = data.sizeM2;
    if (data.bedType !== undefined)
      payload.bedType = data.bedType as PrismaRoomTypeRecord["bedType"];
    if (data.amenities !== undefined) payload.amenities = data.amenities;
    if (data.status !== undefined)
      payload.status = data.status as PrismaRoomTypeRecord["status"];

    const r = await this.db.roomType.update({ where: { id }, data: payload });
    return toRoomType(r);
  }

  async hardDelete(id: string): Promise<void> {
    await this.db.roomType.delete({ where: { id } });
  }

  async softDelete(id: string): Promise<void> {
    await this.db.roomType.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async incrementTotalRooms(id: string, delta: number): Promise<void> {
    await this.db.roomType.update({
      where: { id },
      data: { totalRooms: { increment: delta } },
    });
  }

  async countByHotel(hotelId: string): Promise<number> {
    return this.db.roomType.count({ where: { hotelId, deletedAt: null } });
  }
}
