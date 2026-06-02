import type { Hotel, HotelStatus } from '../entities/Hotel'
import type { PaginatedResult } from '@stayflexi/shared-types'

export interface CreateHotelData {
  organizationId: string
  name: string
  slug: string
  address?: string
  city: string
  state?: string
  country: string
  postalCode?: string
  phone?: string
  email?: string
  website?: string
  starRating?: number
  timezone?: string
  checkInTime?: string
  checkOutTime?: string
  createdById?: string
}

export interface UpdateHotelData {
  name?: string
  address?: string | null
  city?: string
  state?: string | null
  country?: string
  postalCode?: string | null
  phone?: string | null
  email?: string | null
  website?: string | null
  starRating?: number | null
  status?: HotelStatus
  timezone?: string
  checkInTime?: string
  checkOutTime?: string
}

export interface HotelFilter {
  organizationId?: string
  status?: HotelStatus
  page: number
  limit: number
}

export interface IHotelRepository {
  findById(id: string): Promise<Hotel | null>
  findBySlug(slug: string): Promise<Hotel | null>
  create(data: CreateHotelData): Promise<Hotel>
  update(id: string, data: UpdateHotelData): Promise<Hotel>
  softDelete(id: string): Promise<void>
  findMany(filter: HotelFilter): Promise<PaginatedResult<Hotel>>
}
