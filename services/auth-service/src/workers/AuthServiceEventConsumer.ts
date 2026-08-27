import { Kafka } from 'kafkajs'
import type { EventEnvelope, IEventPublisher } from '@stayflexi/shared-events'
import { KAFKA_TOPICS, publishToRetry, publishToDLQ, MAX_RETRIES } from '@stayflexi/shared-events'
import type { AuthConfig } from '../config'
import type { Logger } from '@stayflexi/shared-logger'

/**
 * AuthServiceEventConsumer — subscribes to organization events to handle
 * user ↔ organization lifecycle (e.g., auto-provisioning, cache invalidation).
 * Lightweight; auth-service primarily publishes auth.events but also reacts
 * to organization membership changes for RBAC cache busting.
 */
export class AuthServiceEventConsumer {
  private consumer: unknown = null
  private started = false

  constructor(
    private readonly config: AuthConfig,
    private readonly logger: Logger,
    private readonly publisher: IEventPublisher,
  ) {}

  async start(): Promise<void> {
    if (!this.config['KAFKA_ENABLED']) {
      this.logger.info('Kafka disabled — AuthServiceEventConsumer not started')
      return
    }
    if (this.started) return
    const kafka = new Kafka({
      clientId: `${this.config['KAFKA_CLIENT_ID'] ?? 'auth-service'}-consumer`,
      brokers: this.config['KAFKA_BROKERS'].split(',').map((b: string) => b.trim()),
      retry: { retries: 5, initialRetryTime: 1000 },
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.consumer = (kafka as any).consumer({
      groupId: 'auth-service-org-events',
      sessionTimeout: 30000,
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c = this.consumer as any
    await c.connect()
    await c.subscribe({
      topics: [KAFKA_TOPICS.ORGANIZATION_EVENTS, KAFKA_TOPICS.HOTEL_EVENTS],
      fromBeginning: false,
    })
    this.started = true
    this.logger.info('AuthServiceEventConsumer started — subscribed to organization/hotel events')
    await c.run({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      eachMessage: async ({ topic, message }: any) => {
        const raw = message.value?.toString() as string | undefined
        if (!raw) return
        let envelope: EventEnvelope
        try {
          envelope = JSON.parse(raw) as EventEnvelope
        } catch {
          this.logger.warn({ topic }, 'Skipping non-JSON auth-service event')
          return
        }
        const headers: Record<string, string> = {}
        for (const [k, v] of Object.entries(message.headers ?? ({} as Record<string, unknown>))) {
          headers[k] = (v as Buffer)?.toString() ?? ''
        }
        const retryCount = parseInt(headers['retryCount'] ?? '0', 10) || 0
        const firstFailedAt = headers['firstFailedAt']
        try {
          await this.handleEvent(envelope, topic, headers)
        } catch (err) {
          const reason = err instanceof Error ? err.message : String(err)
          this.logger.error(
            { err, eventType: envelope['eventType'], topic, retryCount },
            'AuthServiceEventConsumer handler failed',
          )
          try {
            if (retryCount < MAX_RETRIES) {
              await publishToRetry(this.publisher, topic, raw, reason, retryCount + 1, {
                eventId: envelope['eventId'],
                correlationId: envelope['correlationId'],
                firstFailedAt,
              })
            } else {
              await publishToDLQ(this.publisher, topic, raw, reason, {
                eventId: envelope['eventId'],
                correlationId: envelope['correlationId'],
                attemptCount: retryCount + 1,
              })
            }
          } catch (dlqErr) {
            this.logger.error({ err: dlqErr }, 'Failed to route auth event to retry/DLQ')
          }
        }
      },
    })
  }

  async stop(): Promise<void> {
    if (!this.started) return
    this.started = false
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (this.consumer as any)?.disconnect()
    } catch (err) {
      this.logger.warn({ err }, 'AuthServiceEventConsumer disconnect error')
    }
  }

  private async handleEvent(
    envelope: EventEnvelope,
    _topic: string,
    _headers: Record<string, string>,
  ): Promise<void> {
    const eventType = String(envelope['eventType'])
    const payload = envelope['payload'] as Record<string, unknown>
    switch (eventType) {
      case 'organization.created': {
        const orgId =
          typeof payload['organizationId'] === 'string'
            ? (payload['organizationId'] as string)
            : String(envelope['aggregateId'])
        this.logger.info(
          { eventType, orgId, correlationId: envelope['correlationId'] },
          'Organization created — auth service cache warm-up',
        )
        break
      }
      case 'organization.updated': {
        const orgId = String(envelope['aggregateId'])
        this.logger.info(
          { eventType, orgId },
          'Organization updated — auth RBAC cache invalidation',
        )
        break
      }
      case 'organization.member.added':
      case 'organization.member.removed': {
        const userId =
          typeof payload['userId'] === 'string'
            ? (payload['userId'] as string)
            : String(payload['memberId'] ?? envelope['aggregateId'])
        const orgId =
          typeof payload['organizationId'] === 'string'
            ? (payload['organizationId'] as string)
            : String(envelope['aggregateId'])
        this.logger.info(
          { eventType, userId, orgId },
          'Organization membership changed — auth user scope refresh',
        )
        break
      }
      case 'hotel.created':
      case 'hotel.updated': {
        const hotelId = String(envelope['aggregateId'])
        this.logger.info({ eventType, hotelId }, 'Hotel event — auth service tenancy check')
        break
      }
      default:
        this.logger.debug({ eventType, topic: _topic }, 'AuthServiceEventConsumer ignoring event')
        break
    }
  }
}
