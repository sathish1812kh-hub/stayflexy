import { builder } from '../builder'
import { UnauthorizedError } from '@stayflexi/shared-errors'
import { AutomationRule } from '../../../domain/entities/AutomationRule'

const WorkflowRuleRef = builder.objectRef<any>('WorkflowRule')
const WorkflowExecutionRef = builder.objectRef<any>('WorkflowExecution')

builder.objectType(WorkflowRuleRef, {
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
    createdAt: t.field({ type: 'DateTime', resolve: (rule) => rule.createdAt }),
    updatedAt: t.field({ type: 'DateTime', resolve: (rule) => rule.updatedAt }),
  }),
})

builder.objectType(WorkflowExecutionRef, {
  fields: (t) => ({
    id: t.exposeString('id'),
    workflowName: t.exposeString('workflowName'),
    automationRuleId: t.exposeString('automationRuleId', { nullable: true }),
    executionStatus: t.exposeString('executionStatus'),
    triggerSource: t.exposeString('triggerSource'),
    executionPayload: t.field({
      type: 'String',
      nullable: true,
      resolve: (exec) => exec.executionPayload ? JSON.stringify(exec.executionPayload) : null,
    }),
    resultPayload: t.field({
      type: 'String',
      nullable: true,
      resolve: (exec) => exec.resultPayload ? JSON.stringify(exec.resultPayload) : null,
    }),
    retryCount: t.exposeInt('retryCount'),
    idempotencyKey: t.exposeString('idempotencyKey', { nullable: true }),
    startedAt: t.field({ type: 'DateTime', nullable: true, resolve: (exec) => exec.startedAt }),
    completedAt: t.field({ type: 'DateTime', nullable: true, resolve: (exec) => exec.completedAt }),
    failureReason: t.exposeString('failureReason', { nullable: true }),
    organizationId: t.exposeString('organizationId'),
    hotelId: t.exposeString('hotelId', { nullable: true }),
    createdAt: t.field({ type: 'DateTime', resolve: (exec) => exec.createdAt }),
    updatedAt: t.field({ type: 'DateTime', resolve: (exec) => exec.updatedAt }),
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
      
      // Load active automation rules from ruleRepo
      const list = await ctx.automationRuleRepo.findByHotel(hotelId)
      return list.map(item => ({
        id: item.id,
        organizationId: item.organizationId,
        hotelId: item.hotelId,
        ruleName: item.ruleName,
        triggerType: item.triggerType,
        conditionPayload: item.conditionPayload,
        actionPayload: item.actionPayload,
        ruleStatus: item.ruleStatus,
        priority: item.priority,
        createdById: item.createdById,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
      }))
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
      
      const executions = await ctx.workflowExecutionRepo.findByHotel(hotelId)
      const filtered = workflowId 
        ? executions.filter(e => e.automationRuleId === workflowId)
        : executions
      
      return filtered.map(item => ({
        id: item.id,
        workflowName: item.workflowName,
        automationRuleId: item.automationRuleId,
        executionStatus: item.executionStatus,
        triggerSource: item.triggerSource,
        executionPayload: item.executionPayload,
        resultPayload: item.resultPayload,
        retryCount: item.retryCount,
        idempotencyKey: item.idempotencyKey,
        startedAt: item.startedAt,
        completedAt: item.completedAt,
        failureReason: item.failureReason,
        organizationId: item.organizationId,
        hotelId: item.hotelId,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
      }))
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
      
      // Let's create an entity manually and save it using ruleRepo to write to Postgres!
      const rule = new AutomationRule({
        id: require('crypto').randomUUID ? require('crypto').randomUUID() : `wf-${Math.random().toString(36).substr(2, 9)}`,
        organizationId: ctx.organizationId,
        hotelId,
        ruleName: name,
        triggerType: trigger,
        conditionPayload,
        actionPayload,
        ruleStatus: 'ACTIVE', // Deploy and activate directly!
        priority: 0,
        createdById: ctx.userId,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      
      await ctx.automationRuleRepo.save(rule)
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
      
      const rule = await ctx.automationRuleRepo.findById(id)
      if (!rule) throw new Error('Workflow not found')
      
      const updated = new AutomationRule({
        ...rule.toJSON(),
        ruleStatus: isActive ? 'ACTIVE' : 'INACTIVE',
        updatedAt: new Date()
      })
      
      await ctx.automationRuleRepo.save(updated)
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
      const executionResult = await ctx.executeWorkflow.execute({
        workflowName: rule.ruleName,
        automationRuleId: rule.id,
        triggerSource: 'manual',
        executionPayload: { dryRun: true },
        organizationId: ctx.organizationId,
        hotelId: rule.hotelId,
        context: { ruleName: rule.ruleName }
      }, ctx.organizationId)
      
      // Load the freshly completed/pending execution record from repo
      const exec = await ctx.workflowExecutionRepo.findById(executionResult.executionId)
      if (!exec) throw new Error('Workflow execution failed')
      
      return {
        id: exec.id,
        workflowName: exec.workflowName,
        automationRuleId: exec.automationRuleId,
        executionStatus: exec.executionStatus,
        triggerSource: exec.triggerSource,
        executionPayload: exec.executionPayload,
        resultPayload: exec.resultPayload,
        retryCount: exec.retryCount,
        idempotencyKey: exec.idempotencyKey,
        startedAt: exec.startedAt,
        completedAt: exec.completedAt,
        failureReason: exec.failureReason,
        organizationId: exec.organizationId,
        hotelId: exec.hotelId,
        createdAt: exec.createdAt,
        updatedAt: exec.updatedAt
      }
    },
  }),
}))
