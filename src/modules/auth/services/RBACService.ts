import { BaseService } from '@lib/baseService'
import { prisma } from '@lib/prisma'
import { cacheProvider } from '../../../infrastructure/cache'
import { NotFoundError, ConflictError, ForbiddenError } from '@errors/HttpError'
import type {
  CreateRoleDtoType,
  UpdateRoleDtoType,
  AssignRoleDtoType,
  CreatePermissionDtoType,
} from '../dto'

export interface RBACScope {
  organizationId?: string | null
  hotelId?: string | null
}

export interface RoleSummary {
  id: string
  name: string
  description: string | null
  organizationId: string | null
  isSystem: boolean
}

export interface PermissionSummary {
  id: string
  resource: string
  action: string
  key: string // resource:action
}

export interface UserPermissionsResult {
  roles: RoleSummary[]
  permissions: PermissionSummary[]
  permissionKeys: string[]
}

const ROLE_PRIORITY: Record<string, number> = {
  SUPER_ADMIN: 100,
  ORG_ADMIN: 90,
  HOTEL_MANAGER: 80,
  ACCOUNTANT: 70,
  FRONT_DESK: 60,
  HOUSEKEEPING: 50,
  GUEST: 10,
}

function normalizeRoleType(roleName: string): string {
  const upper = roleName.toUpperCase().replace(/\s+/g, '_')
  if (upper.includes('SUPER_ADMIN') || upper === 'SUPER ADMIN') return 'SUPER_ADMIN'
  if (upper.includes('ORG_ADMIN') || upper.includes('ORGANIZATION')) return 'ORG_ADMIN'
  if (upper.includes('HOTEL_MANAGER') || upper.includes('PROPERTY') || upper === 'MANAGER')
    return 'HOTEL_MANAGER'
  if (upper.includes('ACCOUNTANT') || upper.includes('FINANCE')) return 'ACCOUNTANT'
  if (upper.includes('FRONT_DESK') || upper.includes('RECEPTION')) return 'FRONT_DESK'
  if (upper.includes('HOUSEKEEPING')) return 'HOUSEKEEPING'
  return upper
}

export class RBACService extends BaseService {
  protected readonly moduleName = 'RBACService'

  // ─── Role management ─────────────────────────────────────────────────────────

  async createRole(dto: CreateRoleDtoType): Promise<RoleSummary> {
    return this.execute('createRole', async () => {
      const existing = await prisma.role.findFirst({
        where: {
          name: dto.name,
          organizationId: dto.organizationId ?? null,
        },
      })
      if (existing) {
        throw new ConflictError(`Role "${dto.name}" already exists in this scope`)
      }

      const role = await prisma.role.create({
        data: {
          name: dto.name,
          description: dto.description ?? null,
          organizationId: dto.organizationId ?? null,
          isSystem: false,
          ...(dto.permissionIds && dto.permissionIds.length > 0
            ? {
                rolePermissions: {
                  createMany: {
                    data: dto.permissionIds.map((permissionId) => ({ permissionId })),
                    skipDuplicates: true,
                  },
                },
              }
            : {}),
        },
      })

      return this.toRoleSummary(role)
    })
  }

  async findRoleById(id: string): Promise<RoleSummary> {
    return this.execute('findRoleById', async () => {
      const role = await prisma.role.findUnique({ where: { id } })
      if (!role) throw new NotFoundError('Role not found')
      return this.toRoleSummary(role)
    })
  }

  async findRoleWithPermissions(id: string, organizationId?: string) {
    return this.execute('findRoleWithPermissions', async () => {
      const role = await prisma.role.findUnique({
        where: { id },
        include: {
          rolePermissions: {
            include: { permission: true },
          },
        },
      })
      if (!role) throw new NotFoundError('Role not found')
      if (organizationId && role.organizationId && role.organizationId !== organizationId) {
        throw new ForbiddenError('Cannot view roles from another organization')
      }

      return {
        ...this.toRoleSummary(role),
        permissions: role.rolePermissions.map((rp) => this.toPermissionSummary(rp.permission)),
      }
    })
  }

  async updateRole(
    id: string,
    dto: UpdateRoleDtoType,
    organizationId?: string,
  ): Promise<RoleSummary> {
    return this.execute('updateRole', async () => {
      const role = await prisma.role.findUnique({
        where: { id },
        include: { rolePermissions: true },
      })
      if (!role) throw new NotFoundError('Role not found')
      if (role.isSystem) {
        throw new ForbiddenError('System roles cannot be modified')
      }
      if (organizationId && role.organizationId && role.organizationId !== organizationId) {
        throw new ForbiddenError('Cannot modify roles from another organization')
      }

      if (dto.name && dto.name !== role.name) {
        const existing = await prisma.role.findFirst({
          where: {
            name: dto.name,
            organizationId: role.organizationId,
            NOT: { id },
          },
        })
        if (existing) {
          throw new ConflictError(`Role "${dto.name}" already exists in this scope`)
        }
      }

      await prisma.$transaction(async (tx) => {
        await tx.role.update({
          where: { id },
          data: {
            ...(dto.name ? { name: dto.name } : {}),
            ...(dto.description !== undefined ? { description: dto.description } : {}),
          },
        })

        if (dto.permissionIds !== undefined) {
          await tx.rolePermission.deleteMany({ where: { roleId: id } })
          if (dto.permissionIds.length > 0) {
            await tx.rolePermission.createMany({
              data: dto.permissionIds.map((permissionId) => ({
                roleId: id,
                permissionId,
              })),
              skipDuplicates: true,
            })
          }
        }
      })

      const updated = await prisma.role.findUniqueOrThrow({ where: { id } })
      await cacheProvider.delByPattern('rbac:user:*')
      return this.toRoleSummary(updated)
    })
  }

