import { builder } from '../builder'
import { UnauthorizedError } from '@stayflexi/shared-errors'
import { AutomationRule } from '../../../domain/entities/AutomationRule'

const WorkflowRuleRef = builder.objectRef<{
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
}>('WorkflowRule')

WorkflowRuleRef.implement({
  fields: (t) => ({
    id: t.exposeString('id'),
    organizationId: t.exposeString('organizationId'),
    hotelId: t.exposeString('hotelId'),
    ruleName: t.exposeString('ruleName'),
    triggerType: t.exposeString('triggerType'),
    conditionPayload: t.field({
      type: 'String',
      resolve: (rule) => JSON.stringify(rule.conditionPayload),
    }),
    actionPayload: t.field({
      type: 'String',
      resolve: (rule) => JSON.stringify(rule.actionPayload),
    }),
    ruleStatus: t.exposeString('ruleStatus'),
    priority: t.exposeInt('priority'),
    createdById: t.exposeString('createdById'),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    updatedAt: t.expose('updatedAt', { type: 'DateTime' }),
  }),
})

const WorkflowExecutionRef = builder.objectRef<{
  id: string
  workflowName: string
  automationRuleId: string | null
  executionStatus: string
  triggerSource: string
  executionPayload: unknown
  resultPayload: unknown
  retryCount: number
  idempotencyKey: string | null
  startedAt: Date | null
  completedAt: Date | null
  failureReason: string | null
  organizationId: string
  hotelId: string | null
  createdAt: Date
  updatedAt: Date
}>('WorkflowExecution')

WorkflowExecutionRef.implement({
  fields: (t) => ({
    id: t.exposeString('id'),
    workflowName: t.exposeString('workflowName'),
    automationRuleId: t.exposeString('automationRuleId', { nullable: true }),
    executionStatus: t.exposeString('executionStatus'),
    triggerSource: t.exposeString('triggerSource'),
    executionPayload: t.field({
      type: 'String',
      nullable: true,
      resolve: (exec) => (exec.executionPayload ? JSON.stringify(exec.executionPayload) : null),
    }),
    resultPayload: t.field({
      type: 'String',
      nullable: true,
      resolve: (exec) => (exec.resultPayload ? JSON.stringify(exec.resultPayload) : null),
    }),
    retryCount: t.exposeInt('retryCount'),
    idempotencyKey: t.exposeString('idempotencyKey', { nullable: true }),
    startedAt: t.expose('startedAt', { type: 'DateTime', nullable: true }),
    completedAt: t.expose('completedAt', { type: 'DateTime', nullable: true }),
    failureReason: t.exposeString('failureReason', { nullable: true }),
    organizationId: t.exposeString('organizationId'),
    hotelId: t.exposeString('hotelId', { nullable: true }),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    updatedAt: t.expose('updatedAt', { type: 'DateTime' }),
  }),
})

// Queries
builder.queryFields((t) => ({
  workflows: t.field({
    type: [WorkflowRuleRef],
    args: {
      hotelId: t.arg.string({ required: true }),
    },
    resolve: async (_root, { hotelId }, ctx) => {
      if (!ctx.organizationId) throw new UnauthorizedError('Unauthorized')

      const list = await ctx.automationRuleRepo.findByOrganization(ctx.organizationId, hotelId)
      return list.map((item) => item.toJSON())
    },
  }),
  workflowExecutions: t.field({
    type: [WorkflowExecutionRef],
    args: {
      hotelId: t.arg.string({ required: true }),
      workflowId: t.arg.string(),
    },
    resolve: async (_root, { hotelId, workflowId }, ctx) => {
      if (!ctx.organizationId) throw new UnauthorizedError('Unauthorized')

      const result = await ctx.workflowExecutionRepo.findByOrganization(ctx.organizationId, {
        hotelId,
      })
      const executions = result.data
      const filtered = workflowId
        ? executions.filter((e) => e.automationRuleId === workflowId)
        : executions

      return filtered.map((item) => item.toJSON())
    },
  }),
}))

// Mutations
builder.mutationFields((t) => ({
  createWorkflow: t.field({
    type: WorkflowRuleRef,
    args: {
      hotelId: t.arg.string({ required: true }),
      name: t.arg.string({ required: true }),
      trigger: t.arg.string({ required: true }),
      action: t.arg.string({ required: true }),
      service: t.arg.string({ required: true }),
    },
    resolve: async (_root, { hotelId, name, trigger, action, service }, ctx) => {
      if (!ctx.organizationId || !ctx.userId) throw new UnauthorizedError('Unauthorized')

      const conditionPayload = { predicate: [] }
      const actionPayload = { type: action, params: { service } }

      const rule = await ctx.automationRuleRepo.create({
        organizationId: ctx.organizationId,
        hotelId,
        ruleName: name,
        triggerType: trigger,
        conditionPayload,
        actionPayload,
        priority: 0,
        createdById: ctx.userId,
      })

      return rule.toJSON()
    },
  }),
  toggleWorkflow: t.field({
    type: WorkflowRuleRef,
    args: {
      id: t.arg.string({ required: true }),
      isActive: t.arg.boolean({ required: true }),
    },
    resolve: async (_root, { id, isActive }, ctx) => {
      if (!ctx.organizationId) throw new UnauthorizedError('Unauthorized')

      const updated = await ctx.automationRuleRepo.update(id, {
        ruleStatus: isActive ? 'ACTIVE' : 'INACTIVE',
      })

      return updated.toJSON()
    },
  }),
  dryRunWorkflow: t.field({
    type: WorkflowExecutionRef,
    args: {
      id: t.arg.string({ required: true }),
    },
    resolve: async (_root, { id }, ctx) => {
      if (!ctx.organizationId) throw new UnauthorizedError('Unauthorized')

      const rule = await ctx.automationRuleRepo.findById(id)
      if (!rule) throw new Error('Workflow rule not found')

      // Execute a trial run dry-run trigger through the engine
      const executionResult = await ctx.executeWorkflow.execute(
        {
          workflowName: rule.ruleName,
          automationRuleId: rule.id,
          triggerSource: 'manual',
          hotelId: rule.hotelId,
          context: { dryRun: true, ruleName: rule.ruleName },
        },
        ctx.organizationId,
      )

      // Load the freshly completed/pending execution record from repo
      const exec = await ctx.workflowExecutionRepo.findById(executionResult.executionId)
      if (!exec) throw new Error('Workflow execution failed')

      return exec.toJSON()
    },
  }),
}))
