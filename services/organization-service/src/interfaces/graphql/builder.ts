import SchemaBuilder from '@pothos/core'
import FederationPlugin from '@pothos/plugin-federation'
import type { CreateOrganization } from '../../application/use-cases/CreateOrganization'
import type { GetOrganization } from '../../application/use-cases/GetOrganization'
import type { UpdateOrganization } from '../../application/use-cases/UpdateOrganization'
import type { ListOrganizations } from '../../application/use-cases/ListOrganizations'

export interface GraphQLContext {
  userId: string | null
  organizationId: string | null
  role: string
  correlationId?: string
  
  // Use cases
  createOrganization: CreateOrganization
  getOrganization: GetOrganization
  updateOrganization: UpdateOrganization
  listOrganizations: ListOrganizations
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
