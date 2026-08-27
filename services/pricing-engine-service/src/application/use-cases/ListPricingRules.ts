import { buildPaginationMeta } from '@stayflexi/shared-types'
import type { PaginationMeta } from '@stayflexi/shared-types'
import { NotFoundError } from '@stayflexi/shared-errors'
import type {
  IPricingRuleRepository,
  PricingRuleFilters,
} from '../../domain/repositories/IPricingRuleRepository'
import type { PricingRule } from '../../domain/entities/PricingRule'

export interface ListPricingRulesResult {
  data: PricingRule[]
  meta: PaginationMeta
}

export class ListPricingRules {
  constructor(private readonly ruleRepo: IPricingRuleRepository) {}

  async execute(
    organizationId: string,
    filters: PricingRuleFilters,
  ): Promise<ListPricingRulesResult> {
    const page = filters.page ?? 1
    const limit = filters.limit ?? 20
    const { data, total } = await this.ruleRepo.findByOrganization(organizationId, filters)
    return { data, meta: buildPaginationMeta(total, page, limit) }
  }

  async findById(id: string, organizationId: string): Promise<PricingRule> {
    const rule = await this.ruleRepo.findById(id)
    if (!rule) throw new NotFoundError('Pricing rule not found')
    if (rule.organizationId !== organizationId) {
      throw new NotFoundError('Pricing rule not found')
    }
    return rule
  }
}
