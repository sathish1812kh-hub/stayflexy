import { getPrismaClient, Prisma } from '@stayflexi/shared-database'
import { fromPrismaError } from '@stayflexi/shared-errors'
import type { PrismaClient, SyncStatus } from '@prisma/client'
import { SyncJob } from '../../domain/entities/SyncJob'
import type { SyncJobProps } from '../../domain/entities/SyncJob'
import type {
  ISyncJobRepository,
  CreateSyncJobData,
  UpdateSyncJobData,
} from '../../domain/repositories/ISyncJobRepository'

type PrismaSyncJob = {
  id: string
  organizationId: string
  hotelId: string
  providerId: string
  syncType: string
  syncStatus: string
  idempotencyKey: string
  startedAt: Date | null
  completedAt: Date | null
  retryCount: number
  maxRetries: number
  errorMessage: string | null
  payload: unknown
  createdById: string
  createdAt: Date
  updatedAt: Date
}

function mapToEntity(r: PrismaSyncJob): SyncJob {
  const props: SyncJobProps = {
    id: r.id,
    organizationId: r.organizationId,
    hotelId: r.hotelId,
    providerId: r.providerId,
    syncType: r.syncType,
    syncStatus: r.syncStatus,
    idempotencyKey: r.idempotencyKey,
    startedAt: r.startedAt,
    completedAt: r.completedAt,
    retryCount: r.retryCount,
    maxRetries: r.maxRetries,
    errorMessage: r.errorMessage,
    payload: r.payload,
    createdById: r.createdById,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }
  return new SyncJob(props)
}

type SyncTypeInput = Parameters<PrismaClient['syncJob']['create']>[0]['data']['syncType']
type SyncStatusInput = Parameters<PrismaClient['syncJob']['create']>[0]['data']['syncStatus']
type SyncEventTypeInput = Parameters<PrismaClient['syncEvent']['create']>[0]['data']['eventType']
type SyncEventStatusInput = Parameters<PrismaClient['syncEvent']['create']>[0]['data']['processingStatus']

export class PrismaSyncJobRepository implements ISyncJobRepository {
  constructor(private readonly db: PrismaClient = getPrismaClient()) {}

  async findById(id: string): Promise<SyncJob | null> {
    try {
      const r = await this.db.syncJob.findUnique({ where: { id } })
      return r ? mapToEntity(r) : null
    } catch (err) {
      const e = fromPrismaError(err)
      if (e) throw e
      throw err
    }
  }

  async findByIdempotencyKey(key: string): Promise<SyncJob | null> {
    try {
      const r = await this.db.syncJob.findUnique({ where: { idempotencyKey: key } })
      return r ? mapToEntity(r) : null
    } catch (err) {
      const e = fromPrismaError(err)
      if (e) throw e
      throw err
    }
  }

  async findByHotel(hotelId: string, limit = 20): Promise<SyncJob[]> {
    try {
      const records = await this.db.syncJob.findMany({
        where: { hotelId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      })
      return records.map(mapToEntity)
    } catch (err) {
      const e = fromPrismaError(err)
      if (e) throw e
      throw err
    }
  }

  async findPendingRetries(): Promise<SyncJob[]> {
    try {
      // Use typed Prisma enum values directly
      const statusFilter: SyncStatus[] = ['FAILED' as SyncStatus, 'RETRYING' as SyncStatus]
      const records = await this.db.syncJob.findMany({
        where: {
          syncStatus: { in: statusFilter },
        },
        orderBy: { updatedAt: 'asc' },
        take: 100,
      })
      // Filter to only those that can still retry
      return records.map(mapToEntity).filter(j => j.canRetry())
    } catch (err) {
      const e = fromPrismaError(err)
      if (e) throw e
      throw err
    }
  }

  async create(data: CreateSyncJobData): Promise<SyncJob> {
    try {
      const r = await this.db.syncJob.create({
        data: {
          organizationId: data.organizationId,
          hotelId: data.hotelId,
          providerId: data.providerId,
          syncType: data.syncType as SyncTypeInput,
          syncStatus: 'PENDING' as SyncStatusInput,
          idempotencyKey: data.idempotencyKey,
          maxRetries: data.maxRetries ?? 3,
          createdById: data.createdById ?? 'system',
          payload: data.payload !== undefined ? (data.payload as Prisma.InputJsonValue) : undefined,
        },
      })
      return mapToEntity(r)
    } catch (err) {
      const e = fromPrismaError(err)
      if (e) throw e
      throw err
    }
  }

  async updateStatus(id: string, status: string, data?: UpdateSyncJobData): Promise<SyncJob> {
    try {
      const r = await this.db.syncJob.update({
        where: { id },
        data: {
          syncStatus: status as SyncStatusInput,
          ...(data?.startedAt !== undefined && { startedAt: data.startedAt }),
          ...(data?.completedAt !== undefined && { completedAt: data.completedAt }),
          ...(data?.errorMessage !== undefined && { errorMessage: data.errorMessage }),
          ...(data?.payload !== undefined && {
            payload: data.payload as Prisma.InputJsonValue,
          }),
        },
      })
      return mapToEntity(r)
    } catch (err) {
      const e = fromPrismaError(err)
      if (e) throw e
      throw err
    }
  }

  async appendEvent(
    syncJobId: string,
    eventType: string,
    payload?: unknown,
    errorMessage?: string,
  ): Promise<void> {
    try {
      await this.db.syncEvent.create({
        data: {
          syncJobId,
          eventType: eventType as SyncEventTypeInput,
          processingStatus: 'PENDING' as SyncEventStatusInput,
          payload: payload !== undefined ? (payload as Prisma.InputJsonValue) : undefined,
          errorMessage: errorMessage ?? null,
        },
      })
    } catch (err) {
      const e = fromPrismaError(err)
      if (e) throw e
      throw err
    }
  }

  async incrementRetry(id: string): Promise<SyncJob> {
    try {
      const r = await this.db.syncJob.update({
        where: { id },
        data: {
          retryCount: { increment: 1 },
          syncStatus: 'RETRYING' as SyncStatusInput,
        },
      })
      return mapToEntity(r)
    } catch (err) {
      const e = fromPrismaError(err)
      if (e) throw e
      throw err
    }
  }
}
