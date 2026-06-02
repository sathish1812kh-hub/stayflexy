import SchemaBuilder from '@pothos/core'
import FederationPlugin from '@pothos/plugin-federation'
import type { RegisterUser } from '../../application/use-cases/RegisterUser'
import type { LoginUser } from '../../application/use-cases/LoginUser'
import type { LogoutUser } from '../../application/use-cases/LogoutUser'
import type { RefreshTokens } from '../../application/use-cases/RefreshTokens'
import type { GetCurrentUser } from '../../application/use-cases/GetCurrentUser'

export interface GraphQLContext {
  userId: string | null
  organizationId: string | null
  role: string
  correlationId?: string
  
  // Use cases
  registerUser: RegisterUser
  loginUser: LoginUser
  logoutUser: LogoutUser
  refreshTokens: RefreshTokens
  getCurrentUser: GetCurrentUser
}

export const builder = new SchemaBuilder<{
  Context: GraphQLContext
  Scalars: {
    DateTime: { Input: Date; Output: Date }
  }
}>({
  plugins: [FederationPlugin],
})

// DateTime custom scalar matching hotel-service
builder.scalarType('DateTime', {
  serialize: (value) => (value instanceof Date ? value.toISOString() : value),
  parseValue: (value) => new Date(value as string),
})

builder.queryType({})
builder.mutationType({})
