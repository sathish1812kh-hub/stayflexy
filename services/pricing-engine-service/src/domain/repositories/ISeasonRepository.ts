import type { Season } from '../entities/Season'
import type { PaginatedResult } from '@stayflexi/shared-types'

export interface CreateSeasonData {
  organizationId: string
  hotelId: string
  name: string
  code: string
  description?: string | null
  startDate: Date
  endDate: Date
  isActive?: boolean
}

export interface UpdateSeasonData {
  name?: string
  description?: string | null
  startDate?: Date
  endDate?: Date
  isActive?: boolean
}

export interface SeasonFilter {
  hotelId?: string
  isActive?: boolean
  page: number
  limit: number
}

export interface ISeasonRepository {
  findById(id: string): Promise<Season | null>
  findByCode(hotelId: string, code: string): Promise<Season | null>
  create(data: CreateSeasonData): Promise<Season>
  update(id: string, data: UpdateSeasonData): Promise<Season>
  softDelete(id: string): Promise<void>
  findMany(organizationId: string, filter: SeasonFilter): Promise<PaginatedResult<Season>>
}
