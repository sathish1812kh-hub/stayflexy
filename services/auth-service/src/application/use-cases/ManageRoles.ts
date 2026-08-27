import type {
  IRBACRepository,
  RoleSummary,
  PermissionSummary,
} from '../../domain/repositories/IRBACRepository'
import type { IUserRepository } from '../../domain/repositories/IUserRepository'
import type { Logger } from '@stayflexi/shared-logger'
import type Redis from 'ioredis'
import { ForbiddenError, UnauthorizedError, ValidationError } from '@stayflexi/shared-errors'

export class ManageRoles {
  constructor(
    private readonly rbacRepo: IRBACRepository,
    private readonly userRepo: IUserRepository,
    private readonly logger: Logger,
    private readonly redis?: Redis,
  ) {}

  private async invalidateUserCache(userId: string): Promise<void> {
    if (!this.redis) return
    try {
      let cursor = '0'
      const pattern = `rbac:user:${userId}:*`
      do {
        const [nextCursor, keys] = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100)
        cursor = nextCursor
        if (keys.length > 0) {
          await this.redis.del(...keys)
        }
      } while (cursor !== '0')
    } catch (err) {
      this.logger.warn('Failed to invalidate RBAC cache', { userId, error: err })
    }
  }

  private async invalidateOrgUserCaches(orgId?: string | null): Promise<void> {
    if (!this.redis) return
    try {
      let cursor = '0'
      const pattern = orgId ? `rbac:user:*:${orgId}:*` : `rbac:user:*`
      do {
        const [nextCursor, keys] = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100)
        cursor = nextCursor
        if (keys.length > 0) {
          await this.redis.del(...keys)
        }
      } while (cursor !== '0')
    } catch (err) {
      this.logger.warn('Failed to invalidate organization RBAC cache', { orgId, error: err })
    }
  }

  async listPermissions(): Promise<PermissionSummary[]> {
    return this.rbacRepo.listPermissions()
  }

  async listRoles(orgId?: string | null): Promise<RoleSummary[]> {
    return this.rbacRepo.listRoles(orgId)
  }

  async getRole(roleId: string, orgId?: string | null): Promise<RoleSummary | null> {
    return this.rbacRepo.getRoleById(roleId, orgId)
  }

  async getUserPermissions(
    userId: string,
    orgId?: string | null,
    hotelId?: string | null,
  ): Promise<string[]> {
    return this.rbacRepo.getUserPermissions(userId, orgId, hotelId)
  }

  async getUserRoles(userId: string, orgId?: string | null): Promise<RoleSummary[]> {
    return this.rbacRepo.getUserRoles(userId, orgId)
  }

  async createRole(
    data: {
      name: string
      description?: string | null
      permissionKeys: string[]
    },
    context: {
      userId: string | null
      organizationId: string | null
      primaryRole: string | null
      isServiceCall: boolean
    },
  ): Promise<RoleSummary> {
    if (!context.userId && !context.isServiceCall) {
      throw new UnauthorizedError('Authentication required')
    }

    if (!data.name || data.name.trim().length === 0) {
      throw new ValidationError('Role name is required')
    }

    const userPermissions = context.userId
      ? await this.rbacRepo.getUserPermissions(context.userId, context.organizationId)
      : []
    const hasPerm =
      context.isServiceCall ||
      context.primaryRole === 'SUPER_ADMIN' ||
      context.primaryRole === 'ORG_ADMIN' ||
      userPermissions.includes('role:create') ||
      userPermissions.includes('role:*') ||
      userPermissions.includes('*')

    if (!hasPerm) {
      throw new ForbiddenError('You do not have permission to create custom roles')
    }

    const created = await this.rbacRepo.createRole({
      name: data.name,
      description: data.description,
      organizationId: context.organizationId,
      permissionKeys: data.permissionKeys,
    })

    this.logger.info('Custom role created', {
      roleId: created.id,
      name: created.name,
      orgId: context.organizationId,
      createdBy: context.userId,
    })

    return created
  }

  async updateRole(
    roleId: string,
    data: {
      name?: string
      description?: string | null
      permissionKeys?: string[]
    },
    context: {
      userId: string | null
      organizationId: string | null
      primaryRole: string | null
      isServiceCall: boolean
    },
  ): Promise<RoleSummary> {
    if (!context.userId && !context.isServiceCall) {
      throw new UnauthorizedError('Authentication required')
    }

    const userPermissions = context.userId
      ? await this.rbacRepo.getUserPermissions(context.userId, context.organizationId)
      : []
    const hasPerm =
      context.isServiceCall ||
      context.primaryRole === 'SUPER_ADMIN' ||
      context.primaryRole === 'ORG_ADMIN' ||
      userPermissions.includes('role:update') ||
      userPermissions.includes('role:*') ||
      userPermissions.includes('*')

    if (!hasPerm) {
      throw new ForbiddenError('You do not have permission to modify roles')
    }

    const updated = await this.rbacRepo.updateRole(roleId, data, context.organizationId)
    await this.invalidateOrgUserCaches(context.organizationId)
    return updated
  }

  async deleteRole(
    roleId: string,
    context: {
      userId: string | null
      organizationId: string | null
      primaryRole: string | null
      isServiceCall: boolean
    },
  ): Promise<boolean> {
    if (!context.userId && !context.isServiceCall) {
      throw new UnauthorizedError('Authentication required')
    }

    const userPermissions = context.userId
      ? await this.rbacRepo.getUserPermissions(context.userId, context.organizationId)
      : []
    const hasPerm =
      context.isServiceCall ||
      context.primaryRole === 'SUPER_ADMIN' ||
      context.primaryRole === 'ORG_ADMIN' ||
      userPermissions.includes('role:delete') ||
      userPermissions.includes('role:*') ||
      userPermissions.includes('*')

    if (!hasPerm) {
      throw new ForbiddenError('You do not have permission to delete roles')
    }

    await this.rbacRepo.deleteRole(roleId, context.organizationId)
    await this.invalidateOrgUserCaches(context.organizationId)
    return true
  }

  async assignRole(
    userId: string,
    roleId: string,
    context: {
      userId: string | null
      organizationId: string | null
      primaryRole: string | null
      isServiceCall: boolean
    },
  ): Promise<boolean> {
    if (!context.userId && !context.isServiceCall) {
      throw new UnauthorizedError('Authentication required')
    }

    const userPermissions = context.userId
      ? await this.rbacRepo.getUserPermissions(context.userId, context.organizationId)
      : []
    const hasPerm =
      context.isServiceCall ||
      context.primaryRole === 'SUPER_ADMIN' ||
      context.primaryRole === 'ORG_ADMIN' ||
      userPermissions.includes('role:assign') ||
      userPermissions.includes('user:update') ||
      userPermissions.includes('*')

    if (!hasPerm) {
      throw new ForbiddenError('You do not have permission to assign roles')
    }

    await this.rbacRepo.assignRole(userId, roleId, context.organizationId)
    await this.invalidateUserCache(userId)
    return true
  }

  async revokeRole(
    userId: string,
    roleId: string,
    context: {
      userId: string | null
      organizationId: string | null
      primaryRole: string | null
      isServiceCall: boolean
    },
  ): Promise<boolean> {
    if (!context.userId && !context.isServiceCall) {
      throw new UnauthorizedError('Authentication required')
    }

    const userPermissions = context.userId
      ? await this.rbacRepo.getUserPermissions(context.userId, context.organizationId)
      : []
    const hasPerm =
      context.isServiceCall ||
      context.primaryRole === 'SUPER_ADMIN' ||
      context.primaryRole === 'ORG_ADMIN' ||
      userPermissions.includes('role:revoke') ||
      userPermissions.includes('user:update') ||
      userPermissions.includes('*')

    if (!hasPerm) {
      throw new ForbiddenError('You do not have permission to revoke roles')
    }

    await this.rbacRepo.revokeRole(userId, roleId, context.organizationId)
    await this.invalidateUserCache(userId)
    return true
  }
}
