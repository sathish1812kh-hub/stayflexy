import type { FeeConfig, FeeType } from '../entities/FeeConfig'
import type { PaginatedResult } from '@stayflexi/shared-types'

export interface CreateFeeConfigData {
  organizationId: string
  hotelId?: string | null
  name: string
  description?: string | null
  type: FeeType
  rate: number
  appliesTo?: string[]
  isActive?: boolean
}

export interface UpdateFeeConfigData {
  name?: string
  description?: string | null
  type?: FeeType
  rate?: number
  appliesTo?: string[]
  isActive?: boolean
}

export interface FeeConfigListParams {
  organizationId: string
  hotelId?: string | null
  isActive?: boolean
  search?: string
  page: number
  limit: number
}

export interface IFeeConfigRepository {
  create(data: CreateFeeConfigData): Promise<FeeConfig>
  findById(id: string, organizationId?: string): Promise<FeeConfig | null>
  list(params: FeeConfigListParams): Promise<PaginatedResult<FeeConfig>>
  update(id: string, data: UpdateFeeConfigData, organizationId?: string): Promise<FeeConfig>
  delete(id: string, organizationId?: string): Promise<void>
  findActive(organizationId: string, hotelId?: string | null): Promise<FeeConfig[]>
}
