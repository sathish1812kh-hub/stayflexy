import type { Request, Response, NextFunction } from 'express'
import { validate } from '@stayflexi/shared-validation'
import { successResponse, buildPaginationMeta } from '@stayflexi/shared-types'
import { UnauthorizedError } from '@stayflexi/shared-errors'
import {
  connectOtaDtoSchema,
  syncInventoryDtoSchema,
  syncRatesDtoSchema,
  syncReservationsDtoSchema,
  importReservationDtoSchema,
  reconciliationQuerySchema,
  createProviderDtoSchema,
  updateProviderStatusDtoSchema,
} from '../../application/dtos/ota.dto'
import type { ConnectOtaDto } from '../../application/dtos/ota.dto'
import type { ConnectOtaProvider } from '../../application/use-cases/ConnectOtaProvider'
import type { SyncInventory } from '../../application/use-cases/SyncInventory'
import type { SyncRates } from '../../application/use-cases/SyncRates'
import type { SyncReservations } from '../../application/use-cases/SyncReservations'
import type { ImportReservation } from '../../application/use-cases/ImportReservation'
import type { GetSyncStatus } from '../../application/use-cases/GetSyncStatus'
import type { GetReconciliation } from '../../application/use-cases/GetReconciliation'
import type { IOtaProviderRepository } from '../../domain/repositories/IOtaProviderRepository'
import type { IOtaMappingRepository } from '../../domain/repositories/IOtaMappingRepository'
import type { IOtaReservationRepository } from '../../domain/repositories/IOtaReservationRepository'

export class OtaController {
  constructor(
    private readonly connectOtaProviderUC: ConnectOtaProvider,
    private readonly syncInventoryUC: SyncInventory,
    private readonly syncRatesUC: SyncRates,
    private readonly syncReservationsUC: SyncReservations,
    private readonly importReservationUC: ImportReservation,
    private readonly getSyncStatusUC: GetSyncStatus,
    private readonly getReconciliationUC: GetReconciliation,
    private readonly providerRepo: IOtaProviderRepository,
    private readonly mappingRepo: IOtaMappingRepository,
    private readonly reservationRepo: IOtaReservationRepository,
  ) {}

  private getAuth(req: Request): { userId: string; orgId: string; correlationId: string } {
    const userId = req.headers['x-user-id'] as string | undefined
    const orgId = req.headers['x-organization-id'] as string | undefined
    const correlationId = req.headers['x-correlation-id'] as string | undefined
    if (!userId || !orgId) throw new UnauthorizedError('Authentication required')
    return { userId, orgId, correlationId: correlationId ?? '' }
  }

  // ── Providers ─────────────────────────────────────────────────────────────

