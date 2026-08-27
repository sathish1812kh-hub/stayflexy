import type { TaxConfig, TaxType } from '../entities/TaxConfig'
import type { PaginatedResult } from '@stayflexi/shared-types'

export interface CreateTaxConfigData {
  organizationId: string
  hotelId?: string | null
  name: string
  description?: string | null
  type: TaxType
  rate: number
  appliesTo?: string[]
  isActive?: boolean
}

export interface UpdateTaxConfigData {
  name?: string
  description?: string | null
  type?: TaxType
  rate?: number
  appliesTo?: string[]
  isActive?: boolean
}

export interface TaxConfigListParams {
  organizationId: string
  hotelId?: string | null
  isActive?: boolean
  search?: string
  page: number
  limit: number
}

export interface ITaxConfigRepository {
  create(data: CreateTaxConfigData): Promise<TaxConfig>
  findById(id: string, organizationId?: string): Promise<TaxConfig | null>
  list(params: TaxConfigListParams): Promise<PaginatedResult<TaxConfig>>
  update(id: string, data: UpdateTaxConfigData, organizationId?: string): Promise<TaxConfig>
  delete(id: string, organizationId?: string): Promise<void>
  /** Active configs for a given org/hotel — used by TaxCalculationService */
  findActive(organizationId: string, hotelId?: string | null): Promise<TaxConfig[]>
}
