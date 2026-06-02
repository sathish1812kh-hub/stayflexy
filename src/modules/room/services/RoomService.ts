// FILE: src/modules/room/services/RoomService.ts
import { BaseService } from "@lib/baseService";
import { prisma } from "@lib/prisma";
import { NotFoundError, ConflictError, ForbiddenError } from "@errors/HttpError";
import type { Nullable, PaginatedResult, PaginationParams } from "@shared-types";
import type { RoomRepository, RoomTypeRepository } from "../repositories";
import type { Room, RoomOperationalStatus, HousekeepingStatus, OccupancyStatus } from "../types";
import type { CreateRoomDtoType, UpdateRoomDtoType, RoomFilterDtoType } from "../dto";
import { ROOM_ERRORS } from "../constants";

export class RoomService extends BaseService {
  protected readonly moduleName = "RoomService";

  constructor(
    private readonly roomRepo: RoomRepository,
    private readonly roomTypeRepo: RoomTypeRepository
  ) {
    super();
  }

  // ─── Public methods ───────────────────────────────────────────────────────────

  async createRoom(dto: CreateRoomDtoType, organizationId: string): Promise<Room> {
    return this.execute("createRoom", async () => {
      // Verify hotel belongs to org
      const hotel = await prisma.hotel.findFirst({
        where: { id: dto.hotelId, organizationId, deletedAt: null },
      });
      if (!hotel) throw new NotFoundError(ROOM_ERRORS.HOTEL_NOT_FOUND);

      // Verify room type exists and belongs to this hotel
      const roomType = await this.roomTypeRepo.findById(dto.roomTypeId);
      if (!roomType || roomType.hotelId !== dto.hotelId) {
        throw new NotFoundError(ROOM_ERRORS.ROOM_TYPE_NOT_FOUND);
      }

      // Check room number uniqueness within hotel
      const existing = await this.roomRepo.findByNumber(dto.hotelId, dto.roomNumber);
      if (existing) throw new ConflictError(ROOM_ERRORS.NUMBER_TAKEN);

      const room = await this.roomRepo.create({
        hotelId: dto.hotelId,
        organizationId,
        roomTypeId: dto.roomTypeId,
        roomNumber: dto.roomNumber,
        floor: dto.floor,
        description: dto.description ?? null,
        view: dto.view ?? null,
        notes: dto.notes ?? null,
      });

      // Increment totalRooms counter on the room type
      await this.roomTypeRepo.incrementTotalRooms(dto.roomTypeId, 1);

      this.getLogger().info("Room created", {
        roomId: room.id,
        hotelId: dto.hotelId,
        orgId: organizationId,
      });

      return room;
    });
  }

  async updateRoom(id: string, dto: UpdateRoomDtoType, orgId: string): Promise<Room> {
    return this.execute("updateRoom", async () => {
      const room = await this.requireRoomInOrg(id, orgId);

      // Check room number uniqueness if changed
      if (dto.roomNumber && dto.roomNumber !== room.roomNumber) {
        const existing = await this.roomRepo.findByNumber(room.hotelId, dto.roomNumber);
        if (existing) throw new ConflictError(ROOM_ERRORS.NUMBER_TAKEN);
      }

      const updated = await this.roomRepo.update(id, {
        roomNumber: dto.roomNumber,
        floor: dto.floor,
        description: dto.description,
        view: dto.view,
        notes: dto.notes,
      });

      this.getLogger().info("Room updated", { roomId: id, orgId });
      return updated;
    });
  }

  async deleteRoom(id: string, orgId: string): Promise<void> {
    return this.execute("deleteRoom", async () => {
      const room = await this.requireRoomInOrg(id, orgId);

      await this.roomRepo.softDelete(id);

      // Decrement totalRooms counter on the room type
      await this.roomTypeRepo.incrementTotalRooms(room.roomTypeId, -1);

      this.getLogger().info("Room soft-deleted", { roomId: id, orgId });
    });
  }

  async findById(id: string): Promise<Nullable<Room>> {
    return this.execute("findById", async () => {
      return this.roomRepo.findById(id);
    });
  }

  async findByHotel(
    hotelId: string,
    orgId: string,
    params: PaginationParams
  ): Promise<PaginatedResult<Room>> {
    return this.execute("findByHotel", async () => {
      const hotel = await prisma.hotel.findFirst({
        where: { id: hotelId, organizationId: orgId, deletedAt: null },
      });
      if (!hotel) throw new NotFoundError(ROOM_ERRORS.HOTEL_NOT_FOUND);

      return this.roomRepo.findByHotel(hotelId, params);
    });
  }

  async listRooms(
    hotelId: string,
    orgId: string,
    params: RoomFilterDtoType
  ): Promise<PaginatedResult<Room>> {
    return this.execute("listRooms", async () => {
      const hotel = await prisma.hotel.findFirst({
        where: { id: hotelId, organizationId: orgId, deletedAt: null },
      });
      if (!hotel) throw new NotFoundError(ROOM_ERRORS.HOTEL_NOT_FOUND);

      const pagination: PaginationParams = { page: params.page, limit: params.limit };

      return this.roomRepo.findManyFiltered(
        {
          hotelId,
          roomTypeId: params.roomTypeId,
          operationalStatus: params.operationalStatus as RoomOperationalStatus | undefined,
          housekeepingStatus: params.housekeepingStatus as HousekeepingStatus | undefined,
          occupancyStatus: params.occupancyStatus as OccupancyStatus | undefined,
          floor: params.floor,
        },
        pagination
      );
    });
  }

  async updateOperationalStatus(
    id: string,
    status: RoomOperationalStatus,
    orgId: string
  ): Promise<Room> {
    return this.execute("updateOperationalStatus", async () => {
      await this.requireRoomInOrg(id, orgId);
      const updated = await this.roomRepo.updateOperationalStatus(id, status);
      this.getLogger().info("Room operational status updated", { roomId: id, status, orgId });
      return updated;
    });
  }

  async updateHousekeepingStatus(
    id: string,
    status: HousekeepingStatus,
    orgId: string
  ): Promise<Room> {
    return this.execute("updateHousekeepingStatus", async () => {
      await this.requireRoomInOrg(id, orgId);
      const updated = await this.roomRepo.updateHousekeepingStatus(id, status);
      this.getLogger().info("Room housekeeping status updated", { roomId: id, status, orgId });
      return updated;
    });
  }

  async getCountByRoomType(
    hotelId: string,
    roomTypeId: string
  ): Promise<{ total: number; available: number }> {
    return this.execute("getCountByRoomType", async () => {
      const [total, available] = await Promise.all([
        this.roomRepo.countByHotelAndType(hotelId, roomTypeId),
        this.roomRepo.countAvailableByHotelAndType(hotelId, roomTypeId),
      ]);
      return { total, available };
    });
  }

  // ─── Private helpers ──────────────────────────────────────────────────────────

  private async requireRoomInOrg(id: string, orgId: string): Promise<Room> {
    const room = await this.roomRepo.findById(id);
    if (!room) throw new NotFoundError(ROOM_ERRORS.NOT_FOUND);

    // Verify the hotel the room belongs to is in the org
    const hotel = await prisma.hotel.findFirst({
      where: { id: room.hotelId, organizationId: orgId, deletedAt: null },
    });
    if (!hotel) throw new ForbiddenError(ROOM_ERRORS.FORBIDDEN);

    return room;
  }
}
