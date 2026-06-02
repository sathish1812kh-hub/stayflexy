// FILE: src/modules/hotel/repositories/index.ts
import { BaseRepository } from "@lib/baseRepository";
import type { Nullable, PaginatedResult, PaginationParams } from "@shared-types";
import type { Hotel, CreateHotelData, UpdateHotelData } from "../types";

export abstract class HotelRepository extends BaseRepository<Hotel, CreateHotelData, UpdateHotelData> {
  abstract override findById(id: string): Promise<Nullable<Hotel>>;
  abstract override findMany(params: PaginationParams): Promise<PaginatedResult<Hotel>>;
  abstract override create(data: CreateHotelData): Promise<Hotel>;
  abstract override update(id: string, data: UpdateHotelData): Promise<Hotel>;
  abstract override hardDelete(id: string): Promise<void>;

  abstract findBySlug(orgId: string, slug: string): Promise<Nullable<Hotel>>;
  abstract findByHotel(orgId: string, params: PaginationParams): Promise<PaginatedResult<Hotel>>;
  abstract findByOrganization(orgId: string, params: PaginationParams): Promise<PaginatedResult<Hotel>>;
  abstract findByStatus(status: string, params: PaginationParams): Promise<PaginatedResult<Hotel>>;
  abstract findByType(type: string, params: PaginationParams): Promise<PaginatedResult<Hotel>>;

  abstract findManyFiltered(
    filters: { orgId?: string; status?: string; search?: string; city?: string; country?: string },
    params: PaginationParams
  ): Promise<PaginatedResult<Hotel>>;

  abstract softDelete(id: string): Promise<void>;
  abstract countByOrganization(orgId: string): Promise<number>;
  abstract findByHotelCode(orgId: string, code: string): Promise<Nullable<Hotel>>;
  abstract updateStatus(id: string, status: string): Promise<Hotel>;
  abstract updateOperationalStatus(id: string, status: string): Promise<Hotel>;
}
