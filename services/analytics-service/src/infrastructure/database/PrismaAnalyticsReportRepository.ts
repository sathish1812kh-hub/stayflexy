import { getPrismaClient } from '@stayflexi/shared-database'
import type { PrismaClient } from '@prisma/client'
import { AnalyticsReport } from '../../domain/entities/AnalyticsReport'
import type { AnalyticsReportProps, ReportStatus, ReportType } from '../../domain/entities/AnalyticsReport'
import type { IAnalyticsReportRepository, CreateReportData, UpdateReportData } from '../../domain/repositories/IAnalyticsReportRepository'

// Forward-compat cast: AnalyticsReport Prisma model may not be in generated client
// until `prisma generate` runs after migration. The `any` delegate is safe at runtime.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = PrismaClient & Record<string, any>

function mapToEntity(r: Record<string, unknown>): AnalyticsReport {
  const props: AnalyticsReportProps = {
    id: String(r['id']),
    organizationId: String(r['organizationId']),
    hotelId: String(r['hotelId']),
    reportType: String(r['reportType']) as ReportType,
    reportStatus: String(r['reportStatus']) as ReportStatus,
    dateFrom: r['dateFrom'] as Date,
    dateTo: r['dateTo'] as Date,
    format: String(r['format'] ?? 'json'),
    reportData: r['reportData'] ?? null,
    errorMessage: r['errorMessage'] ? String(r['errorMessage']) : null,
    requestedById: String(r['requestedById']),
    completedAt: r['completedAt'] ? (r['completedAt'] as Date) : null,
    expiresAt: r['expiresAt'] as Date,
    createdAt: r['createdAt'] as Date,
    updatedAt: r['updatedAt'] as Date,
  }
  return new AnalyticsReport(props)
}

export class PrismaAnalyticsReportRepository implements IAnalyticsReportRepository {
  constructor(private readonly db: PrismaClient = getPrismaClient()) {}

  private get repo() {
    return (this.db as AnyClient)['analyticsReport']
  }

  async create(data: CreateReportData): Promise<AnalyticsReport> {
    const record = await this.repo.create({
      data: {
        organizationId: data.organizationId,
        hotelId: data.hotelId,
        reportType: data.reportType,
        reportStatus: 'PENDING',
        dateFrom: data.dateFrom,
        dateTo: data.dateTo,
        format: data.format,
        requestedById: data.requestedById,
        expiresAt: data.expiresAt,
      },
    })
    return mapToEntity(record as Record<string, unknown>)
  }

  async findById(id: string): Promise<AnalyticsReport | null> {
    const record = await this.repo.findUnique({ where: { id } })
    return record ? mapToEntity(record as Record<string, unknown>) : null
  }

  async update(id: string, data: UpdateReportData): Promise<AnalyticsReport> {
    const record = await this.repo.update({
      where: { id },
      data: {
        reportStatus: data.reportStatus,
        ...(data.reportData !== undefined && { reportData: data.reportData }),
        ...(data.errorMessage !== undefined && { errorMessage: data.errorMessage }),
        ...(data.completedAt !== undefined && { completedAt: data.completedAt }),
      },
    })
    return mapToEntity(record as Record<string, unknown>)
  }

  async findByOrganization(organizationId: string, page: number, limit: number): Promise<AnalyticsReport[]> {
    const records = await this.repo.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    })
    return (records as Record<string, unknown>[]).map(mapToEntity)
  }
}
