import { GenerateReport } from '../../application/use-cases/GenerateReport'
import { GetReport } from '../../application/use-cases/GetReport'
import { AnalyticsReport } from '../../domain/entities/AnalyticsReport'
import { NotFoundError, ForbiddenError } from '@stayflexi/shared-errors'
import type { IAnalyticsReportRepository } from '../../domain/repositories/IAnalyticsReportRepository'
import type { ReportAggregator } from '../../aggregators/ReportAggregator'
import type { ExportGenerator } from '../../exports/ExportGenerator'
import type { Logger } from '@stayflexi/shared-logger'

const mockLogger: Logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } as unknown as Logger

function makeReport(overrides: Partial<AnalyticsReport['toJSON'] extends () => infer R ? R : never> = {}): AnalyticsReport {
  const now = new Date()
  const expires = new Date(now.getTime() + 86_400_000)
  return new AnalyticsReport({
    id: 'report-1',
    organizationId: 'org-1',
    hotelId: 'hotel-1',
    reportType: 'FINANCIAL',
    reportStatus: 'PENDING',
    dateFrom: new Date('2024-01-01'),
    dateTo: new Date('2024-01-31'),
    format: 'json',
    reportData: null,
    errorMessage: null,
    requestedById: 'user-1',
    completedAt: null,
    expiresAt: expires,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  })
}

const mockReportRepo: jest.Mocked<IAnalyticsReportRepository> = {
  create: jest.fn().mockResolvedValue(makeReport()),
  findById: jest.fn(),
  update: jest.fn().mockResolvedValue(makeReport({ reportStatus: 'COMPLETED' })),
  findByOrganization: jest.fn(),
}

const mockReportAggregator = {
  generateFinancialReport: jest.fn().mockResolvedValue({ hotelId: 'hotel-1', revenue: { total: 5000 } }),
  generateOccupancyReport: jest.fn(),
  generateOtaReport: jest.fn(),
} as unknown as jest.Mocked<ReportAggregator>

const mockExportGenerator = {
  initiateExport: jest.fn(),
  getExportStatus: jest.fn(),
} as unknown as jest.Mocked<ExportGenerator>

describe('GenerateReport', () => {
  let useCase: GenerateReport

  const validDto = {
    hotelId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    reportType: 'financial' as const,
    dateFrom: '2024-01-01',
    dateTo: '2024-01-31',
    format: 'json' as const,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new GenerateReport(mockReportRepo, mockReportAggregator, mockExportGenerator, mockLogger)
  })

  it('creates report with PENDING status and returns immediately', async () => {
    const result = await useCase.execute(validDto, 'org-1', 'user-1')
    expect(result.reportStatus).toBe('PENDING')
    expect(mockReportRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: 'org-1',
      hotelId: validDto.hotelId,
      reportType: 'FINANCIAL',
    }))
  })

  it('sets expiresAt 24 hours in the future', async () => {
    const before = new Date()
    await useCase.execute(validDto, 'org-1', 'user-1')
    const after = new Date()
    const createCall = mockReportRepo.create.mock.calls[0]?.[0]
    expect(createCall).toBeDefined()
    if (createCall) {
      const expiresAt = createCall.expiresAt
      expect(expiresAt.getTime()).toBeGreaterThanOrEqual(before.getTime() + 23 * 3600 * 1000)
      expect(expiresAt.getTime()).toBeLessThanOrEqual(after.getTime() + 25 * 3600 * 1000)
    }
  })

  it('processes report asynchronously (does not block)', async () => {
    const start = Date.now()
    await useCase.execute(validDto, 'org-1', 'user-1')
    const elapsed = Date.now() - start
    // Should return in well under 100ms since processing is async
    expect(elapsed).toBeLessThan(200)
  })

  it('triggers report generation via setImmediate', async () => {
    await useCase.execute(validDto, 'org-1', 'user-1')
    // Wait for setImmediate to fire
    await new Promise<void>(resolve => setImmediate(resolve))
    await new Promise<void>(resolve => setTimeout(resolve, 50))
    expect(mockReportAggregator.generateFinancialReport).toHaveBeenCalled()
  })

  it('marks report COMPLETED on successful generation', async () => {
    await useCase.execute(validDto, 'org-1', 'user-1')
    await new Promise<void>(resolve => setImmediate(resolve))
    await new Promise<void>(resolve => setTimeout(resolve, 50))
    const completedCall = mockReportRepo.update.mock.calls.find(
      c => (c[1] as { reportStatus?: string })?.reportStatus === 'COMPLETED'
    )
    expect(completedCall).toBeDefined()
  })

  it('marks report FAILED on error', async () => {
    mockReportAggregator.generateFinancialReport.mockRejectedValue(new Error('DB error'))
    await useCase.execute(validDto, 'org-1', 'user-1')
    await new Promise<void>(resolve => setImmediate(resolve))
    await new Promise<void>(resolve => setTimeout(resolve, 50))
    const failedCall = mockReportRepo.update.mock.calls.find(
      c => (c[1] as { reportStatus?: string })?.reportStatus === 'FAILED'
    )
    expect(failedCall).toBeDefined()
    const failedData = failedCall?.[1] as { errorMessage?: string }
    expect(failedData?.errorMessage).toBe('DB error')
  })
})

describe('GetReport', () => {
  let useCase: GetReport

  beforeEach(() => {
    jest.clearAllMocks()
    mockReportRepo.findById.mockResolvedValue(makeReport())
    useCase = new GetReport(mockReportRepo, mockLogger)
  })

  it('returns report for correct organization', async () => {
    const result = await useCase.execute('report-1', 'org-1')
    expect(result.id).toBe('report-1')
  })

  it('throws NotFoundError for missing report', async () => {
    mockReportRepo.findById.mockResolvedValue(null)
    await expect(useCase.execute('non-existent', 'org-1')).rejects.toThrow(NotFoundError)
  })

  it('throws ForbiddenError for wrong organization', async () => {
    await expect(useCase.execute('report-1', 'org-attacker')).rejects.toThrow(ForbiddenError)
  })
})
