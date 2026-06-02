import { BadRequestError } from '@stayflexi/shared-errors'
import type { IPricingRuleRepository } from '../../domain/repositories/IPricingRuleRepository'
import type { IEventPublisher } from '@stayflexi/shared-events'
import type { Logger } from '@stayflexi/shared-logger'
import type { PricingRule } from '../../domain/entities/PricingRule'
import { PRICING_EVENTS } from '../../events/pricingEvents'

export interface CreatePricingRuleDto {
  organizationId: string
  hotelId: string
  roomTypeId?: string
  ruleName: string
  pricingStrategy: string
  adjustmentType: string
  adjustmentValue: number
  minimumPrice?: number
  maximumPrice?: number
  applicableDays?: string[]
  applicableSeasons?: string[]
  activeFrom: Date
  activeTo?: Date
  priority?: number
  createdById: string
}

export class CreatePricingRule {
  constructor(
    private readonly ruleRepo: IPricingRuleRepository,
    private readonly eventPublisher: IEventPublisher,
    private readonly logger: Logger,
  ) {}

  async execute(dto: CreatePricingRuleDto): Promise<PricingRule> {
    if (dto.minimumPrice !== undefined && dto.maximumPrice !== undefined) {
      if (dto.minimumPrice > dto.maximumPrice) {
        throw new BadRequestError('minimumPrice cannot exceed maximumPrice')
      }
    }
    if (dto.adjustmentValue <= 0) {
      throw new BadRequestError('adjustmentValue must be positive')
    }
    if (dto.activeTo && dto.activeTo <= dto.activeFrom) {
      throw new BadRequestError('activeTo must be after activeFrom')
    }

    const rule = await this.ruleRepo.create({
      organizationId: dto.organizationId,
      hotelId: dto.hotelId,
      roomTypeId: dto.roomTypeId ?? null,
      ruleName: dto.ruleName,
      pricingStrategy: dto.pricingStrategy as any,
      adjustmentType: dto.adjustmentType as any,
      adjustmentValue: dto.adjustmentValue,
      minimumPrice: dto.minimumPrice ?? null,
      maximumPrice: dto.maximumPrice ?? null,
      applicableDays: dto.applicableDays ?? [],
      applicableSeasons: dto.applicableSeasons ?? [],
      activeFrom: dto.activeFrom,
      activeTo: dto.activeTo ?? null,
      priority: dto.priority ?? 0,
      status: 'DRAFT' as any,
      createdById: dto.createdById,
    })

    setImmediate(() => {
      void this.eventPublisher.publish('pricing.events', {
        eventType: PRICING_EVENTS.PRICING_RULE_CREATED,
        aggregateId: rule.id,
        aggregateType: 'PricingRule',
        organizationId: dto.organizationId,
        payload: {
          ruleId: rule.id,
          hotelId: dto.hotelId,
          organizationId: dto.organizationId,
          ruleName: dto.ruleName,
          pricingStrategy: dto.pricingStrategy,
          createdById: dto.createdById,
        },
      }).catch(() => {})
    })

    this.logger.info({ ruleId: rule.id, hotelId: dto.hotelId, strategy: dto.pricingStrategy }, 'Pricing rule created')
    return rule
  }
}
