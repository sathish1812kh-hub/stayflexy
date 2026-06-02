// FILE: src/modules/room/repositories/PrismaRoomRepository.ts
import { type Prisma } from "@prisma/client";
import { RoomRepository, type RoomMultiFilters } from "./index";
import type {
  Room,
  CreateRoomData,
  UpdateRoomData,
  RoomOperationalStatus,
  HousekeepingStatus,
  OccupancyStatus,
  MaintenanceStatus,
} from "../types";
import type { Nullable, PaginatedResult, PaginationParams } from "@shared-types";

type PrismaRoomRecord = Prisma.RoomGetPayload<Record<string, never>>;

function toRoom(r: PrismaRoomRecord): Room {
  return {
    id: r.id,
    hotelId: r.hotelId,
    organizationId: r.organizationId,
    roomTypeId: r.roomTypeId,
    roomNumber: r.roomNumber,
    floor: r.floor,
    description: r.description ?? null,
    view: r.view ?? null,
    operationalStatus: r.operationalStatus as RoomOperationalStatus,
    housekeepingStatus: r.housekeepingStatus as HousekeepingStatus,
    occupancyStatus: r.occupancyStatus as OccupancyStatus,
    maintenanceStatus: r.maintenanceStatus as MaintenanceStatus,
    notes: r.notes ?? null,
    lastCleanedAt: r.lastCleanedAt ?? null,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    deletedAt: r.deletedAt ?? null,
  };
}

export class PrismaRoomRepository extends RoomRepository {
  async findById(id: string): Promise<Nullable<Room>> {
    const r = await this.db.room.findFirst({ where: { id, deletedAt: null } });
    return r ? toRoom(r) : null;
  }

  async findByNumber(hotelId: string, roomNumber: string): Promise<Nullable<Room>> {
    const r = await this.db.room.findFirst({
      where: { hotelId, roomNumber, deletedAt: null },
    });
    return r ? toRoom(r) : null;
  }

  async findByHotel(hotelId: string, params: PaginationParams): Promise<PaginatedResult<Room>> {
    const skip = this.buildSkip(params);
    const where = { hotelId, deletedAt: null };
    const [records, total] = await Promise.all([
      this.db.room.findMany({
        where,
        skip,
        take: params.limit,
        orderBy: { createdAt: "desc" },
      }),
      this.db.room.count({ where }),
    ]);
    return { data: records.map(toRoom), meta: this.buildPaginationMeta(total, params) };
  }

  async findByRoomType(roomTypeId: string, params: PaginationParams): Promise<PaginatedResult<Room>> {
    const skip = this.buildSkip(params);
    const where = { roomTypeId, deletedAt: null };
    const [records, total] = await Promise.all([
      this.db.room.findMany({
        where,
        skip,
        take: params.limit,
        orderBy: { createdAt: "desc" },
      }),
      this.db.room.count({ where }),
    ]);
    return { data: records.map(toRoom), meta: this.buildPaginationMeta(total, params) };
  }

  async findByStatus(
    hotelId: string,
    status: RoomOperationalStatus,
    params: PaginationParams
  ): Promise<PaginatedResult<Room>> {
    const skip = this.buildSkip(params);
    const where = {
      hotelId,
      operationalStatus: status as PrismaRoomRecord["operationalStatus"],
      deletedAt: null,
    };
    const [records, total] = await Promise.all([
      this.db.room.findMany({
        where,
        skip,
        take: params.limit,
        orderBy: { createdAt: "desc" },
      }),
      this.db.room.count({ where }),
    ]);
    return { data: records.map(toRoom), meta: this.buildPaginationMeta(total, params) };
  }

  async findMany(params: PaginationParams): Promise<PaginatedResult<Room>> {
    const skip = this.buildSkip(params);
    const where = { deletedAt: null };
    const [records, total] = await Promise.all([
      this.db.room.findMany({
        where,
        skip,
        take: params.limit,
        orderBy: { createdAt: "desc" },
      }),
      this.db.room.count({ where }),
    ]);
    return { data: records.map(toRoom), meta: this.buildPaginationMeta(total, params) };
  }

