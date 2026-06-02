import { BaseService } from "@lib/baseService";
import { prisma } from "@lib/prisma";
import { NotFoundError, ConflictError, ForbiddenError } from "@errors/HttpError";
import type { PaginatedResult } from "@shared-types";
import type { PrismaOTAMappingRepository } from "../repositories/PrismaOTAMappingRepository";
import type { PrismaOTAProviderRepository } from "../repositories/PrismaOTAProviderRepository";
import type { OTAMapping, OTAMappingFilter } from "../types";
import type {
  CreateOTAMappingDtoType,
  UpdateOTAMappingDtoType,
  OTAMappingFilterDtoType,
} from "../dto";
import { OTA_ERRORS } from "../constants";

export class OTAMappingService extends BaseService {
  protected readonly moduleName = "OTAMappingService";

  constructor(
    private readonly mappingRepo: PrismaOTAMappingRepository,
    private readonly providerRepo: PrismaOTAProviderRepository
  ) {
    super();
  }

  private async validateHotelAccess(hotelId: string, orgId: string): Promise<void> {
    const hotel = await prisma.hotel.findFirst({
      where: { id: hotelId, organizationId: orgId, deletedAt: null },
      select: { id: true },
    });
    if (!hotel) throw new NotFoundError(OTA_ERRORS.HOTEL_NOT_FOUND);
  }

  async createMapping(dto: CreateOTAMappingDtoType, orgId: string): Promise<OTAMapping> {
    return this.execute("createMapping", async () => {
      await this.validateHotelAccess(dto.hotelId, orgId);

      const provider = await this.providerRepo.findById(dto.providerId);
      if (!provider) throw new NotFoundError(OTA_ERRORS.PROVIDER_NOT_FOUND);
      if (provider.status !== "ACTIVE") throw new ForbiddenError(OTA_ERRORS.PROVIDER_INACTIVE);

      if (dto.roomTypeId !== undefined) {
        const roomType = await prisma.roomType.findFirst({
          where: { id: dto.roomTypeId, hotelId: dto.hotelId, deletedAt: null },
          select: { id: true },
        });
        if (!roomType) throw new NotFoundError(OTA_ERRORS.ROOM_TYPE_NOT_FOUND);

        const existing = await this.mappingRepo.findByRoomTypeAndProvider(dto.roomTypeId, dto.providerId);
        if (existing) throw new ConflictError(OTA_ERRORS.ROOM_MAPPING_EXISTS);
      } else {
        const existing = await this.mappingRepo.findByHotelAndProvider(dto.hotelId, dto.providerId);
        if (existing) throw new ConflictError(OTA_ERRORS.MAPPING_EXISTS);
      }

      return this.mappingRepo.create({
        organizationId: orgId,
        hotelId: dto.hotelId,
        roomTypeId: dto.roomTypeId,
        providerId: dto.providerId,
        externalHotelId: dto.externalHotelId,
        externalRoomTypeId: dto.externalRoomTypeId,
        metadata: dto.metadata,
      });
    });
  }

  async updateMapping(id: string, dto: UpdateOTAMappingDtoType, orgId: string): Promise<OTAMapping> {
    return this.execute("updateMapping", async () => {
      const mapping = await this.mappingRepo.findById(id);
      if (!mapping) throw new NotFoundError(OTA_ERRORS.MAPPING_NOT_FOUND);
      if (mapping.organizationId !== orgId) throw new ForbiddenError(OTA_ERRORS.MAPPING_NOT_FOUND);

      return this.mappingRepo.update(id, {
        isActive: dto.isActive,
        metadata: dto.metadata,
        externalRoomTypeId: dto.externalRoomTypeId,
      });
    });
  }

  async deleteMapping(id: string, orgId: string): Promise<void> {
    return this.execute("deleteMapping", async () => {
      const mapping = await this.mappingRepo.findById(id);
      if (!mapping) throw new NotFoundError(OTA_ERRORS.MAPPING_NOT_FOUND);
      if (mapping.organizationId !== orgId) throw new ForbiddenError(OTA_ERRORS.MAPPING_NOT_FOUND);

      await this.mappingRepo.hardDelete(id);
    });
  }

  async listMappings(filter: OTAMappingFilterDtoType, orgId: string): Promise<PaginatedResult<OTAMapping>> {
    return this.execute("listMappings", async () => {
      await this.validateHotelAccess(filter.hotelId, orgId);

      const f: OTAMappingFilter = {
        organizationId: orgId,
        hotelId: filter.hotelId,
        providerId: filter.providerId,
        roomTypeId: filter.roomTypeId,
        isActive: filter.isActive,
        syncStatus: filter.syncStatus,
        page: filter.page,
        limit: filter.limit,
      };

      return this.mappingRepo.findManyFiltered(f);
    });
  }

  async getMapping(id: string, orgId: string): Promise<OTAMapping> {
    return this.execute("getMapping", async () => {
      const mapping = await this.mappingRepo.findById(id);
      if (!mapping) throw new NotFoundError(OTA_ERRORS.MAPPING_NOT_FOUND);
      if (mapping.organizationId !== orgId) throw new ForbiddenError(OTA_ERRORS.MAPPING_NOT_FOUND);
      return mapping;
    });
  }
}
