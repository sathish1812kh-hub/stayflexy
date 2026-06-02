import type { AutomationRule } from '../entities/AutomationRule'

export interface IAutomationRuleRepository {
  findById(id: string): Promise<AutomationRule | null>
  findByOrganization(organizationId: string, hotelId?: string): Promise<AutomationRule[]>
  findActiveByTrigger(triggerType: string, organizationId: string): Promise<AutomationRule[]>
  create(data: CreateRuleData): Promise<AutomationRule>
  update(
    id: string,
    data: Partial<CreateRuleData> & { ruleStatus?: string },
  ): Promise<AutomationRule>
}

export interface CreateRuleData {
  organizationId: string
  hotelId: string
  ruleName: string
  triggerType: string
  conditionPayload: unknown
  actionPayload: unknown
  priority?: number
  createdById: string
}
