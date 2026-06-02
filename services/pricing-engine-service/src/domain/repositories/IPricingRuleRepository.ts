import type { PricingRule } from '../entities/PricingRule'
import type { PricingRuleProps } from '../entities/PricingRule'

export interface PricingRuleFilters {
  hotelId?: string
  roomTypeId?: string
  status?: string
  pricingStrategy?: string
  page?: number
  limit?: number
}

export interface IPricingRuleRepository {
  findById(id: string): Promise<PricingRule | null>
  findActiveByHotel(hotelId: string, targetDate?: Date): Promise<PricingRule[]>
  findByOrganization(organizationId: string, filters: PricingRuleFilters): Promise<{ data: PricingRule[]; total: number }>
  create(data: Omit<PricingRuleProps, 'id' | 'createdAt' | 'updatedAt'>): Promise<PricingRule>
  update(id: string, data: Partial<Pick<PricingRuleProps, 'ruleName' | 'adjustmentType' | 'adjustmentValue' | 'minimumPrice' | 'maximumPrice' | 'applicableDays' | 'applicableSeasons' | 'activeFrom' | 'activeTo' | 'priority' | 'status'>>): Promise<PricingRule>
  delete(id: string): Promise<void>
}
