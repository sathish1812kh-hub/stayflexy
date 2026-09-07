import { builder } from '../builder'
import { toGraphQLError } from '../errors'
import { AuthResponseRef } from './user'
import type { UserInvitationRecord } from '../../../domain/repositories/IInvitationRepository'
import type { InviteUserResult } from '../../../application/use-cases/ManageInvitations'

// UserInvitation Object Type
export const UserInvitationRef = builder.objectRef<UserInvitationRecord>('UserInvitation')
UserInvitationRef.implement({
  fields: (t) => ({
    id: t.exposeString('id'),
    email: t.exposeString('email'),
    firstName: t.exposeString('firstName'),
    lastName: t.exposeString('lastName'),
    roleType: t.exposeString('roleType'),
    roleId: t.exposeString('roleId', { nullable: true }),
    organizationId: t.exposeString('organizationId'),
    expiresAt: t.expose('expiresAt', { type: 'DateTime' }),
    acceptedAt: t.expose('acceptedAt', { type: 'DateTime', nullable: true }),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
  }),
})

// InviteUserResponse Object Type
export const InviteUserResponseRef = builder.objectRef<InviteUserResult>('InviteUserResponse')
InviteUserResponseRef.implement({
  fields: (t) => ({
    id: t.exposeString('id'),
    email: t.exposeString('email'),
    organizationId: t.exposeString('organizationId'),
    expiresAt: t.expose('expiresAt', { type: 'DateTime' }),
    invitationToken: t.exposeString('invitationToken', { nullable: true }),
    inviteLink: t.exposeString('inviteLink', { nullable: true }),
  }),
})

// Queries
builder.queryFields((t) => ({
  userInvitations: t.field({
    type: [UserInvitationRef],
    args: {
      organizationId: t.arg.string({ required: false }),
      limit: t.arg.int({ required: false }),
      cursor: t.arg.string({ required: false }),
    },
    resolve: async (_root, args, context) => {
      try {
        const orgId = args.organizationId ?? context.organizationId
        if (!orgId) return []
        return await context.manageInvitations.listInvitations(
          orgId,
          args.limit ?? 50,
          args.cursor ?? undefined,
        )
      } catch (err) {
        throw toGraphQLError(err)
      }
    },
  }),
}))

// Mutations
builder.mutationFields((t) => ({
  inviteUser: t.field({
    type: InviteUserResponseRef,
    args: {
      email: t.arg.string({ required: true }),
      firstName: t.arg.string({ required: true }),
      lastName: t.arg.string({ required: true }),
      roleType: t.arg.string({ required: false }),
      roleId: t.arg.string({ required: false }),
    },
    resolve: async (_root, args, context) => {
      try {
        return await context.manageInvitations.inviteUser(
          {
            email: args.email,
            firstName: args.firstName,
            lastName: args.lastName,
            roleType: args.roleType ?? undefined,
            roleId: args.roleId ?? null,
          },
          context,
        )
      } catch (err) {
        throw toGraphQLError(err)
      }
    },
  }),

  acceptInvite: t.field({
    type: AuthResponseRef,
    args: {
      token: t.arg.string({ required: true }),
      password: t.arg.string({ required: true }),
    },
    resolve: async (_root, args, context) => {
      try {
        const result = await context.manageInvitations.acceptInvite(
          { token: args.token, password: args.password },
          context.ipAddress ?? '127.0.0.1',
          context.userAgent ?? 'GraphQL-Supergraph',
        )
        return {
          accessToken: result.tokens.accessToken,
          refreshToken: result.tokens.refreshToken,
          user: result.user,
        }
      } catch (err) {
        throw toGraphQLError(err)
      }
    },
  }),
}))