  async findManyFiltered(
    filters: RoomMultiFilters,
    params: PaginationParams
  ): Promise<PaginatedResult<Room>> {
    const skip = this.buildSkip(params);
    const where: Prisma.RoomWhereInput = {
      hotelId: filters.hotelId,
      deletedAt: null,
      ...(filters.roomTypeId && { roomTypeId: filters.roomTypeId }),
      ...(filters.operationalStatus && {
        operationalStatus: filters.operationalStatus as PrismaRoomRecord["operationalStatus"],
      }),
      ...(filters.housekeepingStatus && {
        housekeepingStatus: filters.housekeepingStatus as PrismaRoomRecord["housekeepingStatus"],
      }),
      ...(filters.occupancyStatus && {
        occupancyStatus: filters.occupancyStatus as PrismaRoomRecord["occupancyStatus"],
      }),
      ...(filters.floor !== undefined && { floor: filters.floor }),
    };

    const [records, total] = await Promise.all([
      this.db.room.findMany({
        where,
        skip,
        take: params.limit,
        orderBy: { createdAt: "desc" },
      }),
      this.db.room.count({ where }),
    ]);
    return { data: records.map(toRoom), meta: this.buildPaginationMeta(total, params) };
  }

  async create(data: CreateRoomData): Promise<Room> {
    const r = await this.db.room.create({
      data: {
        hotelId: data.hotelId,
        organizationId: data.organizationId,
        roomTypeId: data.roomTypeId,
        roomNumber: data.roomNumber,
        floor: data.floor,
        description: data.description ?? null,
        view: data.view ?? null,
        notes: data.notes ?? null,
      },
    });
    return toRoom(r);
  }

  async update(id: string, data: UpdateRoomData): Promise<Room> {
    const payload: Prisma.RoomUpdateInput = {};
    if (data.roomNumber !== undefined) payload.roomNumber = data.roomNumber;
    if (data.floor !== undefined) payload.floor = data.floor;
    if (data.description !== undefined) payload.description = data.description;
    if (data.view !== undefined) payload.view = data.view;
    if (data.notes !== undefined) payload.notes = data.notes;
    if (data.operationalStatus !== undefined)
      payload.operationalStatus = data.operationalStatus as PrismaRoomRecord["operationalStatus"];
    if (data.housekeepingStatus !== undefined)
      payload.housekeepingStatus = data.housekeepingStatus as PrismaRoomRecord["housekeepingStatus"];
    if (data.occupancyStatus !== undefined)
      payload.occupancyStatus = data.occupancyStatus as PrismaRoomRecord["occupancyStatus"];
    if (data.maintenanceStatus !== undefined)
      payload.maintenanceStatus = data.maintenanceStatus as PrismaRoomRecord["maintenanceStatus"];

    const r = await this.db.room.update({ where: { id }, data: payload });
    return toRoom(r);
  }

  async hardDelete(id: string): Promise<void> {
    await this.db.room.delete({ where: { id } });
  }

  async softDelete(id: string): Promise<void> {
    await this.db.room.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async updateOperationalStatus(id: string, status: RoomOperationalStatus): Promise<Room> {
    const r = await this.db.room.update({
      where: { id },
      data: { operationalStatus: status as PrismaRoomRecord["operationalStatus"] },
    });
    return toRoom(r);
  }

  async updateHousekeepingStatus(id: string, status: HousekeepingStatus): Promise<Room> {
    const r = await this.db.room.update({
      where: { id },
      data: {
        housekeepingStatus: status as PrismaRoomRecord["housekeepingStatus"],
        ...(status === "CLEAN" || status === "INSPECTED" ? { lastCleanedAt: new Date() } : {}),
      },
    });
    return toRoom(r);
  }

  async updateOccupancyStatus(id: string, status: OccupancyStatus): Promise<Room> {
    const r = await this.db.room.update({
      where: { id },
      data: { occupancyStatus: status as PrismaRoomRecord["occupancyStatus"] },
    });
    return toRoom(r);
  }

  async countByHotelAndType(hotelId: string, roomTypeId: string): Promise<number> {
    return this.db.room.count({ where: { hotelId, roomTypeId, deletedAt: null } });
  }

  async countAvailableByHotelAndType(hotelId: string, roomTypeId: string): Promise<number> {
    return this.db.room.count({
      where: {
        hotelId,
        roomTypeId,
        operationalStatus: "AVAILABLE",
        deletedAt: null,
      },
    });
  }
}
