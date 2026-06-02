import { BadRequestError } from '@stayflexi/shared-errors'
import type { ReconciliationEngine, ReconciliationReport } from '../../reconciliation/ReconciliationEngine'
import type { Logger } from '@stayflexi/shared-logger'

export class GetReconciliation {
  constructor(
    private readonly reconciliationEngine: ReconciliationEngine,
    private readonly logger: Logger,
  ) {}

  async execute(
    hotelId: string,
    organizationId: string,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<ReconciliationReport> {
    if (!hotelId) {
      throw new BadRequestError('hotelId is required')
    }

    const today = new Date().toISOString().split('T')[0] ?? new Date().toISOString().substring(0, 10)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0] ?? today

    const resolvedFrom = dateFrom ?? thirtyDaysAgo
    const resolvedTo = dateTo ?? today

    this.logger.info(
      { hotelId, organizationId, dateFrom: resolvedFrom, dateTo: resolvedTo },
      'GetReconciliation executed',
    )

    return this.reconciliationEngine.generateReport(hotelId, organizationId, resolvedFrom, resolvedTo)
  }
}
