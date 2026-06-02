import type { ValidationResult } from '../types/index'
import { createResult } from '../types/index'

export type Role =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'MANAGER'
  | 'FRONT_DESK'
  | 'HOUSEKEEPING'
  | 'ACCOUNTANT'
  | 'READ_ONLY'

export interface Permission {
  resource: string
  actions: ('create' | 'read' | 'update' | 'delete')[]
}

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  SUPER_ADMIN: [{ resource: '*', actions: ['create', 'read', 'update', 'delete'] }],
  ADMIN: [
    { resource: 'bookings', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'hotels', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'rooms', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'users', actions: ['create', 'read', 'update'] },
    { resource: 'payments', actions: ['read', 'update'] },
    { resource: 'reports', actions: ['read'] },
  ],
  MANAGER: [
    { resource: 'bookings', actions: ['create', 'read', 'update'] },
    { resource: 'rooms', actions: ['read', 'update'] },
    { resource: 'payments', actions: ['read'] },
    { resource: 'reports', actions: ['read'] },
  ],
  FRONT_DESK: [
    { resource: 'bookings', actions: ['create', 'read', 'update'] },
    { resource: 'rooms', actions: ['read'] },
    { resource: 'guests', actions: ['create', 'read', 'update'] },
  ],
  HOUSEKEEPING: [
    { resource: 'rooms', actions: ['read', 'update'] },
    { resource: 'bookings', actions: ['read'] },
  ],
  ACCOUNTANT: [
    { resource: 'payments', actions: ['create', 'read', 'update'] },
    { resource: 'invoices', actions: ['create', 'read'] },
    { resource: 'reports', actions: ['read'] },
  ],
  READ_ONLY: [
    { resource: 'bookings', actions: ['read'] },
    { resource: 'rooms', actions: ['read'] },
    { resource: 'reports', actions: ['read'] },
  ],
}

export class RbacValidator {
  hasPermission(
    role: Role,
    resource: string,
    action: 'create' | 'read' | 'update' | 'delete',
  ): boolean {
    const permissions = ROLE_PERMISSIONS[role]
    if (!permissions) return false

    for (const perm of permissions) {
      if (
        (perm.resource === '*' || perm.resource === resource) &&
        perm.actions.includes(action)
      ) {
        return true
      }
    }
    return false
  }

  validateRoleHierarchy(): ValidationResult {
    const start = Date.now()
    const errors: string[] = []

    // SUPER_ADMIN must have all permissions
    if (!this.hasPermission('SUPER_ADMIN', 'bookings', 'delete')) {
      errors.push('SUPER_ADMIN must be able to delete bookings')
    }

    // READ_ONLY must not have write permissions
    if (this.hasPermission('READ_ONLY', 'bookings', 'create')) {
      errors.push('READ_ONLY must not create bookings')
    }
    if (this.hasPermission('READ_ONLY', 'bookings', 'delete')) {
      errors.push('READ_ONLY must not delete bookings')
    }

    // HOUSEKEEPING must not access payments
    if (this.hasPermission('HOUSEKEEPING', 'payments', 'read')) {
      errors.push('HOUSEKEEPING must not read payments')
    }

    // FRONT_DESK must not delete bookings
    if (this.hasPermission('FRONT_DESK', 'bookings', 'delete')) {
      errors.push('FRONT_DESK must not delete bookings')
    }

    return createResult(
      'RoleHierarchy',
      errors.length === 0,
      `Role hierarchy validation: ${errors.length} violation(s)`,
      errors,
      [],
      Date.now() - start,
    )
  }

  validateLeastPrivilege(role: Role, allowedResources: string[]): ValidationResult {
    const start = Date.now()
    const permissions = ROLE_PERMISSIONS[role] ?? []
    const errors: string[] = []

    for (const perm of permissions) {
      if (perm.resource !== '*' && !allowedResources.includes(perm.resource)) {
        errors.push(`Role ${role} has unexpected access to: ${perm.resource}`)
      }
    }

    return createResult(
      'LeastPrivilege',
      errors.length === 0,
      `${role}: ${permissions.length} permission sets`,
      errors,
      [],
      Date.now() - start,
    )
  }
}
