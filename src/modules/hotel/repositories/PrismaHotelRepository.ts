// FILE: src/modules/hotel/repositories/PrismaHotelRepository.ts
import { type Prisma } from "@prisma/client";
import { HotelRepository } from "./index";
import type { Hotel, CreateHotelData, UpdateHotelData } from "../types";
import type { Nullable, PaginatedResult, PaginationParams } from "@shared-types";

type PrismaHotel = Prisma.HotelGetPayload<Record<string, never>>;

function toHotel(r: PrismaHotel): Hotel {
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    hotelCode: r.hotelCode,
    organizationId: r.organizationId,
    status: r.status as Hotel["status"],
    operationalStatus: r.operationalStatus as Hotel["operationalStatus"],
    category: r.category as Hotel["category"],
    starRating: r.starRating,
    email: r.email,
    phone: r.phone,
    website: r.website,
    description: r.description,
    timezone: r.timezone,
    currency: r.currency,
    address: {
      addressLine1: r.addressLine1,
      addressLine2: r.addressLine2,
      city: r.city,
      state: r.state,
      country: r.country,
      postalCode: r.postalCode,
      latitude: r.latitude ? Number(r.latitude) : null,
      longitude: r.longitude ? Number(r.longitude) : null,
    },
    checkInTime: r.checkInTime,
    checkOutTime: r.checkOutTime,
    totalRooms: r.totalRooms,
    amenities: r.amenities,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    deletedAt: r.deletedAt,
  };
}

export class PrismaHotelRepository extends HotelRepository {
  async findById(id: string): Promise<Nullable<Hotel>> {
    const r = await this.db.hotel.findFirst({ where: { id, deletedAt: null } });
    return r ? toHotel(r) : null;
  }

  async findBySlug(orgId: string, slug: string): Promise<Nullable<Hotel>> {
    const r = await this.db.hotel.findFirst({
      where: { organizationId: orgId, slug, deletedAt: null },
    });
    return r ? toHotel(r) : null;
  }

  async findByHotel(orgId: string, params: PaginationParams): Promise<PaginatedResult<Hotel>> {
    return this.findByOrganization(orgId, params);
  }

  async findByOrganization(orgId: string, params: PaginationParams): Promise<PaginatedResult<Hotel>> {
    const skip = this.buildSkip(params);
    const where = { organizationId: orgId, deletedAt: null };
    const [records, total] = await Promise.all([
      this.db.hotel.findMany({ where, skip, take: params.limit, orderBy: { createdAt: "desc" } }),
      this.db.hotel.count({ where }),
    ]);
    return { data: records.map(toHotel), meta: this.buildPaginationMeta(total, params) };
  }

  async findByStatus(status: string, params: PaginationParams): Promise<PaginatedResult<Hotel>> {
    const skip = this.buildSkip(params);
    const where = { status: status as PrismaHotel["status"], deletedAt: null };
    const [records, total] = await Promise.all([
      this.db.hotel.findMany({ where, skip, take: params.limit }),
      this.db.hotel.count({ where }),
    ]);
    return { data: records.map(toHotel), meta: this.buildPaginationMeta(total, params) };
  }

  async findByType(category: string, params: PaginationParams): Promise<PaginatedResult<Hotel>> {
    const skip = this.buildSkip(params);
    const where = { category: category as PrismaHotel["category"], deletedAt: null };
    const [records, total] = await Promise.all([
      this.db.hotel.findMany({ where, skip, take: params.limit }),
      this.db.hotel.count({ where }),
    ]);
    return { data: records.map(toHotel), meta: this.buildPaginationMeta(total, params) };
  }

  async findMany(params: PaginationParams): Promise<PaginatedResult<Hotel>> {
    const skip = this.buildSkip(params);
    const where = { deletedAt: null };
    const [records, total] = await Promise.all([
      this.db.hotel.findMany({ where, skip, take: params.limit, orderBy: { createdAt: "desc" } }),
      this.db.hotel.count({ where }),
    ]);
    return { data: records.map(toHotel), meta: this.buildPaginationMeta(total, params) };
  }

