import SchemaBuilder from '@pothos/core'
import FederationPlugin from '@pothos/plugin-federation'
import type { ConnectOtaProvider } from '../../application/use-cases/ConnectOtaProvider'
import type { SyncInventory } from '../../application/use-cases/SyncInventory'
import type { SyncRates } from '../../application/use-cases/SyncRates'
import type { SyncReservations } from '../../application/use-cases/SyncReservations'
import type { IOtaProviderRepository } from '../../domain/repositories/IOtaProviderRepository'
import type { IOtaMappingRepository } from '../../domain/repositories/IOtaMappingRepository'
import type { ISyncJobRepository } from '../../domain/repositories/ISyncJobRepository'

export interface GraphQLContext {
  userId: string | null
  organizationId: string | null
  role: string
  correlationId?: string
  
  // Use cases & Repositories
  connectOtaProvider: ConnectOtaProvider
  syncInventory: SyncInventory
  syncRates: SyncRates
  syncReservations: SyncReservations
  providerRepo: IOtaProviderRepository
  mappingRepo: IOtaMappingRepository
  syncJobRepo: ISyncJobRepository
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
