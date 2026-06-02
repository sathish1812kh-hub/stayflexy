import { BaseService } from "@lib/baseService";
import { prisma } from "@lib/prisma";
import { NotFoundError, ConflictError, ForbiddenError } from "@errors/HttpError";
import type { PaginatedResult } from "@shared-types";
import type { PrismaOTAReservationRepository } from "../repositories/PrismaOTAReservationRepository";
import type { PrismaOTAProviderRepository } from "../repositories/PrismaOTAProviderRepository";
import type { OTAReservation, OTAReservationFilter } from "../types";
import type { IngestReservationDtoType, OTAReservationFilterDtoType } from "../dto";
import { OTA_ERRORS } from "../constants";

export class OTAReservationService extends BaseService {
  protected readonly moduleName = "OTAReservationService";

  constructor(
    private readonly reservationRepo: PrismaOTAReservationRepository,
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

  async ingestReservation(dto: IngestReservationDtoType, orgId: string): Promise<OTAReservation> {
    return this.execute("ingestReservation", async () => {
      await this.validateHotelAccess(dto.hotelId, orgId);

      const provider = await this.providerRepo.findById(dto.providerId);
      if (!provider) throw new NotFoundError(OTA_ERRORS.PROVIDER_NOT_FOUND);
      if (provider.status !== "ACTIVE") throw new ForbiddenError(OTA_ERRORS.PROVIDER_INACTIVE);

      const existing = await this.reservationRepo.findByExternalId(
        dto.providerId,
        dto.externalReservationId
      );

      if (existing) {
        if (existing.syncStatus === "IMPORTED") {
          throw new ConflictError(OTA_ERRORS.RESERVATION_DUPLICATE);
        }
        return existing;
      }

      return this.reservationRepo.create({
        organizationId: orgId,
        hotelId: dto.hotelId,
        providerId: dto.providerId,
        externalReservationId: dto.externalReservationId,
        rawPayload: dto.rawPayload,
      });
    });
  }

  async listReservations(
    filter: OTAReservationFilterDtoType,
    orgId: string
  ): Promise<PaginatedResult<OTAReservation>> {
    return this.execute("listReservations", async () => {
      if (filter.hotelId !== undefined) {
        await this.validateHotelAccess(filter.hotelId, orgId);
      }

      const f: OTAReservationFilter = {
        organizationId: orgId,
        hotelId: filter.hotelId,
        providerId: filter.providerId,
        syncStatus: filter.syncStatus,
        page: filter.page,
        limit: filter.limit,
      };

      return this.reservationRepo.findManyFiltered(f);
    });
  }

  async getReservation(id: string, orgId: string): Promise<OTAReservation> {
    return this.execute("getReservation", async () => {
      const reservation = await this.reservationRepo.findById(id);
      if (!reservation) throw new NotFoundError(OTA_ERRORS.RESERVATION_NOT_FOUND);
      if (reservation.organizationId !== orgId) throw new ForbiddenError(OTA_ERRORS.RESERVATION_NOT_FOUND);
      return reservation;
    });
  }
}
