import { ForbiddenError, BadRequestError } from '@stayflexi/shared-errors'
import type { SurgePricingController, ActiveSurge } from '../../engine/SurgePricingController'
import type { IPricingRuleRepository } from '../../domain/repositories/IPricingRuleRepository'
import type { IEventPublisher } from '@stayflexi/shared-events'
import type { Logger } from '@stayflexi/shared-logger'
import { PRICING_EVENTS } from '../../events/pricingEvents'

export interface SurgePricingDto {
  organizationId: string
  hotelId: string
  roomTypeId?: string
  surgeMultiplier: number
  reason: string
  durationMinutes: number   // how long surge pricing lasts
  appliedById: string
  appliedByRole: string
}

export class ApplySurgePricing {
  private readonly ALLOWED_ROLES = ['SUPER_ADMIN', 'MANAGER']

  constructor(
    private readonly surgeController: SurgePricingController,
    private readonly ruleRepo: IPricingRuleRepository,
    private readonly eventPublisher: IEventPublisher,
    private readonly logger: Logger,
    private readonly maxSurgeMultiplier: number = 3.0,
  ) {}

  async execute(dto: SurgePricingDto): Promise<ActiveSurge> {
    if (!this.ALLOWED_ROLES.includes(dto.appliedByRole)) {
      throw new ForbiddenError('Surge pricing requires MANAGER or SUPER_ADMIN role')
    }
    if (dto.surgeMultiplier > this.maxSurgeMultiplier) {
      throw new BadRequestError(`Surge multiplier cannot exceed ${this.maxSurgeMultiplier}`)
    }
    if (dto.durationMinutes < 1 || dto.durationMinutes > 10080) {
      throw new BadRequestError('Surge pricing duration must be between 1 minute and 7 days')
    }

    const expiresAt = new Date(Date.now() + dto.durationMinutes * 60 * 1000)

    const surge = await this.surgeController.applySurge({
      hotelId: dto.hotelId,
      organizationId: dto.organizationId,
      roomTypeId: dto.roomTypeId,
      surgeMultiplier: dto.surgeMultiplier,
      reason: dto.reason,
      expiresAt,
      appliedById: dto.appliedById,
    })

    setImmediate(() => {
      void this.eventPublisher.publish('pricing.events', {
        eventType: PRICING_EVENTS.SURGE_PRICING_APPLIED,
        aggregateId: dto.hotelId,
        aggregateType: 'SurgePricing',
        organizationId: dto.organizationId,
        payload: {
          hotelId: dto.hotelId,
          organizationId: dto.organizationId,
          roomTypeId: dto.roomTypeId,
          surgeMultiplier: dto.surgeMultiplier,
          reason: dto.reason,
          expiresAt: expiresAt.toISOString(),
          appliedById: dto.appliedById,
        },
      }).catch(() => {})
    })

    this.logger.warn({
      hotelId: dto.hotelId,
      roomTypeId: dto.roomTypeId,
      multiplier: dto.surgeMultiplier,
      durationMinutes: dto.durationMinutes,
      reason: dto.reason,
    }, 'Surge pricing applied')

    return surge
  }

  async remove(
    hotelId: string,
    organizationId: string,
    roomTypeId: string | undefined,
    removedById: string,
    removedByRole: string,
  ): Promise<void> {
    if (!this.ALLOWED_ROLES.includes(removedByRole)) {
      throw new ForbiddenError('Removing surge pricing requires MANAGER or SUPER_ADMIN role')
    }

    const removed = await this.surgeController.removeSurge(hotelId, roomTypeId)
    if (!removed) return

    setImmediate(() => {
      void this.eventPublisher.publish('pricing.events', {
        eventType: PRICING_EVENTS.SURGE_PRICING_REMOVED,
        aggregateId: hotelId,
        aggregateType: 'SurgePricing',
        organizationId,
        payload: { hotelId, organizationId, roomTypeId, removedById },
      }).catch(() => {})
    })

    this.logger.info({ hotelId, roomTypeId, removedById }, 'Surge pricing removed')
  }
}
