import SchemaBuilder from '@pothos/core'
import FederationPlugin from '@pothos/plugin-federation'
import type { CreateBooking } from '../../application/use-cases/CreateBooking'
import type { CheckIn } from '../../application/use-cases/CheckIn'
import type { CheckOut } from '../../application/use-cases/CheckOut'
import type { CancelBooking } from '../../application/use-cases/CancelBooking'
import type { GetBooking } from '../../application/use-cases/GetBooking'
import type { SearchBookings } from '../../application/use-cases/SearchBookings'

export interface GraphQLContext {
  userId: string | null
  organizationId: string | null
  role: string
  correlationId?: string
  
  // Use cases
  createBooking: CreateBooking
  checkIn: CheckIn
  checkOut: CheckOut
  cancelBooking: CancelBooking
  getBooking: GetBooking
  searchBookings: SearchBookings
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
