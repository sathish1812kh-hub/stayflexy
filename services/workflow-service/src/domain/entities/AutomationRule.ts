export interface AutomationRuleProps {
  id: string
  organizationId: string
  hotelId: string
  ruleName: string
  triggerType: string
  conditionPayload: unknown
  actionPayload: unknown
  ruleStatus: string
  priority: number
  createdById: string
  createdAt: Date
  updatedAt: Date
}

export class AutomationRule {
  constructor(private readonly props: AutomationRuleProps) {}

  get id() { return this.props.id }
  get organizationId() { return this.props.organizationId }
  get hotelId() { return this.props.hotelId }
  get ruleName() { return this.props.ruleName }
  get triggerType() { return this.props.triggerType }
  get conditionPayload() { return this.props.conditionPayload }
  get actionPayload() { return this.props.actionPayload }
  get ruleStatus() { return this.props.ruleStatus }
  get priority() { return this.props.priority }
  get createdById() { return this.props.createdById }

  isActive(): boolean { return this.props.ruleStatus === 'ACTIVE' }
  belongsToOrganization(orgId: string): boolean {
    return this.props.organizationId === orgId
  }
  toJSON(): AutomationRuleProps { return { ...this.props } }
}