  async findManyFiltered(
    filters: { orgId?: string; status?: string; search?: string; city?: string; country?: string },
    params: PaginationParams
  ): Promise<PaginatedResult<Hotel>> {
    const skip = this.buildSkip(params);
    const where: Prisma.HotelWhereInput = {
      deletedAt: null,
      ...(filters.orgId && { organizationId: filters.orgId }),
      ...(filters.status && { status: filters.status as PrismaHotel["status"] }),
      ...(filters.city && { city: { contains: filters.city, mode: "insensitive" } }),
      ...(filters.country && { country: filters.country.toUpperCase() }),
      ...(filters.search && {
        OR: [
          { name: { contains: filters.search, mode: "insensitive" } },
          { city: { contains: filters.search, mode: "insensitive" } },
        ],
      }),
    };
    const [records, total] = await Promise.all([
      this.db.hotel.findMany({ where, skip, take: params.limit, orderBy: { createdAt: "desc" } }),
      this.db.hotel.count({ where }),
    ]);
    return { data: records.map(toHotel), meta: this.buildPaginationMeta(total, params) };
  }

  async create(data: CreateHotelData): Promise<Hotel> {
    const r = await this.db.hotel.create({
      data: {
        name: data.name,
        slug: data.slug,
        hotelCode: data.hotelCode ?? null,
        organizationId: data.organizationId,
        status: data.status as PrismaHotel["status"],
        operationalStatus: data.operationalStatus as PrismaHotel["operationalStatus"],
        category: data.category as PrismaHotel["category"],
        starRating: data.starRating,
        email: data.email,
        phone: data.phone,
        website: data.website ?? null,
        description: data.description ?? null,
        timezone: data.timezone,
        currency: data.currency,
        addressLine1: data.addressLine1,
        addressLine2: data.addressLine2 ?? null,
        city: data.city,
        state: data.state ?? null,
        country: data.country,
        postalCode: data.postalCode ?? null,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        checkInTime: data.checkInTime,
        checkOutTime: data.checkOutTime,
        totalRooms: data.totalRooms,
        amenities: data.amenities,
      },
    });
    return toHotel(r);
  }

  async update(id: string, data: UpdateHotelData): Promise<Hotel> {
    const payload: Prisma.HotelUpdateInput = {};
    if (data.name !== undefined) payload.name = data.name;
    if (data.slug !== undefined) payload.slug = data.slug;
    if (data.hotelCode !== undefined) payload.hotelCode = data.hotelCode;
    if (data.status !== undefined) payload.status = data.status as PrismaHotel["status"];
    if (data.operationalStatus !== undefined) payload.operationalStatus = data.operationalStatus as PrismaHotel["operationalStatus"];
    if (data.category !== undefined) payload.category = data.category as PrismaHotel["category"];
    if (data.starRating !== undefined) payload.starRating = data.starRating;
    if (data.email !== undefined) payload.email = data.email;
    if (data.phone !== undefined) payload.phone = data.phone;
    if (data.website !== undefined) payload.website = data.website;
    if (data.description !== undefined) payload.description = data.description;
    if (data.timezone !== undefined) payload.timezone = data.timezone;
    if (data.currency !== undefined) payload.currency = data.currency;
    if (data.addressLine1 !== undefined) payload.addressLine1 = data.addressLine1;
    if (data.addressLine2 !== undefined) payload.addressLine2 = data.addressLine2;
    if (data.city !== undefined) payload.city = data.city;
    if (data.state !== undefined) payload.state = data.state;
    if (data.country !== undefined) payload.country = data.country;
    if (data.postalCode !== undefined) payload.postalCode = data.postalCode;
    if (data.checkInTime !== undefined) payload.checkInTime = data.checkInTime;
    if (data.checkOutTime !== undefined) payload.checkOutTime = data.checkOutTime;
    if (data.totalRooms !== undefined) payload.totalRooms = data.totalRooms;
    if (data.amenities !== undefined) payload.amenities = data.amenities;
    const r = await this.db.hotel.update({ where: { id }, data: payload });
    return toHotel(r);
  }

  async hardDelete(id: string): Promise<void> {
    await this.db.hotel.delete({ where: { id } });
  }

  async softDelete(id: string): Promise<void> {
    await this.db.hotel.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async countByOrganization(orgId: string): Promise<number> {
    return this.db.hotel.count({ where: { organizationId: orgId, deletedAt: null } });
  }

  async findByHotelCode(orgId: string, code: string): Promise<Nullable<Hotel>> {
    const r = await this.db.hotel.findFirst({
      where: { organizationId: orgId, hotelCode: code, deletedAt: null },
    });
    return r ? toHotel(r) : null;
  }

  async updateStatus(id: string, status: string): Promise<Hotel> {
    const r = await this.db.hotel.update({
      where: { id },
      data: { status: status as PrismaHotel["status"] },
    });
    return toHotel(r);
  }

  async updateOperationalStatus(id: string, status: string): Promise<Hotel> {
    const r = await this.db.hotel.update({
      where: { id },
      data: { operationalStatus: status as PrismaHotel["operationalStatus"] },
    });
    return toHotel(r);
  }
}
