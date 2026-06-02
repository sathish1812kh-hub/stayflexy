// FILE: src/modules/hotel/services/HotelService.ts
import { BaseService } from "@lib/baseService";
import { prisma } from "@lib/prisma";
import { NotFoundError, ConflictError, ForbiddenError, BadRequestError } from "@errors/HttpError";
import type { IHotelService, HotelSummary } from "@common/contracts/IHotelService";
import type { PaginatedResult, PaginationParams } from "@shared-types";
import type { PrismaHotelRepository } from "../repositories/PrismaHotelRepository";
import type { Hotel, HotelSettings, CreateHotelData } from "../types";
import type { CreateHotelDtoType, UpdateHotelDtoType, HotelFilterDtoType, HotelSettingsDtoType } from "../dto";
import { HOTEL_ERRORS, MAX_HOTELS_PER_ORGANIZATION, DEFAULT_TIMEZONE, DEFAULT_CURRENCY } from "../constants";
import { validateTimezone } from "../validators";

export class HotelService extends BaseService implements IHotelService {
  protected readonly moduleName = "HotelService";

  constructor(private readonly hotelRepo: PrismaHotelRepository) {
    super();
  }

  // ─── IHotelService contract ───────────────────────────────────────────────────

  async findById(id: string) {
    return this.execute("findById", async () => {
      const hotel = await this.hotelRepo.findById(id);
      return hotel ? this.toHotelSummary(hotel) : null;
    });
  }

  async findByOrganization(orgId: string, params: PaginationParams): Promise<PaginatedResult<HotelSummary>> {
    return this.execute("findByOrganization", async () => {
      const result = await this.hotelRepo.findByOrganization(orgId, params);
      return { data: result.data.map((h) => this.toHotelSummary(h)), meta: result.meta };
    });
  }

  async validateOwnership(hotelId: string, orgId: string): Promise<boolean> {
    return this.execute("validateOwnership", async () => {
      const hotel = await this.hotelRepo.findById(hotelId);
      return hotel?.organizationId === orgId;
    });
  }

  async getRoomIds(_hotelId: string): Promise<string[]> {
    // Room schema not yet implemented — returns empty array
    // Will be wired to prisma.room.findMany when room.prisma is created
    return [];
  }

  async isOperational(hotelId: string): Promise<boolean> {
    return this.execute("isOperational", async () => {
      const hotel = await this.hotelRepo.findById(hotelId);
      if (!hotel) return false;
      return hotel.status === "ACTIVE" && hotel.operationalStatus === "OPEN";
    });
  }

  // ─── Extended hotel management ────────────────────────────────────────────────

  async createHotel(
    dto: CreateHotelDtoType,
    organizationId: string,
    _createdById?: string
  ): Promise<Hotel> {
    return this.execute("createHotel", async () => {
      // Validate org hotel limit
      const count = await this.hotelRepo.countByOrganization(organizationId);
      if (count >= MAX_HOTELS_PER_ORGANIZATION) {
        throw new BadRequestError(HOTEL_ERRORS.ORGANIZATION_LIMIT_REACHED);
      }

      // Validate timezone
      const tz = dto.timezone ?? DEFAULT_TIMEZONE;
      if (!validateTimezone(tz)) {
        throw new BadRequestError(HOTEL_ERRORS.INVALID_TIMEZONE);
      }

      // Generate slug from name if not provided
      const slug = dto.slug ?? this.generateSlug(dto.name, dto.city);
      const existingSlug = await this.hotelRepo.findBySlug(organizationId, slug);
      if (existingSlug) throw new ConflictError(HOTEL_ERRORS.SLUG_TAKEN);

      // Check hotelCode uniqueness within org
      const code = dto.hotelCode ?? this.generateHotelCode(dto.name, dto.city);
      if (code) {
        const existingCode = await this.hotelRepo.findByHotelCode(organizationId, code);
        if (existingCode) throw new ConflictError(HOTEL_ERRORS.CODE_TAKEN);
      }

      const data: CreateHotelData = {
        name: dto.name,
        slug,
        hotelCode: code ?? null,
        organizationId,
        status: "ACTIVE",
        operationalStatus: dto.operationalStatus ?? "PRE_OPENING",
        category: dto.category,
        starRating: dto.starRating ?? 3,
        email: dto.email,
        phone: dto.phone,
        website: dto.website ?? null,
        description: dto.description ?? null,
        timezone: tz,
        currency: dto.currency ?? DEFAULT_CURRENCY,
        addressLine1: dto.addressLine1,
        addressLine2: dto.addressLine2 ?? null,
        city: dto.city,
        state: dto.state ?? null,
        country: dto.country,
        postalCode: dto.postalCode ?? null,
        latitude: dto.latitude ?? null,
        longitude: dto.longitude ?? null,
        checkInTime: dto.checkInTime ?? "14:00",
        checkOutTime: dto.checkOutTime ?? "11:00",
        totalRooms: dto.totalRooms ?? 1,
        amenities: dto.amenities ?? [],
      };

      const hotel = await this.hotelRepo.create(data);
      this.getLogger().info("Hotel created", { hotelId: hotel.id, orgId: organizationId });
      return hotel;
    });
  }

