import { ConflictError, NotFoundError } from '@stayflexi/shared-errors'
import type { INightAuditRepository } from '../../domain/repositories/INightAuditRepository'
import type { IFolioRepository } from '../../domain/repositories/IFolioRepository'

export class RunNightAudit {
  constructor(
    private readonly auditRepo: INightAuditRepository,
    private readonly folioRepo: IFolioRepository,
  ) {}

  async execute(hotelId: string, auditDate: Date, organizationId: string, userId: string) {
    const existing = await this.auditRepo.findByHotelAndDate(hotelId, auditDate)
    if (existing && existing.status !== 'FAILED')
      throw new ConflictError('Night audit already exists for this date', 'AUDIT_EXISTS')

    let audit =
      existing && existing.status === 'FAILED'
        ? await this.auditRepo.updateStatus(existing.id, 'IN_PROGRESS', {
            startedAt: new Date(),
            closedById: userId,
          })
        : await this.auditRepo.create({
            organizationId,
            hotelId,
            auditDate,
            closedById: userId,
            entries: {},
          })

    if (!existing || existing.status === 'FAILED') {
      audit = await this.auditRepo.updateStatus(audit.id, 'IN_PROGRESS', { startedAt: new Date() })
    }

    try {
      // Simulate folio count for the date: count open folios for hotel
      const folioResult = await this.folioRepo.findMany(organizationId, {
        hotelId,
        page: 1,
        limit: 100,
      })
      const folioCount = folioResult.data.length
      const totalRevenue = folioResult.data.reduce((sum, f) => sum + f.balance, 0)

      audit = await this.auditRepo.updateStatus(audit.id, 'COMPLETED', {
        completedAt: new Date(),
        folioCount,
        totalRevenue,
        totalPayments: 0,
        entries: { folioCount, totalRevenue, auditDate: auditDate.toISOString() },
      })
      return audit
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      await this.auditRepo.updateStatus(audit.id, 'FAILED', { errorMessage: message })
      throw err
    }
  }
}
