import type { Organization } from '../entities/Organization'
import type { PaginatedResult } from '@stayflexi/shared-types'

export interface CreateOrganizationData {
  name: string
  legalName?: string
  slug: string
  email: string
  phone?: string
  website?: string
  country: string
  ownerId: string
  createdById?: string
}

export interface UpdateOrganizationData {
  name?: string
  legalName?: string
  email?: string
  phone?: string
  website?: string
  logoUrl?: string
  country?: string
}

export interface OrgFilter {
  ownerId?: string
  status?: string
  plan?: string
  page: number
  limit: number
}

export interface IOrganizationRepository {
  findById(id: string): Promise<Organization | null>
  findBySlug(slug: string): Promise<Organization | null>
  findByOwnerId(ownerId: string): Promise<Organization | null>
  create(data: CreateOrganizationData): Promise<Organization>
  update(id: string, data: UpdateOrganizationData): Promise<Organization>
  setOwner(id: string, newOwnerId: string): Promise<Organization>
  softDelete(id: string): Promise<void>
  findMany(filter: OrgFilter): Promise<PaginatedResult<Organization>>
}
