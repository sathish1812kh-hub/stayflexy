import { DateRange } from '../../domain/value-objects/DateRange'
import type { PrismaClient } from '@prisma/client'
import type { AnalyticsQuery } from '../dtos/analytics.dto'
import type { Logger } from '@stayflexi/shared-logger'

export class GetOperationsAnalytics {
  constructor(
    private readonly db: PrismaClient,
    private readonly logger: Logger,
  ) {}

  async execute(query: AnalyticsQuery): Promise<unknown> {
    const range = new DateRange(query.dateFrom, query.dateTo)

    const [housekeeping, maintenance, operational] = await Promise.all([
      this.db.housekeepingTask.groupBy({
        by: ['taskStatus'],
        where: { hotelId: query.hotelId, createdAt: { gte: range.from, lte: range.to } },
        _count: { id: true },
      }),
      this.db.maintenanceTicket.groupBy({
        by: ['ticketStatus'],
        where: { hotelId: query.hotelId, createdAt: { gte: range.from, lte: range.to } },
        _count: { id: true },
      }),
      this.db.operationalTask.groupBy({
        by: ['taskStatus', 'taskCategory'],
        where: { hotelId: query.hotelId, createdAt: { gte: range.from, lte: range.to } },
        _count: { id: true },
      }),
    ])

    return {
      hotelId: query.hotelId,
      period: { from: range.fromISO, to: range.toISO },
      housekeeping: housekeeping.map(r => ({ status: r.taskStatus, count: r._count.id })),
      maintenance: maintenance.map(r => ({ status: r.ticketStatus, count: r._count.id })),
      operational: operational.map(r => ({ status: r.taskStatus, category: r.taskCategory, count: r._count.id })),
    }
  }
}
