import type { Restriction } from '../entities/Restriction'
import type { PaginatedResult } from '@stayflexi/shared-types'

export interface CreateRestrictionData {
  organizationId: string
  hotelId: string
  ratePlanId?: string | null
  roomTypeId?: string | null
  restrictionDate: Date
  minStay?: number | null
  maxStay?: number | null
  closedToArrival?: boolean
  closedToDeparture?: boolean
  isActive?: boolean
}

export interface UpdateRestrictionData {
  minStay?: number | null
  maxStay?: number | null
  closedToArrival?: boolean
  closedToDeparture?: boolean
  isActive?: boolean
}

export interface RestrictionFilter {
  hotelId?: string
  ratePlanId?: string
  roomTypeId?: string
  restrictionDate?: Date
  page: number
  limit: number
}

export interface IRestrictionRepository {
  findById(id: string): Promise<Restriction | null>
  create(data: CreateRestrictionData): Promise<Restriction>
  update(id: string, data: UpdateRestrictionData): Promise<Restriction>
  delete(id: string): Promise<void>
  findMany(organizationId: string, filter: RestrictionFilter): Promise<PaginatedResult<Restriction>>
  findByDate(hotelId: string, date: Date): Promise<Restriction[]>
}