  async deleteRole(id: string, organizationId?: string): Promise<void> {
    return this.execute('deleteRole', async () => {
      const role = await prisma.role.findUnique({ where: { id } })
      if (!role) throw new NotFoundError('Role not found')
      if (role.isSystem) {
        throw new ForbiddenError('System roles cannot be deleted')
      }
      if (organizationId && role.organizationId && role.organizationId !== organizationId) {
        throw new ForbiddenError('Cannot delete roles from another organization')
      }

      await prisma.role.delete({ where: { id } })
      await cacheProvider.delByPattern('rbac:user:*')
    })
  }

  async listRoles(organizationId?: string): Promise<RoleSummary[]> {
    return this.execute('listRoles', async () => {
      const roles = await prisma.role.findMany({
        where: {
          OR: [
            { isSystem: true, organizationId: null },
            ...(organizationId ? [{ organizationId }] : []),
          ],
        },
        orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
      })
      return roles.map((r) => this.toRoleSummary(r))
    })
  }

  // ─── Permission management ────────────────────────────────────────────────────

  async createPermission(dto: CreatePermissionDtoType): Promise<PermissionSummary> {
    return this.execute('createPermission', async () => {
      const existing = await prisma.permission.findUnique({
        where: { resource_action: { resource: dto.resource, action: dto.action } },
      })
      if (existing) {
        throw new ConflictError(`Permission "${dto.resource}:${dto.action}" already exists`)
      }

      const perm = await prisma.permission.create({
        data: {
          resource: dto.resource,
          action: dto.action,
          description: dto.description ?? null,
        },
      })

      return this.toPermissionSummary(perm)
    })
  }

  async listPermissions(resource?: string): Promise<PermissionSummary[]> {
    return this.execute('listPermissions', async () => {
      const perms = await prisma.permission.findMany({
        where: resource ? { resource } : undefined,
        orderBy: [{ resource: 'asc' }, { action: 'asc' }],
      })
      return perms.map((p) => this.toPermissionSummary(p))
    })
  }

