// FILE: src/modules/room/services/RoomTypeService.ts
import { BaseService } from "@lib/baseService";
import { prisma } from "@lib/prisma";
import { NotFoundError, ConflictError, ForbiddenError, BadRequestError } from "@errors/HttpError";
import type { Nullable, PaginatedResult, PaginationParams } from "@shared-types";
import type { RoomTypeRepository } from "../repositories";
import type { RoomType, RoomTypeStatus } from "../types";
import type { CreateRoomTypeDtoType, UpdateRoomTypeDtoType, RoomTypeFilterDtoType } from "../dto";
import { ROOM_TYPE_ERRORS } from "../constants";

export class RoomTypeService extends BaseService {
  protected readonly moduleName = "RoomTypeService";

  constructor(private readonly roomTypeRepo: RoomTypeRepository) {
    super();
  }

  // ─── Public methods ───────────────────────────────────────────────────────────

  async createRoomType(dto: CreateRoomTypeDtoType, organizationId: string): Promise<RoomType> {
    return this.execute("createRoomType", async () => {
      // Verify hotel belongs to org
      const hotel = await prisma.hotel.findFirst({
        where: { id: dto.hotelId, organizationId, deletedAt: null },
      });
      if (!hotel) throw new NotFoundError(ROOM_TYPE_ERRORS.HOTEL_NOT_FOUND);

      // Generate or validate slug
      const slug = dto.slug ?? this.generateSlug(dto.name);

      // Check slug uniqueness within hotel
      const existing = await this.roomTypeRepo.findBySlug(dto.hotelId, slug);
      if (existing) throw new ConflictError(ROOM_TYPE_ERRORS.SLUG_TAKEN);

      const roomType = await this.roomTypeRepo.create({
        hotelId: dto.hotelId,
        organizationId,
        name: dto.name,
        slug,
        description: dto.description ?? null,
        maxAdults: dto.maxAdults,
        maxChildren: dto.maxChildren,
        maxOccupancy: dto.maxOccupancy,
        basePrice: dto.basePrice,
        sizeM2: dto.sizeM2 ?? null,
        bedType: dto.bedType as RoomType["bedType"],
        amenities: dto.amenities ?? [],
        status: "ACTIVE",
      });

      this.getLogger().info("Room type created", {
        roomTypeId: roomType.id,
        hotelId: dto.hotelId,
        orgId: organizationId,
      });

      return roomType;
    });
  }

  async updateRoomType(
    id: string,
    dto: UpdateRoomTypeDtoType,
    orgId: string
  ): Promise<RoomType> {
    return this.execute("updateRoomType", async () => {
      const roomType = await this.requireRoomTypeInOrg(id, orgId);

      // Check slug uniqueness if slug is being changed
      if (dto.slug && dto.slug !== roomType.slug) {
        const existing = await this.roomTypeRepo.findBySlug(roomType.hotelId, dto.slug);
        if (existing) throw new ConflictError(ROOM_TYPE_ERRORS.SLUG_TAKEN);
      }

      const updated = await this.roomTypeRepo.update(id, {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        maxAdults: dto.maxAdults,
        maxChildren: dto.maxChildren,
        maxOccupancy: dto.maxOccupancy,
        basePrice: dto.basePrice,
        sizeM2: dto.sizeM2,
        bedType: dto.bedType as RoomType["bedType"] | undefined,
        amenities: dto.amenities,
        status: dto.status as RoomTypeStatus | undefined,
      });

      this.getLogger().info("Room type updated", { roomTypeId: id, orgId });
      return updated;
    });
  }

  async deleteRoomType(id: string, orgId: string): Promise<void> {
    return this.execute("deleteRoomType", async () => {
      const roomType = await this.requireRoomTypeInOrg(id, orgId);

      // Cannot delete a room type that still has physical rooms
      const roomCount = await prisma.room.count({
        where: { roomTypeId: roomType.id, deletedAt: null },
      });
      if (roomCount > 0) throw new BadRequestError(ROOM_TYPE_ERRORS.HAS_ROOMS);

      await this.roomTypeRepo.softDelete(id);
      this.getLogger().info("Room type soft-deleted", { roomTypeId: id, orgId });
    });
  }

  async findById(id: string): Promise<Nullable<RoomType>> {
    return this.execute("findById", async () => {
      return this.roomTypeRepo.findById(id);
    });
  }

  async findByHotel(
    hotelId: string,
    orgId: string,
    params: PaginationParams
  ): Promise<PaginatedResult<RoomType>> {
    return this.execute("findByHotel", async () => {
      // Verify hotel belongs to org
      const hotel = await prisma.hotel.findFirst({
        where: { id: hotelId, organizationId: orgId, deletedAt: null },
      });
      if (!hotel) throw new NotFoundError(ROOM_TYPE_ERRORS.HOTEL_NOT_FOUND);

      return this.roomTypeRepo.findByHotel(hotelId, params);
    });
  }

  async listRoomTypes(
    orgId: string,
    params: RoomTypeFilterDtoType
  ): Promise<PaginatedResult<RoomType>> {
    return this.execute("listRoomTypes", async () => {
      // Verify hotel belongs to org
      const hotel = await prisma.hotel.findFirst({
        where: { id: params.hotelId, organizationId: orgId, deletedAt: null },
      });
      if (!hotel) throw new NotFoundError(ROOM_TYPE_ERRORS.HOTEL_NOT_FOUND);

      const pagination: PaginationParams = { page: params.page, limit: params.limit };
      // findByHotel returns all types for the hotel; client can filter by status client-side,
      // or we rely on the concrete repo to accept optional filters.
      // For correctness we fetch by hotel and apply status filter in the repo layer.
      if (params.status) {
        return this.roomTypeRepo.findByHotelAndStatus(params.hotelId, params.status as RoomTypeStatus, pagination);
      }

      return this.roomTypeRepo.findByHotel(params.hotelId, pagination);
    });
  }

  async updateStatus(id: string, status: RoomTypeStatus, orgId: string): Promise<RoomType> {
    return this.execute("updateStatus", async () => {
      await this.requireRoomTypeInOrg(id, orgId);
      const updated = await this.roomTypeRepo.update(id, { status });
      this.getLogger().info("Room type status updated", { roomTypeId: id, status, orgId });
      return updated;
    });
  }

  // ─── Private helpers ──────────────────────────────────────────────────────────

  private async requireRoomTypeInOrg(id: string, orgId: string): Promise<RoomType> {
    const roomType = await this.roomTypeRepo.findById(id);
    if (!roomType) throw new NotFoundError(ROOM_TYPE_ERRORS.NOT_FOUND);
    if (roomType.organizationId !== orgId) {
      throw new ForbiddenError(ROOM_TYPE_ERRORS.FORBIDDEN);
    }
    return roomType;
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 80);
  }
}
