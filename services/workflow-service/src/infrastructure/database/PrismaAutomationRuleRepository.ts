import { getPrismaClient, Prisma } from '@stayflexi/shared-database'
import { fromPrismaError } from '@stayflexi/shared-errors'
import type { PrismaClient, AutomationTriggerType, AutomationRuleStatus } from '@prisma/client'
import { AutomationRule } from '../../domain/entities/AutomationRule'
import type { AutomationRuleProps } from '../../domain/entities/AutomationRule'
import type {
  IAutomationRuleRepository,
  CreateRuleData,
} from '../../domain/repositories/IAutomationRuleRepository'

type PrismaAutomationRule = {
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

function mapToEntity(r: PrismaAutomationRule): AutomationRule {
  const props: AutomationRuleProps = {
    id: r.id,
    organizationId: r.organizationId,
    hotelId: r.hotelId,
    ruleName: r.ruleName,
    triggerType: r.triggerType,
    conditionPayload: r.conditionPayload,
    actionPayload: r.actionPayload,
    ruleStatus: r.ruleStatus,
    priority: r.priority,
    createdById: r.createdById,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }
  return new AutomationRule(props)
}

export class PrismaAutomationRuleRepository implements IAutomationRuleRepository {
  private readonly db: PrismaClient

  constructor(db?: PrismaClient) {
    this.db = db ?? getPrismaClient()
  }

  async findById(id: string): Promise<AutomationRule | null> {
    try {
      const r = await this.db.automationRule.findUnique({ where: { id } })
      return r ? mapToEntity(r) : null
    } catch (err) {
      const e = fromPrismaError(err)
      if (e) throw e
      throw err
    }
  }

  async findByOrganization(
    organizationId: string,
    hotelId?: string,
  ): Promise<AutomationRule[]> {
    try {
      const records = await this.db.automationRule.findMany({
        where: {
          organizationId,
          ...(hotelId !== undefined && { hotelId }),
        },
        orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
      })
      return records.map(mapToEntity)
    } catch (err) {
      const e = fromPrismaError(err)
      if (e) throw e
      throw err
    }
  }

  async findActiveByTrigger(
    triggerType: string,
    organizationId: string,
  ): Promise<AutomationRule[]> {
    try {
      const records = await this.db.automationRule.findMany({
        where: {
          organizationId,
          ruleStatus: 'ACTIVE' as AutomationRuleStatus,
          triggerType: triggerType as AutomationTriggerType,
        },
        orderBy: { priority: 'asc' },
      })
      return records.map(mapToEntity)
    } catch (err) {
      const e = fromPrismaError(err)
      if (e) throw e
      throw err
    }
  }

  async create(data: CreateRuleData): Promise<AutomationRule> {
    try {
      const r = await this.db.automationRule.create({
        data: {
          organizationId: data.organizationId,
          hotelId: data.hotelId,
          ruleName: data.ruleName,
          triggerType: data.triggerType as AutomationTriggerType,
          ruleStatus: 'DRAFT' as AutomationRuleStatus,
          conditionPayload: data.conditionPayload as Prisma.InputJsonValue,
          actionPayload: data.actionPayload as Prisma.InputJsonValue,
          priority: data.priority ?? 0,
          createdById: data.createdById,
        },
      })
      return mapToEntity(r)
    } catch (err) {
      const e = fromPrismaError(err)
      if (e) throw e
      throw err
    }
  }

  async update(
    id: string,
    data: Partial<CreateRuleData> & { ruleStatus?: string },
  ): Promise<AutomationRule> {
    try {
      const r = await this.db.automationRule.update({
        where: { id },
        data: {
          ...(data.ruleName !== undefined && { ruleName: data.ruleName }),
          ...(data.triggerType !== undefined && {
            triggerType: data.triggerType as AutomationTriggerType,
          }),
          ...(data.conditionPayload !== undefined && {
            conditionPayload: data.conditionPayload as Prisma.InputJsonValue,
          }),
          ...(data.actionPayload !== undefined && {
            actionPayload: data.actionPayload as Prisma.InputJsonValue,
          }),
          ...(data.ruleStatus !== undefined && {
            ruleStatus: data.ruleStatus as AutomationRuleStatus,
          }),
          ...(data.priority !== undefined && { priority: data.priority }),
        },
      })
      return mapToEntity(r)
    } catch (err) {
      const e = fromPrismaError(err)
      if (e) throw e
      throw err
    }
  }
}
