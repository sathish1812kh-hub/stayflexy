export interface DynamicRateProps {
  id: string
  organizationId: string
  hotelId: string
  roomTypeId: string
  inventoryDate: Date
  calculatedRate: number
  baseRate: number
  appliedRuleId: string | null
  occupancyFactor: number
  demandFactor: number
  createdAt: Date
  updatedAt: Date
}

export class DynamicRate {
  constructor(private readonly props: DynamicRateProps) {}

  get id() { return this.props.id }
  get organizationId() { return this.props.organizationId }
  get hotelId() { return this.props.hotelId }
  get roomTypeId() { return this.props.roomTypeId }
  get inventoryDate() { return this.props.inventoryDate }
  get calculatedRate() { return this.props.calculatedRate }
  get baseRate() { return this.props.baseRate }
  get appliedRuleId() { return this.props.appliedRuleId }
  get occupancyFactor() { return this.props.occupancyFactor }
  get demandFactor() { return this.props.demandFactor }
  get createdAt() { return this.props.createdAt }

  get effectiveMultiplier(): number {
    return this.props.baseRate > 0 ? this.props.calculatedRate / this.props.baseRate : 1.0
  }

  belongsToOrganization(orgId: string): boolean {
    return this.props.organizationId === orgId
  }

  toJSON(): DynamicRateProps { return { ...this.props } }
}
