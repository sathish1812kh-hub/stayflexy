import type { SyncJob } from '../entities/SyncJob'

export interface CreateSyncJobData {
  organizationId: string
  hotelId: string
  providerId: string
  syncType: string
  idempotencyKey: string
  payload?: unknown
  createdById?: string
  maxRetries?: number
}

export interface UpdateSyncJobData {
  startedAt?: Date
  completedAt?: Date
  errorMessage?: string
  payload?: unknown
}

export interface ISyncJobRepository {
  findById(id: string): Promise<SyncJob | null>
  findByIdempotencyKey(key: string): Promise<SyncJob | null>
  findByHotel(hotelId: string, limit?: number): Promise<SyncJob[]>
  findPendingRetries(): Promise<SyncJob[]>
  create(data: CreateSyncJobData): Promise<SyncJob>
  updateStatus(id: string, status: string, data?: UpdateSyncJobData): Promise<SyncJob>
  appendEvent(syncJobId: string, eventType: string, payload?: unknown, errorMessage?: string): Promise<void>
  incrementRetry(id: string): Promise<SyncJob>
}
