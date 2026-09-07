import type { NightAudit } from '../entities/NightAudit'
import type { PaginatedResult } from '@stayflexi/shared-types'

export interface CreateNightAuditData {
  organizationId: string
  hotelId: string
  auditDate: Date
  closedById?: string | null
  entries?: Record<string, unknown> | null
  totalRevenue?: number | null
  totalPayments?: number | null
}

export interface NightAuditFilter {
  hotelId?: string
  status?: string
  page: number
  limit: number
}

export interface INightAuditRepository {
  findById(id: string): Promise<NightAudit | null>
  findByHotelAndDate(hotelId: string, auditDate: Date): Promise<NightAudit | null>
  create(data: CreateNightAuditData): Promise<NightAudit>
  updateStatus(
    id: string,
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED',
    extra?: Record<string, unknown>,
  ): Promise<NightAudit>
  findMany(organizationId: string, filter: NightAuditFilter): Promise<PaginatedResult<NightAudit>>
}
