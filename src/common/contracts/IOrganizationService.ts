import type { Nullable, PaginatedResult, PaginationParams } from "@shared-types";

export interface OrganizationSummary {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  hotelCount: number;
}

export interface IOrganizationService {
  findById(id: string): Promise<Nullable<OrganizationSummary>>;
  findBySlug(slug: string): Promise<Nullable<OrganizationSummary>>;
  findMany(params: PaginationParams): Promise<PaginatedResult<OrganizationSummary>>;
  validateMembership(userId: string, organizationId: string): Promise<boolean>;
  getHotelIds(organizationId: string): Promise<string[]>;
}
