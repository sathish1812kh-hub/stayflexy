import { builder } from '../builder'
import { UserInvitationRef } from './invitation'
import { toGraphQLError } from '../errors'

// Extend Organization entity inside auth-service where auth.prisma is owned (Amendment C)
export const OrganizationEntityRef = builder.objectRef<{ id: string }>('Organization')

OrganizationEntityRef.implement({
  fields: (t) => ({
    id: t.exposeString('id'),
    invitations: t.field({
      type: [UserInvitationRef],
      resolve: async (parent, _args, context) => {
        try {
          return await context.manageInvitations.listInvitations(parent.id)
        } catch (err) {
          throw toGraphQLError(err)
        }
      },
    }),
  }),
})

builder.asEntity(OrganizationEntityRef, {
  key: builder.selection<{ id: string }>('id'),
  resolveReference: (ref) => ({ id: ref.id }),
})
