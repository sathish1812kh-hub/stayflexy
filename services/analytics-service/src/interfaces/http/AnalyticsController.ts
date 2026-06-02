import type { Request, Response, NextFunction } from 'express'
import { validate } from '@stayflexi/shared-validation'
import { successResponse } from '@stayflexi/shared-types'
import { UnauthorizedError, NotFoundError } from '@stayflexi/shared-errors'
import {
  analyticsQuerySchema, dashboardQuerySchema, forecastQuerySchema,
  exportQuerySchema, generateReportSchema,
} from '../../application/dtos/analytics.dto'
import type { GetRevenueAnalytics } from '../../application/use-cases/GetRevenueAnalytics'
import type { GetOccupancyAnalytics } from '../../application/use-cases/GetOccupancyAnalytics'
import type { GetBookingAnalytics } from '../../application/use-cases/GetBookingAnalytics'
import type { GetOperationsAnalytics } from '../../application/use-cases/GetOperationsAnalytics'
import type { GetForecast } from '../../application/use-cases/GetForecast'
import type { GetFinancialReport } from '../../application/use-cases/GetFinancialReport'
import type { GetOccupancyReport } from '../../application/use-cases/GetOccupancyReport'
import type { GetOtaReport } from '../../application/use-cases/GetOtaReport'
import type { GetDashboard } from '../../application/use-cases/GetDashboard'
import type { GenerateReport } from '../../application/use-cases/GenerateReport'
import type { GetReport } from '../../application/use-cases/GetReport'
import type { ExportGenerator } from '../../exports/ExportGenerator'

export class AnalyticsController {
  constructor(
    private readonly getRevenueAnalyticsUC: GetRevenueAnalytics,
    private readonly getOccupancyAnalyticsUC: GetOccupancyAnalytics,
    private readonly getBookingAnalyticsUC: GetBookingAnalytics,
    private readonly getOperationsAnalyticsUC: GetOperationsAnalytics,
    private readonly getForecastUC: GetForecast,
    private readonly getFinancialReportUC: GetFinancialReport,
    private readonly getOccupancyReportUC: GetOccupancyReport,
    private readonly getOtaReportUC: GetOtaReport,
    private readonly exportGenerator: ExportGenerator,
    private readonly getDashboardUC?: GetDashboard,
    private readonly generateReportUC?: GenerateReport,
    private readonly getReportUC?: GetReport,
  ) {}

  private getAuth(req: Request): { userId: string; orgId: string; correlationId: string } {
    const user = req.user
    if (user) return { userId: user.userId, orgId: user.organizationId ?? '', correlationId: user.correlationId ?? '' }
    const userId = req.headers['x-user-id'] as string | undefined
    const orgId = req.headers['x-organization-id'] as string | undefined
    const correlationId = req.headers['x-correlation-id'] as string | undefined
    if (!userId || !orgId) throw new UnauthorizedError('Authentication required')
    return { userId, orgId, correlationId: correlationId ?? '' }
  }

  getRevenue = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId, correlationId } = this.getAuth(req)
      const query = validate(analyticsQuerySchema, req.query)
      const result = await this.getRevenueAnalyticsUC.execute(query, orgId)
      res.json(successResponse(result, correlationId))
    } catch (err) { next(err) }
  }

  getOccupancy = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { correlationId } = this.getAuth(req)
      const query = validate(analyticsQuerySchema, req.query)
      const result = await this.getOccupancyAnalyticsUC.execute(query)
      res.json(successResponse(result, correlationId))
    } catch (err) { next(err) }
  }

  getBookings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId, correlationId } = this.getAuth(req)
      const query = validate(analyticsQuerySchema, req.query)
      const result = await this.getBookingAnalyticsUC.execute(query, orgId)
      res.json(successResponse(result, correlationId))
    } catch (err) { next(err) }
  }

  getOperations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { correlationId } = this.getAuth(req)
      const query = validate(analyticsQuerySchema, req.query)
      const result = await this.getOperationsAnalyticsUC.execute(query)
      res.json(successResponse(result, correlationId))
    } catch (err) { next(err) }
  }

  getForecast = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { correlationId } = this.getAuth(req)
      const query = forecastQuerySchema.parse(req.query)
      const result = await this.getForecastUC.execute(query)
      res.json(successResponse(result, correlationId))
    } catch (err) { next(err) }
  }

  getFinancialReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId, correlationId } = this.getAuth(req)
      const query = validate(analyticsQuerySchema, req.query)
      const result = await this.getFinancialReportUC.execute(query, orgId)
      res.json(successResponse(result, correlationId))
    } catch (err) { next(err) }
  }

  getOccupancyReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { correlationId } = this.getAuth(req)
      const query = validate(analyticsQuerySchema, req.query)
      const result = await this.getOccupancyReportUC.execute(query)
      res.json(successResponse(result, correlationId))
    } catch (err) { next(err) }
  }

  getOtaReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { correlationId } = this.getAuth(req)
      const query = validate(analyticsQuerySchema, req.query)
      const result = await this.getOtaReportUC.execute(query)
      res.json(successResponse(result, correlationId))
    } catch (err) { next(err) }
  }

  exportReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId, correlationId } = this.getAuth(req)
      const query = exportQuerySchema.parse(req.query)
      const job = await this.exportGenerator.initiateExport(query, orgId)
      res.status(202).json(successResponse(job, correlationId))
    } catch (err) { next(err) }
  }

  getExportStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { correlationId } = this.getAuth(req)
      const exportId = req.params['id']
      if (!exportId) throw new Error('Missing export id')
      const job = await this.exportGenerator.getExportStatus(exportId)
      if (!job) {
        throw new NotFoundError(`Export job ${exportId} not found`)
      }
      res.json(successResponse(job, correlationId))
    } catch (err) { next(err) }
  }

  getDashboard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId, correlationId } = this.getAuth(req)
      const query = validate(dashboardQuerySchema, req.query)
      if (!this.getDashboardUC) throw new Error('Dashboard use-case not configured')
      const result = await this.getDashboardUC.execute(query.hotelId, orgId)
      res.json(successResponse(result, correlationId))
    } catch (err) { next(err) }
  }

  generateReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId, orgId, correlationId } = this.getAuth(req)
      const dto = validate(generateReportSchema, req.body)
      if (!this.generateReportUC) throw new Error('GenerateReport use-case not configured')
      const report = await this.generateReportUC.execute(dto, orgId, userId)
      res.status(202).json(successResponse(report.toJSON(), correlationId))
    } catch (err) { next(err) }
  }

  getReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId, correlationId } = this.getAuth(req)
      const reportId = req.params['id']
      if (!reportId) throw new Error('Missing report id')
      if (!this.getReportUC) throw new Error('GetReport use-case not configured')
      const report = await this.getReportUC.execute(reportId, orgId)
      res.json(successResponse(report.toJSON(), correlationId))
    } catch (err) { next(err) }
  }
}
