import type { IEventPublisher } from '@stayflexi/shared-events'
import type { Logger } from '@stayflexi/shared-logger'

export const OTA_EVENTS = {
  SYNC_STARTED: 'ota.sync.started',
  SYNC_COMPLETED: 'ota.sync.completed',
  SYNC_FAILED: 'ota.sync.failed',
  RESERVATION_IMPORTED: 'ota.reservation.imported',
  INVENTORY_UPDATED: 'ota.inventory.updated',
  RATE_UPDATED: 'ota.rate.updated',
  CONNECTION_CREATED: 'ota.connection.created',
} as const

export type OtaEventType = (typeof OTA_EVENTS)[keyof typeof OTA_EVENTS]

export interface SyncStartedPayload {
  syncJobId: string
  organizationId: string
  hotelId: string
  providerId: string
  syncType: string
  correlationId?: string
}

export interface SyncCompletedPayload extends SyncStartedPayload {
  recordsProcessed: number
  recordsFailed: number
  durationMs: number
}

export interface SyncFailedPayload extends SyncStartedPayload {
  errorMessage: string
  retryCount: number
}

export interface ReservationImportedPayload {
  otaReservationId: string
  organizationId: string
  hotelId: string
  providerId: string
  externalReservationId: string
  correlationId?: string
}

export interface ConnectionCreatedPayload {
  mappingId: string
  organizationId: string
  hotelId: string
  providerCode: string
  correlationId?: string
}

const OTA_TOPIC = 'ota.events'

export class OtaEventPublisher {
  constructor(
    private readonly publisher: IEventPublisher,
    private readonly logger: Logger,
  ) {}

  private publish(
    eventType: OtaEventType,
    aggregateId: string,
    aggregateType: string,
    organizationId: string,
    payload: unknown,
    correlationId?: string,
  ): void {
    setImmediate(() => {
      void (async () => {
        try {
          await this.publisher.publish(OTA_TOPIC, {
            eventType,
            aggregateId,
            aggregateType,
            organizationId,
            version: 1,
            correlationId,
            payload,
          })
        } catch (err) {
          this.logger.error({ err, eventType }, `Failed to publish ${eventType}`)
        }
      })()
    })
  }

  publishSyncStarted(payload: SyncStartedPayload): void {
    this.publish(
      OTA_EVENTS.SYNC_STARTED,
      payload.syncJobId,
      'SyncJob',
      payload.organizationId,
      payload,
      payload.correlationId,
    )
  }

  publishSyncCompleted(payload: SyncCompletedPayload): void {
    this.publish(
      OTA_EVENTS.SYNC_COMPLETED,
      payload.syncJobId,
      'SyncJob',
      payload.organizationId,
      payload,
      payload.correlationId,
    )
  }

  publishSyncFailed(payload: SyncFailedPayload): void {
    this.publish(
      OTA_EVENTS.SYNC_FAILED,
      payload.syncJobId,
      'SyncJob',
      payload.organizationId,
      payload,
      payload.correlationId,
    )
  }

  publishReservationImported(payload: ReservationImportedPayload): void {
    this.publish(
      OTA_EVENTS.RESERVATION_IMPORTED,
      payload.otaReservationId,
      'OtaReservation',
      payload.organizationId,
      payload,
      payload.correlationId,
    )
  }

  publishConnectionCreated(payload: ConnectionCreatedPayload): void {
    this.publish(
      OTA_EVENTS.CONNECTION_CREATED,
      payload.mappingId,
      'OtaMapping',
      payload.organizationId,
      payload,
      payload.correlationId,
    )
  }
}
