import { getPrismaClient, Prisma } from '@stayflexi/shared-database'
import { fromPrismaError } from '@stayflexi/shared-errors'
import type { PrismaClient, SnapshotType } from '@prisma/client'
import { AnalyticsSnapshot } from '../../domain/entities/AnalyticsSnapshot'
import type { AnalyticsSnapshotProps } from '../../domain/entities/AnalyticsSnapshot'
import type { IAnalyticsSnapshotRepository, UpsertSnapshotData } from '../../domain/repositories/IAnalyticsSnapshotRepository'

function mapToEntity(r: {
  id: string; organizationId: string; hotelId: string; snapshotType: string;
  snapshotDate: Date; metricsPayload: unknown; createdAt: Date; updatedAt: Date;
}): AnalyticsSnapshot {
  const props: AnalyticsSnapshotProps = {
    id: r.id, organizationId: r.organizationId, hotelId: r.hotelId,
    snapshotType: r.snapshotType, snapshotDate: r.snapshotDate,
    metricsPayload: r.metricsPayload, createdAt: r.createdAt, updatedAt: r.updatedAt,
  }
  return new AnalyticsSnapshot(props)
}

export class PrismaAnalyticsSnapshotRepository implements IAnalyticsSnapshotRepository {
  constructor(private readonly db: PrismaClient = getPrismaClient()) {}

  async findByHotelAndType(hotelId: string, snapshotType: string, date: Date): Promise<AnalyticsSnapshot | null> {
    try {
      const r = await this.db.analyticsSnapshot.findUnique({
        where: { hotelId_snapshotType_snapshotDate: { hotelId, snapshotType: snapshotType as SnapshotType, snapshotDate: date } },
      })
      return r ? mapToEntity(r) : null
    } catch (err) { const e = fromPrismaError(err); if (e) throw e; throw err }
  }

  async findRecentByHotel(hotelId: string, snapshotType: string, limit = 30): Promise<AnalyticsSnapshot[]> {
    try {
      const records = await this.db.analyticsSnapshot.findMany({
        where: { hotelId, snapshotType: snapshotType as SnapshotType },
        orderBy: { snapshotDate: 'desc' },
        take: limit,
      })
      return records.map(mapToEntity)
    } catch (err) { const e = fromPrismaError(err); if (e) throw e; throw err }
  }

  async upsert(data: UpsertSnapshotData): Promise<AnalyticsSnapshot> {
    try {
      const r = await this.db.analyticsSnapshot.upsert({
        where: { hotelId_snapshotType_snapshotDate: { hotelId: data.hotelId, snapshotType: data.snapshotType as SnapshotType, snapshotDate: data.snapshotDate } },
        create: {
          organizationId: data.organizationId, hotelId: data.hotelId,
          snapshotType: data.snapshotType as SnapshotType, snapshotDate: data.snapshotDate,
          metricsPayload: data.metricsPayload as Prisma.InputJsonValue,
        },
        update: { metricsPayload: data.metricsPayload as Prisma.InputJsonValue },
      })
      return mapToEntity(r)
    } catch (err) { const e = fromPrismaError(err); if (e) throw e; throw err }
  }
}
