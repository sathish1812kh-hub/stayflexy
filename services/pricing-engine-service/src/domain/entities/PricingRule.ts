import type { PricingStrategy, AdjustmentType, PricingRuleStatus } from '@stayflexi/shared-database'

export interface PricingRuleProps {
  id: string
  organizationId: string
  hotelId: string
  roomTypeId: string | null
  ruleName: string
  pricingStrategy: PricingStrategy
  adjustmentType: AdjustmentType
  adjustmentValue: number         // percentage or fixed Decimal as number
  minimumPrice: number | null
  maximumPrice: number | null
  applicableDays: string[]         // MON|TUE|WED|THU|FRI|SAT|SUN
  applicableSeasons: string[]      // PEAK|DEC|SUMMER etc.
  activeFrom: Date
  activeTo: Date | null
  priority: number
  status: PricingRuleStatus
  createdById: string
  createdAt: Date
  updatedAt: Date
}

export class PricingRule {
  constructor(private readonly props: PricingRuleProps) {}

  get id() { return this.props.id }
  get organizationId() { return this.props.organizationId }
  get hotelId() { return this.props.hotelId }
  get roomTypeId() { return this.props.roomTypeId }
  get ruleName() { return this.props.ruleName }
  get pricingStrategy() { return this.props.pricingStrategy }
  get adjustmentType() { return this.props.adjustmentType }
  get adjustmentValue() { return this.props.adjustmentValue }
  get minimumPrice() { return this.props.minimumPrice }
  get maximumPrice() { return this.props.maximumPrice }
  get applicableDays() { return this.props.applicableDays }
  get applicableSeasons() { return this.props.applicableSeasons }
  get activeFrom() { return this.props.activeFrom }
  get activeTo() { return this.props.activeTo }
  get priority() { return this.props.priority }
  get status() { return this.props.status }
  get createdById() { return this.props.createdById }
  get createdAt() { return this.props.createdAt }

  get isActive(): boolean {
    if (this.props.status !== 'ACTIVE') return false
    const now = new Date()
    if (now < this.props.activeFrom) return false
    if (this.props.activeTo && now > this.props.activeTo) return false
    return true
  }

  isApplicableToDate(date: Date): boolean {
    if (!this.isActive) return false
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
    const dow = days[date.getDay()] as string
    if (this.props.applicableDays.length > 0 && !this.props.applicableDays.includes(dow)) {
      return false
    }
    return true
  }

  belongsToOrganization(orgId: string): boolean {
    return this.props.organizationId === orgId
  }

  toJSON(): PricingRuleProps { return { ...this.props } }
}
