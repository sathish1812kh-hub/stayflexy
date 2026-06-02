import SchemaBuilder from '@pothos/core'
import FederationPlugin from '@pothos/plugin-federation'
import type { GetRevenueAnalytics } from '../../application/use-cases/GetRevenueAnalytics'
import type { GetOccupancyAnalytics } from '../../application/use-cases/GetOccupancyAnalytics'

export interface GraphQLContext {
  userId: string | null
  organizationId: string | null
  role: string
  correlationId?: string
  
  // Use cases
  getRevenueAnalytics: GetRevenueAnalytics
  getOccupancyAnalytics: GetOccupancyAnalytics
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
