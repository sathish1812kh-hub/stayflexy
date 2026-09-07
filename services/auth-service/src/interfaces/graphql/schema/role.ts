import { builder } from '../builder'
import { toGraphQLError } from '../errors'
import type { RoleSummary, PermissionSummary } from '../../../domain/repositories/IRBACRepository'

// Permission Object Type
export const PermissionRef = builder.objectRef<PermissionSummary>('Permission')
PermissionRef.implement({
  fields: (t) => ({
    id: t.exposeString('id'),
    resource: t.exposeString('resource'),
    action: t.exposeString('action'),
    key: t.exposeString('key'),
    description: t.exposeString('description', { nullable: true }),
  }),
})

// Role Object Type
export const RoleRef = builder.objectRef<RoleSummary>('Role')
RoleRef.implement({
  fields: (t) => ({
    id: t.exposeString('id'),
    name: t.exposeString('name'),
    description: t.exposeString('description', { nullable: true }),
    organizationId: t.exposeString('organizationId', { nullable: true }),
    isSystem: t.exposeBoolean('isSystem'),
    permissions: t.exposeStringList('permissionKeys'),
  }),
})

// UserRole summary type
export const RoleSummaryRef = builder.objectRef<{
  id: string
  name: string
  description: string | null
  organizationId: string | null
  isSystem: boolean
}>('RoleSummary')
RoleSummaryRef.implement({
  fields: (t) => ({
    id: t.exposeString('id'),
    name: t.exposeString('name'),
    description: t.exposeString('description', { nullable: true }),
    organizationId: t.exposeString('organizationId', { nullable: true }),
    isSystem: t.exposeBoolean('isSystem'),
  }),
})

// Queries
builder.queryFields((t) => ({
  permissions: t.field({
    type: [PermissionRef],
    resolve: async (_root, _args, context) => {
      try {
        return await context.manageRoles.listPermissions()
      } catch (err) {
        throw toGraphQLError(err)
      }
    },
  }),

  roles: t.field({
    type: [RoleRef],
    args: {
      organizationId: t.arg.string({ required: false }),
    },
    resolve: async (_root, args, context) => {
      try {
        const orgId = args.organizationId ?? context.organizationId
        return await context.manageRoles.listRoles(orgId)
      } catch (err) {
        throw toGraphQLError(err)
      }
    },
  }),

  role: t.field({
    type: RoleRef,
    nullable: true,
    args: {
      id: t.arg.string({ required: true }),
    },
    resolve: async (_root, args, context) => {
      try {
        return await context.manageRoles.getRole(args.id, context.organizationId)
      } catch (err) {
        throw toGraphQLError(err)
      }
    },
  }),

  userRoles: t.field({
    type: [RoleRef],
    args: {
      userId: t.arg.string({ required: true }),
    },
    resolve: async (_root, args, context) => {
      try {
        return await context.manageRoles.getUserRoles(args.userId, context.organizationId)
      } catch (err) {
        throw toGraphQLError(err)
      }
    },
  }),
}))

// Mutations
builder.mutationFields((t) => ({
  createRole: t.field({
    type: RoleRef,
    args: {
      name: t.arg.string({ required: true }),
      description: t.arg.string({ required: false }),
      permissionKeys: t.arg.stringList({ required: true }),
    },
    resolve: async (_root, args, context) => {
      try {
        return await context.manageRoles.createRole(
          {
            name: args.name,
            description: args.description ?? null,
            permissionKeys: args.permissionKeys,
          },
          context,
        )
      } catch (err) {
        throw toGraphQLError(err)
      }
    },
  }),

  updateRole: t.field({
    type: RoleRef,
    args: {
      id: t.arg.string({ required: true }),
      name: t.arg.string({ required: false }),
      description: t.arg.string({ required: false }),
      permissionKeys: t.arg.stringList({ required: false }),
    },
    resolve: async (_root, args, context) => {
      try {
        return await context.manageRoles.updateRole(
          args.id,
          {
            ...(args.name ? { name: args.name } : {}),
            ...(args.description !== undefined ? { description: args.description } : {}),
            ...(args.permissionKeys ? { permissionKeys: args.permissionKeys } : {}),
          },
          context,
        )
      } catch (err) {
        throw toGraphQLError(err)
      }
    },
  }),

  deleteRole: t.field({
    type: 'Boolean',
    args: {
      id: t.arg.string({ required: true }),
    },
    resolve: async (_root, args, context) => {
      try {
        return await context.manageRoles.deleteRole(args.id, context)
      } catch (err) {
        throw toGraphQLError(err)
      }
    },
  }),

  assignRole: t.field({
    type: 'Boolean',
    args: {
      userId: t.arg.string({ required: true }),
      roleId: t.arg.string({ required: true }),
    },
    resolve: async (_root, args, context) => {
      try {
        return await context.manageRoles.assignRole(args.userId, args.roleId, context)
      } catch (err) {
        throw toGraphQLError(err)
      }
    },
  }),

  revokeRole: t.field({
    type: 'Boolean',
    args: {
      userId: t.arg.string({ required: true }),
      roleId: t.arg.string({ required: true }),
    },
    resolve: async (_root, args, context) => {
      try {
        return await context.manageRoles.revokeRole(args.userId, args.roleId, context)
      } catch (err) {
        throw toGraphQLError(err)
      }
    },
  }),
}))