  listProviders = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { correlationId } = this.getAuth(req)
      const status = req.query['status'] as string | undefined
      const providers = await this.providerRepo.findAll(status)
      res.json(successResponse(providers.map(p => p.toJSON()), correlationId))
    } catch (err) { next(err) }
  }

  createProvider = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { correlationId } = this.getAuth(req)
      const dto = validate(createProviderDtoSchema, req.body)
      const provider = await this.providerRepo.create(dto)
      res.status(201).json(successResponse(provider.toJSON(), correlationId))
    } catch (err) { next(err) }
  }

  getProvider = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { correlationId } = this.getAuth(req)
      const id = req.params['id']
      if (!id) throw new Error('Missing provider id')
      const provider = await this.providerRepo.findById(id)
      if (!provider) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Provider not found', statusCode: 404 } })
        return
      }
      res.json(successResponse(provider.toJSON(), correlationId))
    } catch (err) { next(err) }
  }

  updateProviderStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { correlationId } = this.getAuth(req)
      const id = req.params['id']
      if (!id) throw new Error('Missing provider id')
      const dto = validate(updateProviderStatusDtoSchema, req.body)
      const provider = await this.providerRepo.updateStatus(id, dto.status)
      res.json(successResponse(provider.toJSON(), correlationId))
    } catch (err) { next(err) }
  }

  // ── OTA Connections (Mappings) ────────────────────────────────────────────

  createConnection = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId, orgId, correlationId } = this.getAuth(req)
      const raw = validate(connectOtaDtoSchema, req.body)
      const dto: ConnectOtaDto = {
        hotelId: raw.hotelId,
        providerId: raw.providerId,
        externalHotelId: raw.externalHotelId,
        roomTypeMappings: raw.roomTypeMappings ?? [],
        metadata: raw.metadata,
      }
      const mapping = await this.connectOtaProviderUC.execute(dto, orgId, userId, correlationId)
      res.status(201).json(successResponse(mapping.toJSON(), correlationId))
    } catch (err) { next(err) }
  }

  listConnections = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId, correlationId } = this.getAuth(req)
      const hotelId = req.query['hotelId'] as string | undefined
      const mappings = await this.mappingRepo.findByOrganization(orgId, hotelId)
      res.json(successResponse(mappings.map(m => m.toJSON()), correlationId))
    } catch (err) { next(err) }
  }

  deactivateConnection = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { correlationId } = this.getAuth(req)
      const id = req.params['id']
      if (!id) throw new Error('Missing mapping id')
      const mapping = await this.mappingRepo.deactivate(id)
      res.json(successResponse(mapping.toJSON(), correlationId))
    } catch (err) { next(err) }
  }

  // ── Sync Operations ───────────────────────────────────────────────────────

  syncInventory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId, orgId, correlationId } = this.getAuth(req)
      const dto = validate(syncInventoryDtoSchema, req.body)
      const job = await this.syncInventoryUC.execute(dto, orgId, userId, correlationId)
      res.status(202).json(successResponse(job.toJSON(), correlationId))
    } catch (err) { next(err) }
  }

  syncRates = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId, orgId, correlationId } = this.getAuth(req)
      const dto = validate(syncRatesDtoSchema, req.body)
      const job = await this.syncRatesUC.execute(dto, orgId, userId, correlationId)
      res.status(202).json(successResponse(job.toJSON(), correlationId))
    } catch (err) { next(err) }
  }

  syncReservations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId, orgId, correlationId } = this.getAuth(req)
      const dto = validate(syncReservationsDtoSchema, req.body)
      const job = await this.syncReservationsUC.execute(dto, orgId, userId, correlationId)
      res.status(202).json(successResponse(job.toJSON(), correlationId))
    } catch (err) { next(err) }
  }

  getSyncStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { correlationId } = this.getAuth(req)
      const hotelId = req.query['hotelId'] as string | undefined
      const syncType = req.query['syncType'] as string | undefined
      const limit = parseInt(String(req.query['limit'] ?? '20'), 10)

      if (!hotelId) {
        res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'hotelId is required', statusCode: 400 } })
        return
      }

      const result = await this.getSyncStatusUC.execute(hotelId, syncType, limit)
      res.json(successResponse({ ...result, jobs: result.jobs.map(j => j.toJSON()) }, correlationId))
    } catch (err) { next(err) }
  }

  // ── Reservations ──────────────────────────────────────────────────────────

  listReservations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { correlationId } = this.getAuth(req)
      const hotelId = req.query['hotelId'] as string | undefined

      if (!hotelId) {
        res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'hotelId is required', statusCode: 400 } })
        return
      }

      const providerId = req.query['providerId'] as string | undefined
      const syncStatus = req.query['syncStatus'] as string | undefined
      const page = parseInt(String(req.query['page'] ?? '1'), 10)
      const limit = Math.min(parseInt(String(req.query['limit'] ?? '20'), 10), 100)

      const result = await this.reservationRepo.findByHotel(hotelId, {
        providerId,
        syncStatus,
        page,
        limit,
      })

      const meta = buildPaginationMeta(result.total, page, limit)
      res.json({
        success: true,
        data: result.data.map(r => r.toJSON()),
        meta,
        correlationId,
      })
    } catch (err) { next(err) }
  }

  importReservation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId, orgId, correlationId } = this.getAuth(req)
      const id = req.params['id']
      if (!id) throw new Error('Missing reservation id')
      const dto = validate(importReservationDtoSchema, req.body)
      const reservation = await this.importReservationUC.execute(id, dto.bookingId, {
        organizationId: orgId,
        userId,
        correlationId,
      })
      res.json(successResponse(reservation.toJSON(), correlationId))
    } catch (err) { next(err) }
  }

  // ── Reconciliation ────────────────────────────────────────────────────────

  getReconciliation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId, correlationId } = this.getAuth(req)
      const query = validate(reconciliationQuerySchema, req.query)
      const report = await this.getReconciliationUC.execute(
        query.hotelId,
        orgId,
        query.dateFrom,
        query.dateTo,
      )
      res.json(successResponse(report, correlationId))
    } catch (err) { next(err) }
  }
}
