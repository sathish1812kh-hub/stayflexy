import type { RatePlan } from '../entities/RatePlan'
import type { PaginatedResult } from '@stayflexi/shared-types'

export interface CreateRatePlanData {
  organizationId: string
  hotelId: string
  roomTypeId?: string | null
  name: string
  code: string
  description?: string | null
  seasonStart?: Date | null
  seasonEnd?: Date | null
  baseRate: number
  currency?: string
  minStay?: number
  maxStay?: number | null
  closedToArrival?: boolean
  closedToDeparture?: boolean
  isActive?: boolean
  createdById?: string | null
}

export interface UpdateRatePlanData {
  name?: string
  description?: string | null
  seasonStart?: Date | null
  seasonEnd?: Date | null
  baseRate?: number
  currency?: string
  minStay?: number
  maxStay?: number | null
  closedToArrival?: boolean
  closedToDeparture?: boolean
  isActive?: boolean
}

export interface RatePlanFilter {
  hotelId?: string
  roomTypeId?: string
  isActive?: boolean
  search?: string
  page: number
  limit: number
}

export interface IRatePlanRepository {
  findById(id: string): Promise<RatePlan | null>
  findByCode(hotelId: string, code: string): Promise<RatePlan | null>
  create(data: CreateRatePlanData): Promise<RatePlan>
  update(id: string, data: UpdateRatePlanData): Promise<RatePlan>
  softDelete(id: string): Promise<void>
  findMany(organizationId: string, filter: RatePlanFilter): Promise<PaginatedResult<RatePlan>>
}
