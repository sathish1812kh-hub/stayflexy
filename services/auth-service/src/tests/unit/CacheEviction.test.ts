import { ManageRoles } from '../../application/use-cases/ManageRoles'
import type { IRBACRepository } from '../../domain/repositories/IRBACRepository'
import type { IUserRepository } from '../../domain/repositories/IUserRepository'
import type { Logger } from '@stayflexi/shared-logger'

describe('RBAC Cache Eviction Unit Suite (ManageRoles)', () => {
  let mockRbacRepo: jest.Mocked<IRBACRepository>
  let mockUserRepo: jest.Mocked<IUserRepository>
  let mockLogger: jest.Mocked<Logger>
  let mockRedis: any
  let manageRoles: ManageRoles

  beforeEach(() => {
    mockRbacRepo = {
      listPermissions: jest.fn(),
      listRoles: jest.fn(),
      getRoleById: jest.fn(),
      getUserPermissions: jest
        .fn()
        .mockResolvedValue([
          'role:create',
          'role:update',
          'role:delete',
          'role:assign',
          'role:revoke',
        ]),
      getUserRoles: jest.fn(),
      createRole: jest.fn().mockResolvedValue({
        id: 'r1',
        name: 'Role 1',
        description: null,
        organizationId: 'org-1',
        isSystem: false,
        permissionKeys: ['hotel:read'],
      }),
      updateRole: jest.fn().mockResolvedValue({
        id: 'r1',
        name: 'Role 1 Updated',
        description: null,
        organizationId: 'org-1',
        isSystem: false,
        permissionKeys: ['hotel:read', 'hotel:write'],
      }),
      deleteRole: jest.fn().mockResolvedValue(undefined),
      assignRole: jest.fn().mockResolvedValue(true),
      revokeRole: jest.fn().mockResolvedValue(true),
    } as any

    mockUserRepo = {} as any
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    } as any

    mockRedis = {
      scan: jest.fn().mockResolvedValue(['0', ['rbac:user:user-1:org-1:cache']]),
      del: jest.fn().mockResolvedValue(1),
    }

    manageRoles = new ManageRoles(mockRbacRepo, mockUserRepo, mockLogger, mockRedis)
  })

  it('evicts user cache on assignRole', async () => {
    const result = await manageRoles.assignRole('user-1', 'role-1', {
      userId: 'admin-1',
      organizationId: 'org-1',
      primaryRole: 'ORG_ADMIN',
      isServiceCall: false,
    })

    expect(result).toBe(true)
    expect(mockRedis.scan).toHaveBeenCalledWith('0', 'MATCH', 'rbac:user:user-1:*', 'COUNT', 100)
    expect(mockRedis.del).toHaveBeenCalledWith('rbac:user:user-1:org-1:cache')
  })

  it('evicts user cache on revokeRole', async () => {
    const result = await manageRoles.revokeRole('user-1', 'role-1', {
      userId: 'admin-1',
      organizationId: 'org-1',
      primaryRole: 'ORG_ADMIN',
      isServiceCall: false,
    })

    expect(result).toBe(true)
    expect(mockRedis.scan).toHaveBeenCalledWith('0', 'MATCH', 'rbac:user:user-1:*', 'COUNT', 100)
    expect(mockRedis.del).toHaveBeenCalledWith('rbac:user:user-1:org-1:cache')
  })

  it('evicts organization user caches on updateRole', async () => {
    const result = await manageRoles.updateRole(
      'role-1',
      { name: 'New Name' },
      {
        userId: 'admin-1',
        organizationId: 'org-1',
        primaryRole: 'ORG_ADMIN',
        isServiceCall: false,
      },
    )

    expect(result.id).toBe('r1')
    expect(mockRedis.scan).toHaveBeenCalledWith('0', 'MATCH', 'rbac:user:*:org-1:*', 'COUNT', 100)
    expect(mockRedis.del).toHaveBeenCalledWith('rbac:user:user-1:org-1:cache')
  })

  it('evicts organization user caches on deleteRole', async () => {
    const result = await manageRoles.deleteRole('role-1', {
      userId: 'admin-1',
      organizationId: 'org-1',
      primaryRole: 'ORG_ADMIN',
      isServiceCall: false,
    })

    expect(result).toBe(true)
    expect(mockRedis.scan).toHaveBeenCalledWith('0', 'MATCH', 'rbac:user:*:org-1:*', 'COUNT', 100)
    expect(mockRedis.del).toHaveBeenCalledWith('rbac:user:user-1:org-1:cache')
  })
})
