import { NotFoundError } from '@stayflexi/shared-errors'
import type { IPricingRuleRepository } from '../../domain/repositories/IPricingRuleRepository'
import type { IEventPublisher } from '@stayflexi/shared-events'
import type { Logger } from '@stayflexi/shared-logger'

export class DeletePricingRule {
  constructor(
    private readonly ruleRepo: IPricingRuleRepository,
    private readonly eventPublisher: IEventPublisher,
    private readonly logger: Logger,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const existing = await this.ruleRepo.findById(id)
    if (!existing) throw new NotFoundError('Pricing rule not found')
    await this.ruleRepo.delete(id)
    void this.eventPublisher
      .publish('pricing.events', {
        eventType: 'pricing.rule.deleted',
        aggregateId: id,
        aggregateType: 'PricingRule',
        organizationId,
        payload: { ruleId: id, deleted: true },
      })
      .catch(() => {})
    this.logger.info({ ruleId: id }, 'Pricing rule deleted')
  }
}
