import { NotFoundError } from '@stayflexi/shared-errors'
import type { IPricingRuleRepository } from '../../domain/repositories/IPricingRuleRepository'
import type { IEventPublisher } from '@stayflexi/shared-events'
import type { Logger } from '@stayflexi/shared-logger'

export class UpdatePricingRule {
  constructor(
    private readonly ruleRepo: IPricingRuleRepository,
    private readonly eventPublisher: IEventPublisher,
    private readonly logger: Logger,
  ) {}

  async execute(id: string, dto: Record<string, unknown>, organizationId: string): Promise<any> {
    const existing = await this.ruleRepo.findById(id)
    if (!existing) throw new NotFoundError('Pricing rule not found')
    const updated = await this.ruleRepo.update(id, dto as any)
    void this.eventPublisher
      .publish('pricing.events', {
        eventType: 'pricing.rule.updated',
        aggregateId: id,
        aggregateType: 'PricingRule',
        organizationId,
        payload: { ruleId: id, updatedFields: Object.keys(dto) },
      })
      .catch(() => {})
    this.logger.info({ ruleId: id }, 'Pricing rule updated')
    return updated
  }
}
