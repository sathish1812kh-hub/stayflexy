import { graphql } from 'graphql'
import { schema } from '../../interfaces/graphql/schema'
import type { GraphQLContext } from '../../interfaces/graphql/builder'
import { ForbiddenError } from '@stayflexi/shared-errors'

describe('GraphQL 5-Phase Parity Test Suite (auth-service)', () => {
  let mockContext: GraphQLContext

  beforeEach(() => {
    mockContext = {
      userId: 'user-admin-1',
      organizationId: 'org-test-1',
      primaryRole: 'ORG_ADMIN',
      isServiceCall: false,
      correlationId: 'corr-123',
      ipAddress: '127.0.0.1',
      userAgent: 'Jest-Runner',

      registerUser: {} as any,
      loginUser: {} as any,
      logoutUser: {} as any,
      refreshTokens: {} as any,
      getCurrentUser: {
        execute: jest.fn().mockResolvedValue({
          userId: 'user-admin-1',
          email: 'admin@stayflexi.com',
          firstName: 'Admin',
          lastName: 'User',
          primaryRole: 'ORG_ADMIN',
          organizationId: 'org-test-1',
          status: 'ACTIVE',
          lastLoginAt: null,
          emailVerifiedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        }),
      } as any,

      manageRoles: {
        listPermissions: jest.fn().mockResolvedValue([
          {
            id: 'p1',
            resource: 'hotel',
            action: 'read',
            key: 'hotel:read',
            description: 'Read hotels',
          },
          {
            id: 'p2',
            resource: 'role',
            action: 'create',
            key: 'role:create',
            description: 'Create roles',
          },
        ]),
        listRoles: jest.fn().mockResolvedValue([
          {
            id: 'r1',
            name: 'ORG_ADMIN',
            description: 'Org Admin',
            organizationId: null,
            isSystem: true,
            permissionKeys: ['hotel:read', 'role:create'],
          },
        ]),
        getRole: jest.fn().mockResolvedValue({
          id: 'r1',
          name: 'ORG_ADMIN',
          description: 'Org Admin',
          organizationId: null,
          isSystem: true,
          permissionKeys: ['hotel:read', 'role:create'],
        }),
        getUserPermissions: jest.fn().mockResolvedValue(['hotel:read', 'role:create']),
        getUserRoles: jest.fn().mockResolvedValue([
          {
            id: 'r1',
            name: 'ORG_ADMIN',
            description: 'Org Admin',
            organizationId: null,
            isSystem: true,
            permissionKeys: ['hotel:read', 'role:create'],
          },
        ]),
        createRole: jest.fn().mockResolvedValue({
          id: 'r-custom-1',
          name: 'Night Auditor',
          description: 'Custom night audit role',
          organizationId: 'org-test-1',
          isSystem: false,
          permissionKeys: ['hotel:read'],
        }),
        updateRole: jest.fn().mockResolvedValue({
          id: 'r-custom-1',
          name: 'Senior Night Auditor',
          description: 'Updated description',
          organizationId: 'org-test-1',
          isSystem: false,
          permissionKeys: ['hotel:read'],
        }),
        deleteRole: jest.fn().mockResolvedValue(true),
        assignRole: jest.fn().mockResolvedValue(true),
        revokeRole: jest.fn().mockResolvedValue(true),
      } as any,

      manageInvitations: {
        listInvitations: jest.fn().mockResolvedValue([
          {
            id: 'inv-1',
            email: 'newuser@stayflexi.com',
            firstName: 'New',
            lastName: 'Staff',
            roleType: 'FRONT_DESK',
            roleId: null,
            organizationId: 'org-test-1',
            invitedById: 'user-admin-1',
            expiresAt: new Date(Date.now() + 100000),
            acceptedAt: null,
            createdAt: new Date(),
          },
        ]),
        inviteUser: jest.fn().mockResolvedValue({
          id: 'inv-1',
          email: 'newuser@stayflexi.com',
          organizationId: 'org-test-1',
          expiresAt: new Date(Date.now() + 100000),
          invitationToken: 'test-token-12345',
          inviteLink: '/auth/accept-invite?token=test-token-12345',
        }),
        acceptInvite: jest.fn().mockResolvedValue({
          user: {
            userId: 'user-new-1',
            email: 'newuser@stayflexi.com',
            firstName: 'New',
            lastName: 'Staff',
            primaryRole: 'FRONT_DESK',
            organizationId: 'org-test-1',
            status: 'ACTIVE',
            createdAt: new Date().toISOString(),
          },
          tokens: {
            accessToken: 'access-jwt-mock',
            refreshToken: 'refresh-token-mock',
          },
        }),
      } as any,
    }
  })

  it('queries currentUser and resolves permissions and roles fields', async () => {
    const query = `
      query {
        currentUser {
          id
          email
          primaryRole
          permissions
          roles {
            id
            name
            isSystem
          }
        }
      }
    `

    const result = await graphql({
      schema,
      source: query,
      contextValue: mockContext,
    })

    expect(result.errors).toBeUndefined()
    const data = result.data as any
    expect(data?.currentUser).toMatchObject({
      id: 'user-admin-1',
      email: 'admin@stayflexi.com',
      primaryRole: 'ORG_ADMIN',
      permissions: ['hotel:read', 'role:create'],
      roles: [{ id: 'r1', name: 'ORG_ADMIN', isSystem: true }],
    })
  })

  it('queries permissions catalog', async () => {
    const query = `
      query {
        permissions {
          id
          key
          resource
          action
        }
      }
    `

    const result = await graphql({
      schema,
      source: query,
      contextValue: mockContext,
    })

    expect(result.errors).toBeUndefined()
    const data = result.data as any
    expect(data?.permissions).toHaveLength(2)
  })

  it('creates custom role via createRole mutation', async () => {
    const mutation = `
      mutation {
        createRole(name: "Night Auditor", description: "Custom night audit role", permissionKeys: ["hotel:read"]) {
          id
          name
          isSystem
          permissions
        }
      }
    `

    const result = await graphql({
      schema,
      source: mutation,
      contextValue: mockContext,
    })

    expect(result.errors).toBeUndefined()
    const data = result.data as any
    expect(data?.createRole).toMatchObject({
      id: 'r-custom-1',
      name: 'Night Auditor',
      isSystem: false,
      permissions: ['hotel:read'],
    })
  })

  it('issues user invitation via inviteUser mutation', async () => {
    const mutation = `
      mutation {
        inviteUser(email: "newuser@stayflexi.com", firstName: "New", lastName: "Staff", roleType: "FRONT_DESK") {
          id
          email
          organizationId
          invitationToken
          inviteLink
        }
      }
    `

    const result = await graphql({
      schema,
      source: mutation,
      contextValue: mockContext,
    })

    expect(result.errors).toBeUndefined()
    const data = result.data as any
    expect(data?.inviteUser).toMatchObject({
      id: 'inv-1',
      email: 'newuser@stayflexi.com',
      organizationId: 'org-test-1',
      invitationToken: 'test-token-12345',
    })
  })

  it('accepts onboarding invitation and returns auth tokens via acceptInvite mutation', async () => {
    const mutation = `
      mutation {
        acceptInvite(token: "test-token-12345", password: "Password123!") {
          accessToken
          refreshToken
          user {
            id
            email
            primaryRole
            status
          }
        }
      }
    `

    const result = await graphql({
      schema,
      source: mutation,
      contextValue: mockContext,
    })

    expect(result.errors).toBeUndefined()
    const data = result.data as any
    expect(data?.acceptInvite).toMatchObject({
      accessToken: 'access-jwt-mock',
      refreshToken: 'refresh-token-mock',
      user: {
        id: 'user-new-1',
        email: 'newuser@stayflexi.com',
        primaryRole: 'FRONT_DESK',
        status: 'ACTIVE',
      },
    })
  })

  it('rejects createRole mutation with FORBIDDEN when caller lacks role:create permission', async () => {
    const unprivilegedContext: GraphQLContext = {
      ...mockContext,
      primaryRole: 'FRONT_DESK',
      userId: 'user-staff-1',
      manageRoles: {
        ...mockContext.manageRoles,
        createRole: jest
          .fn()
          .mockRejectedValue(
            new ForbiddenError('You do not have permission to create custom roles'),
          ),
      } as any,
    }

    const mutation = `
      mutation {
        createRole(name: "Unauthorized Role", permissionKeys: ["hotel:read"]) {
          id
        }
      }
    `

    const result = await graphql({
      schema,
      source: mutation,
      contextValue: unprivilegedContext,
    })

    expect(result.errors).toBeDefined()
    expect(result.errors?.[0]?.extensions?.['code']).toBe('FORBIDDEN')
  })

  it('rejects inviteUser mutation with FORBIDDEN when caller lacks user:create permission', async () => {
    const unprivilegedContext: GraphQLContext = {
      ...mockContext,
      primaryRole: 'HOUSEKEEPING',
      userId: 'user-staff-2',
      manageInvitations: {
        ...mockContext.manageInvitations,
        inviteUser: jest
          .fn()
          .mockRejectedValue(
            new ForbiddenError(
              'You do not have permission to issue user invitations (user:create required)',
            ),
          ),
      } as any,
    }

    const mutation = `
      mutation {
        inviteUser(email: "staff@stayflexi.com", firstName: "Staff", lastName: "Member") {
          id
        }
      }
    `

    const result = await graphql({
      schema,
      source: mutation,
      contextValue: unprivilegedContext,
    })

    expect(result.errors).toBeDefined()
    expect(result.errors?.[0]?.extensions?.['code']).toBe('FORBIDDEN')
  })
})
