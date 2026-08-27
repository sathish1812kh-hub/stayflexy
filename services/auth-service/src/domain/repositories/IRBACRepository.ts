export interface RoleSummary {
  id: string
  name: string
  description: string | null
  organizationId: string | null
  isSystem: boolean
  permissionKeys: string[]
}

export interface PermissionSummary {
  id: string
  resource: string
  action: string
  key: string
  description: string | null
}

export interface IRBACRepository {
  // Resolves effective permission keys. A user role binding applies when its
  // organizationId is null (platform-wide) or matches orgId, and its hotelId is
  // null (org-wide) or matches hotelId. Expired bindings are excluded.
  getUserPermissions(
    userId: string,
    orgId?: string | null,
    hotelId?: string | null,
  ): Promise<string[]>
  getUserRoles(userId: string, orgId?: string | null): Promise<RoleSummary[]>
  listPermissions(): Promise<PermissionSummary[]>
  listRoles(orgId?: string | null): Promise<RoleSummary[]>
  getRoleById(roleId: string, orgId?: string | null): Promise<RoleSummary | null>
  createRole(data: {
    name: string
    description?: string | null
    organizationId?: string | null
    permissionKeys: string[]
  }): Promise<RoleSummary>
  updateRole(
    roleId: string,
    data: {
      name?: string
      description?: string | null
      permissionKeys?: string[]
    },
    orgId?: string | null,
  ): Promise<RoleSummary>
  deleteRole(roleId: string, orgId?: string | null): Promise<void>
  assignRole(userId: string, roleId: string, orgId?: string | null): Promise<void>
  revokeRole(userId: string, roleId: string, orgId?: string | null): Promise<void>
}