  async assignPermissionToRole(roleId: string, permissionId: string): Promise<void> {
    return this.execute('assignPermissionToRole', async () => {
      const [role, perm] = await Promise.all([
        prisma.role.findUnique({ where: { id: roleId }, select: { id: true, isSystem: true } }),
        prisma.permission.findUnique({ where: { id: permissionId }, select: { id: true } }),
      ])

      if (!role) throw new NotFoundError('Role not found')
      if (!perm) throw new NotFoundError('Permission not found')
      if (role.isSystem) throw new ForbiddenError('System roles cannot be modified')

      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId, permissionId } },
        update: {},
        create: { roleId, permissionId },
      })
    })
  }

  // ─── Role assignment ──────────────────────────────────────────────────────────

  async listUserRoles(userId: string, organizationId?: string) {
    return this.execute('listUserRoles', async () => {
      return prisma.userRole.findMany({
        where: {
          userId,
          ...(organizationId
            ? {
                OR: [{ organizationId: null }, { organizationId }],
              }
            : {}),
        },
        include: {
          role: {
            include: {
              rolePermissions: {
                include: { permission: true },
              },
            },
          },
        },
        orderBy: { assignedAt: 'desc' },
      })
    })
  }

  async assignRole(dto: AssignRoleDtoType, assignedById: string): Promise<void> {
    return this.execute('assignRole', async () => {
      const [user, role] = await Promise.all([
        prisma.user.findFirst({
          where: { id: dto.userId, deletedAt: null },
          select: { id: true },
        }),
        prisma.role.findUnique({ where: { id: dto.roleId }, select: { id: true } }),
      ])

      if (!user) throw new NotFoundError('User not found')
      if (!role) throw new NotFoundError('Role not found')

      // Check for duplicate (application-layer uniqueness — see DB_ARCHITECTURE.md)
      const existing = await prisma.userRole.findFirst({
        where: {
          userId: dto.userId,
          roleId: dto.roleId,
          organizationId: dto.organizationId ?? null,
          hotelId: dto.hotelId ?? null,
        },
      })
      if (existing) {
        throw new ConflictError('Role is already assigned to this user in this scope')
      }

      await prisma.userRole.create({
        data: {
          userId: dto.userId,
          roleId: dto.roleId,
          organizationId: dto.organizationId ?? null,
          hotelId: dto.hotelId ?? null,
          assignedById,
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        },
      })

      await this.recomputePrimaryRole(dto.userId)
    })
  }

  async revokeRole(userRoleId: string): Promise<void> {
    return this.execute('revokeRole', async () => {
      const record = await prisma.userRole.findUnique({ where: { id: userRoleId } })
      if (!record) throw new NotFoundError('Role assignment not found')
      await prisma.userRole.delete({ where: { id: userRoleId } })
      await this.recomputePrimaryRole(record.userId)
    })
  }

  async recomputePrimaryRole(userId: string): Promise<string> {
    return this.execute('recomputePrimaryRole', async () => {
      const now = new Date()
      const activeRoles = await prisma.userRole.findMany({
        where: {
          userId,
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        include: { role: true },
      })

      if (activeRoles.length === 0) {
        await prisma.user.update({
          where: { id: userId },
          data: { primaryRole: 'GUEST' as any },
        })
        await this.onRolesChanged(userId)
        return 'GUEST'
      }

      let highestScore = -1
      let highestRole = 'GUEST'

      for (const ur of activeRoles) {
        const norm = normalizeRoleType(ur.role.name)
        const score = ROLE_PRIORITY[norm] ?? 20
        if (score > highestScore) {
          highestScore = score
          highestRole = norm
        }
      }

      await prisma.user.update({
        where: { id: userId },
        data: { primaryRole: highestRole as any },
      })

      await this.onRolesChanged(userId)
      return highestRole
    })
  }

  async onRolesChanged(userId: string): Promise<void> {
    this.log.info('User roles updated, invalidating user RBAC cache', { userId })
    await cacheProvider.delByPattern(`rbac:user:${userId}:*`)
  }

  // ─── Permission checks ────────────────────────────────────────────────────────

  async checkPermission(
    userId: string,
    resource: string,
    action: string,
    scope: RBACScope = {},
  ): Promise<boolean> {
    return this.execute('checkPermission', async () => {
      const keys = await this.getUserPermissionKeys(userId, scope)
      return keys.includes(`${resource}:${action}`)
    })
  }

  async enforcePermission(
    userId: string,
    resource: string,
    action: string,
    scope: RBACScope = {},
  ): Promise<void> {
    const allowed = await this.checkPermission(userId, resource, action, scope)
    if (!allowed) {
      throw new ForbiddenError(`You do not have permission to perform "${action}" on "${resource}"`)
    }
  }

  async getUserPermissions(userId: string, scope: RBACScope = {}): Promise<UserPermissionsResult> {
    return this.execute('getUserPermissions', async () => {
      const cacheKey = `rbac:user:${userId}:${scope.organizationId ?? 'global'}:${scope.hotelId ?? 'global'}`
      const cached = await cacheProvider.get<UserPermissionsResult>(cacheKey)
      if (cached) return cached

      const userRoles = await this.fetchUserRoles(userId, scope)

      const roles = userRoles.map((ur) => this.toRoleSummary(ur.role))
      const permissionSet = new Map<string, PermissionSummary>()

      for (const ur of userRoles) {
        for (const rp of ur.role.rolePermissions) {
          const key = `${rp.permission.resource}:${rp.permission.action}`
          permissionSet.set(key, this.toPermissionSummary(rp.permission))
        }
      }

      const permissions = Array.from(permissionSet.values())
      const permissionKeys = permissions.map((p) => p.key)
      const result = { roles, permissions, permissionKeys }

      await cacheProvider.set(cacheKey, result, 300) // 5 min TTL
      return result
    })
  }

  async getUserPermissionKeys(userId: string, scope: RBACScope = {}): Promise<string[]> {
    const result = await this.getUserPermissions(userId, scope)
    return result.permissionKeys
  }

  // ─── Private helpers ──────────────────────────────────────────────────────────

  private async fetchUserRoles(userId: string, scope: RBACScope) {
    const now = new Date()
    return prisma.userRole.findMany({
      where: {
        userId,
        AND: [
          {
            OR: [
              { organizationId: null },
              ...(scope.organizationId ? [{ organizationId: scope.organizationId }] : []),
            ],
          },
          {
            OR: [{ hotelId: null }, ...(scope.hotelId ? [{ hotelId: scope.hotelId }] : [])],
          },
        ],
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: { select: { id: true, resource: true, action: true } },
              },
            },
          },
        },
      },
    })
  }

  private toRoleSummary(r: {
    id: string
    name: string
    description: string | null
    organizationId: string | null
    isSystem: boolean
  }): RoleSummary {
    return {
      id: r.id,
      name: r.name,
      description: r.description,
      organizationId: r.organizationId,
      isSystem: r.isSystem,
    }
  }

  private toPermissionSummary(p: {
    id: string
    resource: string
    action: string
  }): PermissionSummary {
    return { id: p.id, resource: p.resource, action: p.action, key: `${p.resource}:${p.action}` }
  }
}
