import { builder } from '../builder'
import { UnauthorizedError } from '@stayflexi/shared-errors'

// User shape representing the authenticated personnel
const UserRef = builder.objectRef<{
  userId: string
  email: string
  firstName: string
  lastName: string
  primaryRole: string
  organizationId: string | null
  status: string
  lastLoginAt: string | null
  emailVerifiedAt: string | null
  createdAt: string
}>('User')

UserRef.implement({
  fields: (t) => ({
    id: t.exposeString('userId'),
    email: t.exposeString('email'),
    firstName: t.exposeString('firstName'),
    lastName: t.exposeString('lastName'),
    fullName: t.string({
      resolve: (user) => `${user.firstName} ${user.lastName}`,
    }),
    phone: t.string({
      nullable: true,
      resolve: () => null, // fallback or map
    }),
    primaryRole: t.exposeString('primaryRole'),
    status: t.exposeString('status'),
    organizationId: t.exposeString('organizationId', { nullable: true }),
    lastLoginAt: t.exposeString('lastLoginAt', { nullable: true }),
    emailVerifiedAt: t.exposeString('emailVerifiedAt', { nullable: true }),
    createdAt: t.exposeString('createdAt'),
  }),
})

// Support Apollo Federation entity resolution
builder.asEntity(UserRef, {
  key: builder.selection<{ id: string }>('id'),
  resolveReference: async (userRef, context) => {
    const user = await context.getCurrentUser.execute(userRef.id)
    return user
  },
})

// Auth Response payload for login mutation
const AuthResponseRef = builder.objectRef<{
  accessToken: string
  refreshToken: string
  user: any
}>('AuthResponse')

AuthResponseRef.implement({
  fields: (t) => ({
    accessToken: t.exposeString('accessToken'),
    refreshToken: t.exposeString('refreshToken'),
    user: t.field({
      type: UserRef,
      resolve: (parent) => parent.user,
    }),
  }),
})

// Queries
builder.queryFields((t) => ({
  currentUser: t.field({
    type: UserRef,
    nullable: true,
    resolve: async (_root, _args, context) => {
      if (!context.userId) {
        throw new UnauthorizedError('User session invalid or expired', 'UNAUTHORIZED')
      }
      return await context.getCurrentUser.execute(context.userId)
    },
  }),
}))

// Mutations
builder.mutationFields((t) => ({
  login: t.field({
    type: AuthResponseRef,
    args: {
      email: t.arg.string({ required: true }),
      password: t.arg.string({ required: true }),
    },
    resolve: async (_root, args, context) => {
      const response = await context.loginUser.execute(
        { email: args.email, password: args.password },
        '127.0.0.1', // mock ip in gateway context or pull from correlation
        'Supergraph-Gate', // mock user agent
        context.correlationId
      )

      // Normalize shape to match AuthUserResponse keys in UserRef
      const normalizedUser = {
        userId: response.user.userId,
        email: response.user.email,
        firstName: response.user.firstName,
        lastName: response.user.lastName,
        primaryRole: response.user.primaryRole,
        organizationId: response.user.organizationId,
        status: response.user.status,
        lastLoginAt: response.user.lastLoginAt,
        emailVerifiedAt: response.user.emailVerifiedAt,
        createdAt: response.user.createdAt,
      }

      return {
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        user: normalizedUser,
      }
    },
  }),
}))