  async updateHotel(id: string, dto: UpdateHotelDtoType, orgId: string): Promise<Hotel> {
    return this.execute("updateHotel", async () => {
      const hotel = await this.requireHotelInOrg(id, orgId);

      if (dto.slug && dto.slug !== hotel.slug) {
        const existing = await this.hotelRepo.findBySlug(orgId, dto.slug);
        if (existing) throw new ConflictError(HOTEL_ERRORS.SLUG_TAKEN);
      }

      if (dto.timezone && !validateTimezone(dto.timezone)) {
        throw new BadRequestError(HOTEL_ERRORS.INVALID_TIMEZONE);
      }

      const updated = await this.hotelRepo.update(id, dto);
      this.getLogger().info("Hotel updated", { hotelId: id });
      return updated;
    });
  }

  async deleteHotel(id: string, orgId: string): Promise<void> {
    return this.execute("deleteHotel", async () => {
      await this.requireHotelInOrg(id, orgId);
      await this.hotelRepo.softDelete(id);
      this.getLogger().info("Hotel soft-deleted", { hotelId: id });
    });
  }

  async updateHotelStatus(id: string, status: string, orgId: string | undefined): Promise<Hotel> {
    return this.execute("updateHotelStatus", async () => {
      if (orgId) await this.requireHotelInOrg(id, orgId);
      const updated = await this.hotelRepo.updateStatus(id, status);
      this.getLogger().info("Hotel status updated", { hotelId: id, status });
      return updated;
    });
  }

  async updateOperationalStatus(id: string, status: string, orgId: string | undefined): Promise<Hotel> {
    return this.execute("updateOperationalStatus", async () => {
      if (orgId) await this.requireHotelInOrg(id, orgId);
      const updated = await this.hotelRepo.updateOperationalStatus(id, status);
      this.getLogger().info("Hotel operational status updated", { hotelId: id, status });
      return updated;
    });
  }

  async getHotelSettings(id: string, orgId: string | undefined): Promise<HotelSettings> {
    return this.execute("getHotelSettings", async () => {
      const hotel = orgId
        ? await this.requireHotelInOrg(id, orgId)
        : await this.requireHotel(id);
      return {
        timezone: hotel.timezone,
        currency: hotel.currency,
        checkInTime: hotel.checkInTime,
        checkOutTime: hotel.checkOutTime,
        amenities: hotel.amenities,
      };
    });
  }

  async updateHotelSettings(
    id: string,
    dto: HotelSettingsDtoType,
    orgId: string | undefined
  ): Promise<HotelSettings> {
    return this.execute("updateHotelSettings", async () => {
      if (orgId) await this.requireHotelInOrg(id, orgId);

      if (dto.timezone && !validateTimezone(dto.timezone)) {
        throw new BadRequestError(HOTEL_ERRORS.INVALID_TIMEZONE);
      }

      const updateData: Record<string, unknown> = {};
      if (dto.timezone) updateData["timezone"] = dto.timezone;
      if (dto.currency) updateData["currency"] = dto.currency;
      if (dto.checkInTime) updateData["checkInTime"] = dto.checkInTime;
      if (dto.checkOutTime) updateData["checkOutTime"] = dto.checkOutTime;
      if (dto.amenities) updateData["amenities"] = dto.amenities;

      await prisma.hotel.update({ where: { id }, data: updateData });
      return this.getHotelSettings(id, orgId);
    });
  }

  async listHotels(
    orgId: string | undefined,
    params: HotelFilterDtoType
  ): Promise<PaginatedResult<HotelSummary>> {
    return this.execute("listHotels", async () => {
      const pagination: PaginationParams = { page: params.page, limit: params.limit };
      const result = await this.hotelRepo.findManyFiltered(
        { orgId, status: params.status, search: params.search, city: params.city, country: params.country },
        pagination
      );
      return { data: result.data.map((h) => this.toHotelSummary(h)), meta: result.meta };
    });
  }

  // ─── Private helpers ──────────────────────────────────────────────────────────

  private async requireHotel(id: string): Promise<Hotel> {
    const hotel = await this.hotelRepo.findById(id);
    if (!hotel) throw new NotFoundError(HOTEL_ERRORS.NOT_FOUND);
    return hotel;
  }

  private async requireHotelInOrg(id: string, orgId: string): Promise<Hotel> {
    const hotel = await this.requireHotel(id);
    if (hotel.organizationId !== orgId) {
      throw new ForbiddenError(HOTEL_ERRORS.OWNERSHIP_MISMATCH);
    }
    return hotel;
  }

  private toHotelSummary(hotel: Hotel): HotelSummary {
    return {
      id: hotel.id,
      hotelId: hotel.id,
      name: hotel.name,
      organizationId: hotel.organizationId,
      status: hotel.status,
      city: hotel.address.city,
      country: hotel.address.country,
      starRating: hotel.starRating,
      totalRooms: hotel.totalRooms,
    };
  }

  private generateSlug(name: string, city?: string): string {
    const base = city ? `${name} ${city}` : name;
    return base
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 60);
  }

  private generateHotelCode(name: string, city?: string): string {
    const namePart = name.slice(0, 5).toUpperCase().replace(/[^A-Z0-9]/g, "");
    const cityPart = city ? city.slice(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, "") : "";
    return cityPart ? `${namePart}-${cityPart}` : namePart;
  }
}
