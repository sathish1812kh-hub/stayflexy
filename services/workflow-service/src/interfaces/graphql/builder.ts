import SchemaBuilder from '@pothos/core'
import FederationPlugin from '@pothos/plugin-federation'
import type { CreateWorkflow } from '../../application/use-cases/CreateWorkflow'
import type { ExecuteWorkflow } from '../../application/use-cases/ExecuteWorkflow'
import type { ListWorkflows } from '../../application/use-cases/ListWorkflows'
import type { GetWorkflow } from '../../application/use-cases/GetWorkflow'
import type { IAutomationRuleRepository } from '../../domain/repositories/IAutomationRuleRepository'
import type { IWorkflowExecutionRepository } from '../../domain/repositories/IWorkflowExecutionRepository'

export interface GraphQLContext {
  userId: string | null
  organizationId: string | null
  role: string
  correlationId?: string
  
  // Use cases & Repositories
  createWorkflow: CreateWorkflow
  executeWorkflow: ExecuteWorkflow
  listWorkflows: ListWorkflows
  getWorkflow: GetWorkflow
  automationRuleRepo: IAutomationRuleRepository
  workflowExecutionRepo: IWorkflowExecutionRepository
}

export const builder = new SchemaBuilder<{
  Context: GraphQLContext
  Scalars: {
    DateTime: { Input: Date; Output: Date }
  }
}>({
  plugins: [FederationPlugin],
})

builder.scalarType('DateTime', {
  serialize: (value) => (value instanceof Date ? value.toISOString() : value),
  parseValue: (value) => new Date(value as string),
})

builder.queryType({})
builder.mutationType({})
