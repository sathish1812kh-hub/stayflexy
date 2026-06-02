import SchemaBuilder from '@pothos/core'
import FederationPlugin from '@pothos/plugin-federation'
import type { BlockInventory } from '../../application/use-cases/BlockInventory'
import type { CheckAvailability } from '../../application/use-cases/CheckAvailability'
import type { GetAvailabilityCalendar } from '../../application/use-cases/GetAvailabilityCalendar'
import type { ReleaseInventory } from '../../application/use-cases/ReleaseInventory'
import type { ReserveInventory } from '../../application/use-cases/ReserveInventory'
import type { UnblockInventory } from '../../application/use-cases/UnblockInventory'

export interface GraphQLContext {
  userId: string | null
  organizationId: string | null
  role: string
  correlationId?: string
  
  // Use cases
  blockInventory: BlockInventory
  checkAvailability: CheckAvailability
  getAvailabilityCalendar: GetAvailabilityCalendar
  releaseInventory: ReleaseInventory
  reserveInventory: ReserveInventory
  unblockInventory: UnblockInventory
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
