import type { PrismaClient } from '@stayflexi/shared-database'
import type {
  IRBACRepository,
  RoleSummary,
  PermissionSummary,
} from '../../domain/repositories/IRBACRepository'
import { NotFoundError, ConflictError, ForbiddenError } from '@stayflexi/shared-errors'

export class PrismaRBACRepository implements IRBACRepository {
  constructor(private readonly db: PrismaClient) {}

  async getUserPermissions(
    userId: string,
    orgId?: string | null,
    hotelId?: string | null,
  ): Promise<string[]> {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: { primaryRole: true, organizationId: true },
    })

    if (!user) return []

    const now = new Date()
    const userRoles = await this.db.userRole.findMany({
      where: {
        userId,
        AND: [
          {
            // Platform-wide (null org) bindings apply everywhere
            OR: [{ organizationId: null }, ...(orgId ? [{ organizationId: orgId }] : [])],
          },
          {
            // Org-wide (null hotel) bindings apply to every hotel
            OR: [{ hotelId: null }, ...(hotelId ? [{ hotelId }] : [])],
          },
        ],
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    })

    const permissions = new Set<string>()

    // Direct role permissions
    for (const ur of userRoles) {
      for (const rp of ur.role.rolePermissions) {
        permissions.add(`${rp.permission.resource}:${rp.permission.action}`)
      }
    }

    // Default system role fallback if no custom permissions resolved
    if (permissions.size === 0 && user.primaryRole) {
      const systemRole = await this.db.role.findFirst({
        where: {
          name: {
            contains: user.primaryRole.replace('_', ' '),
            mode: 'insensitive',
          },
          isSystem: true,
        },
        include: {
          rolePermissions: {
            include: {
              permission: true,
            },
          },
        },
      })
      if (systemRole) {
        for (const rp of systemRole.rolePermissions) {
          permissions.add(`${rp.permission.resource}:${rp.permission.action}`)
        }
      }
    }

    return Array.from(permissions)
  }

  async getUserRoles(userId: string, orgId?: string | null): Promise<RoleSummary[]> {
    const userRoles = await this.db.userRole.findMany({
      where: {
        userId,
        ...(orgId ? { organizationId: orgId } : {}),
      },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    })

    return userRoles.map((ur) => ({
      id: ur.role.id,
      name: ur.role.name,
      description: ur.role.description,
      organizationId: ur.role.organizationId,
      isSystem: ur.role.isSystem,
      permissionKeys: ur.role.rolePermissions.map(
        (rp) => `${rp.permission.resource}:${rp.permission.action}`,
      ),
    }))
  }

  async listPermissions(): Promise<PermissionSummary[]> {
    const permissions = await this.db.permission.findMany({
      orderBy: [{ resource: 'asc' }, { action: 'asc' }],
    })
    return permissions.map((p) => ({
      id: p.id,
      resource: p.resource,
      action: p.action,
      key: `${p.resource}:${p.action}`,
      description: p.description,
    }))
  }

  async listRoles(orgId?: string | null): Promise<RoleSummary[]> {
    const roles = await this.db.role.findMany({
      where: {
        OR: [{ isSystem: true }, ...(orgId ? [{ organizationId: orgId }] : [])],
      },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    })

    return roles.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      organizationId: r.organizationId,
      isSystem: r.isSystem,
      permissionKeys: r.rolePermissions.map(
        (rp) => `${rp.permission.resource}:${rp.permission.action}`,
      ),
    }))
  }

  async getRoleById(roleId: string, orgId?: string | null): Promise<RoleSummary | null> {
    const role = await this.db.role.findFirst({
      where: {
        id: roleId,
        ...(orgId ? { OR: [{ isSystem: true }, { organizationId: orgId }] } : {}),
      },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    })

    if (!role) return null

    return {
      id: role.id,
      name: role.name,
      description: role.description,
      organizationId: role.organizationId,
      isSystem: role.isSystem,
      permissionKeys: role.rolePermissions.map(
        (rp) => `${rp.permission.resource}:${rp.permission.action}`,
      ),
    }
  }

  async createRole(data: {
    name: string
    description?: string | null
    organizationId?: string | null
    permissionKeys: string[]
  }): Promise<RoleSummary> {
    const existing = await this.db.role.findFirst({
      where: {
        name: { equals: data.name.trim(), mode: 'insensitive' },
        organizationId: data.organizationId ?? null,
      },
    })

    if (existing) {
      throw new ConflictError(`A role with name "${data.name}" already exists`)
    }

    // Resolve permission IDs from resource:action keys
    const permPairs = data.permissionKeys
      .filter((k) => k.includes(':'))
      .map((k) => {
        const [resource, action] = k.split(':')
        return { resource, action }
      })

    const permissions =
      permPairs.length > 0
        ? await this.db.permission.findMany({
            where: {
              OR: permPairs,
            },
          })
        : []

    const role = await this.db.$transaction(async (tx) => {
      const created = await tx.role.create({
        data: {
          name: data.name.trim(),
          description: data.description?.trim() ?? null,
          organizationId: data.organizationId ?? null,
          isSystem: false,
        },
      })

      if (permissions.length > 0) {
        await tx.rolePermission.createMany({
          data: permissions.map((p) => ({
            roleId: created.id,
            permissionId: p.id,
          })),
        })
      }

      return created
    })

    return {
      id: role.id,
      name: role.name,
      description: role.description,
      organizationId: role.organizationId,
      isSystem: role.isSystem,
      permissionKeys: permissions.map((p) => `${p.resource}:${p.action}`),
    }
  }

  async updateRole(
    roleId: string,
    data: {
      name?: string
      description?: string | null
      permissionKeys?: string[]
    },
    orgId?: string | null,
  ): Promise<RoleSummary> {
    const role = await this.db.role.findFirst({
      where: {
        id: roleId,
        ...(orgId ? { organizationId: orgId } : {}),
      },
    })

    if (!role) {
      throw new NotFoundError('Role not found')
    }

    if (role.isSystem) {
      throw new ForbiddenError('System roles cannot be modified')
    }

    await this.db.$transaction(async (tx) => {
      if (data.name || data.description !== undefined) {
        await tx.role.update({
          where: { id: roleId },
          data: {
            ...(data.name ? { name: data.name.trim() } : {}),
            ...(data.description !== undefined
              ? { description: data.description?.trim() ?? null }
              : {}),
          },
        })
      }

      if (data.permissionKeys) {
        const permPairs = data.permissionKeys
          .filter((k) => k.includes(':'))
          .map((k) => {
            const [resource, action] = k.split(':')
            return { resource, action }
          })

        const perms =
          permPairs.length > 0
            ? await tx.permission.findMany({
                where: { OR: permPairs },
              })
            : []

        await tx.rolePermission.deleteMany({ where: { roleId } })
        if (perms.length > 0) {
          await tx.rolePermission.createMany({
            data: perms.map((p) => ({ roleId, permissionId: p.id })),
          })
        }
      }
    })

    return this.getRoleById(roleId, orgId) as Promise<RoleSummary>
  }

  async deleteRole(roleId: string, orgId?: string | null): Promise<void> {
    const role = await this.db.role.findFirst({
      where: {
        id: roleId,
        ...(orgId ? { organizationId: orgId } : {}),
      },
    })

    if (!role) {
      throw new NotFoundError('Role not found')
    }

    if (role.isSystem) {
      throw new ForbiddenError('System roles cannot be deleted')
    }

    await this.db.role.delete({ where: { id: roleId } })
  }

  async assignRole(userId: string, roleId: string, orgId?: string | null): Promise<void> {
    const user = await this.db.user.findUnique({ where: { id: userId } })
    if (!user) throw new NotFoundError('User not found')

    const role = await this.db.role.findFirst({
      where: {
        id: roleId,
        OR: [{ isSystem: true }, ...(orgId ? [{ organizationId: orgId }] : [])],
      },
    })
    if (!role) throw new NotFoundError('Role not found')

    const existing = await this.db.userRole.findFirst({
      where: { userId, roleId, organizationId: orgId ?? null },
    })

    if (existing) {
      throw new ConflictError('Role is already assigned to this user')
    }

    await this.db.userRole.create({
      data: {
        userId,
        roleId,
        organizationId: orgId ?? user.organizationId,
      },
    })
  }

  async revokeRole(userId: string, roleId: string, orgId?: string | null): Promise<void> {
    const assignment = await this.db.userRole.findFirst({
      where: {
        userId,
        roleId,
        ...(orgId ? { organizationId: orgId } : {}),
      },
    })

    if (!assignment) {
      throw new NotFoundError('Role assignment not found')
    }

    await this.db.userRole.delete({ where: { id: assignment.id } })
  }
}
