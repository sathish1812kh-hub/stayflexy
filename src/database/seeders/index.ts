import { PrismaClient, type UserRoleType } from '@prisma/client'

const prisma = new PrismaClient({
  log: ['warn', 'error'],
})

// ─── Permission matrix ─────────────────────────────────────────────────────────
// resource:action pairs that define the full permission surface of the system.
// These are seeded once and never modified at runtime.

const PERMISSIONS: Array<{ resource: string; action: string; description: string }> = [
  // User
  { resource: 'user', action: 'create', description: 'Create a new user' },
  { resource: 'user', action: 'read', description: 'Read user details' },
  { resource: 'user', action: 'update', description: 'Update user details' },
  { resource: 'user', action: 'delete', description: 'Delete a user' },
  { resource: 'user', action: 'export', description: 'Export user data' },

  // Organization
  { resource: 'organization', action: 'create', description: 'Create a new organization' },
  { resource: 'organization', action: 'read', description: 'Read organization details' },
  { resource: 'organization', action: 'update', description: 'Update organization settings' },
  { resource: 'organization', action: 'delete', description: 'Delete an organization' },
  { resource: 'organization', action: 'export', description: 'Export organization data' },

  // Hotel
  { resource: 'hotel', action: 'create', description: 'Create a new hotel' },
  { resource: 'hotel', action: 'read', description: 'Read hotel details' },
  { resource: 'hotel', action: 'update', description: 'Update hotel settings' },
  { resource: 'hotel', action: 'delete', description: 'Delete a hotel' },
  { resource: 'hotel', action: 'export', description: 'Export hotel data' },

  // Room & Room Type
  { resource: 'room', action: 'create', description: 'Create a new room' },
  { resource: 'room', action: 'read', description: 'Read room details' },
  { resource: 'room', action: 'update', description: 'Update room details' },
  { resource: 'room', action: 'delete', description: 'Delete a room' },
  { resource: 'room_type', action: 'create', description: 'Create room type' },
  { resource: 'room_type', action: 'read', description: 'Read room types' },
  { resource: 'room_type', action: 'update', description: 'Update room type' },
  { resource: 'room_type', action: 'delete', description: 'Delete room type' },

  // Booking
  { resource: 'booking', action: 'create', description: 'Create a new booking' },
  { resource: 'booking', action: 'read', description: 'Read booking details' },
  { resource: 'booking', action: 'update', description: 'Update a booking' },
  { resource: 'booking', action: 'cancel', description: 'Cancel a booking' },
  { resource: 'booking', action: 'approve', description: 'Approve a pending booking' },
  { resource: 'booking', action: 'export', description: 'Export booking data' },

  // Payment
  { resource: 'payment', action: 'create', description: 'Record a payment' },
  { resource: 'payment', action: 'read', description: 'Read payment details' },
  { resource: 'payment', action: 'refund', description: 'Issue a refund' },
  { resource: 'payment', action: 'export', description: 'Export payment/financial data' },

  // Inventory
  { resource: 'inventory', action: 'create', description: 'Create inventory' },
  { resource: 'inventory', action: 'read', description: 'Read inventory/availability' },
  { resource: 'inventory', action: 'update', description: 'Update inventory availability' },
  { resource: 'inventory', action: 'block', description: 'Block inventory dates' },
  { resource: 'inventory', action: 'delete', description: 'Delete inventory' },

  // Rate Plan
  { resource: 'rate_plan', action: 'create', description: 'Create a rate plan' },
  { resource: 'rate_plan', action: 'read', description: 'Read rate plans' },
  { resource: 'rate_plan', action: 'update', description: 'Update a rate plan' },
  { resource: 'rate_plan', action: 'delete', description: 'Delete a rate plan' },

  // Housekeeping (Supports both housekeeping_task and housekeeping aliases)
  { resource: 'housekeeping_task', action: 'create', description: 'Create a housekeeping task' },
  { resource: 'housekeeping_task', action: 'read', description: 'Read housekeeping tasks' },
  { resource: 'housekeeping_task', action: 'update', description: 'Update/complete a task' },
  { resource: 'housekeeping_task', action: 'assign', description: 'Assign a task to staff' },
  { resource: 'housekeeping_task', action: 'delete', description: 'Delete a task' },
  { resource: 'housekeeping', action: 'create', description: 'Create housekeeping task (alias)' },
  { resource: 'housekeeping', action: 'read', description: 'Read housekeeping tasks (alias)' },
  { resource: 'housekeeping', action: 'update', description: 'Update housekeeping task (alias)' },
  { resource: 'housekeeping', action: 'assign', description: 'Assign housekeeping task (alias)' },
  { resource: 'housekeeping', action: 'delete', description: 'Delete housekeeping task (alias)' },

  // Notification
  { resource: 'notification', action: 'create', description: 'Create notification' },
  { resource: 'notification', action: 'read', description: 'Read notifications' },
  { resource: 'notification', action: 'update', description: 'Update notification' },
  { resource: 'notification', action: 'send', description: 'Send notifications' },
  { resource: 'notification', action: 'delete', description: 'Delete notification' },

  // Audit
  { resource: 'audit', action: 'create', description: 'Create audit log' },
  { resource: 'audit', action: 'read', description: 'Read audit logs' },
  { resource: 'audit', action: 'export', description: 'Export audit logs' },

  // Invoices & Billing
  { resource: 'invoice', action: 'create', description: 'Create an invoice' },
  { resource: 'invoice', action: 'read', description: 'Read invoice details' },
  { resource: 'invoice', action: 'update', description: 'Update an invoice' },
  { resource: 'invoice', action: 'delete', description: 'Delete an invoice' },
  { resource: 'invoice', action: 'export', description: 'Export invoice data' },

  // Pricing Engine
  { resource: 'pricing', action: 'create', description: 'Create pricing rule' },
  { resource: 'pricing', action: 'read', description: 'Read pricing rules' },
  { resource: 'pricing', action: 'update', description: 'Update pricing rule' },
  { resource: 'pricing', action: 'delete', description: 'Delete pricing rule' },

  // OTA Integration
  { resource: 'ota', action: 'create', description: 'Create OTA channel link' },
  { resource: 'ota', action: 'read', description: 'Read OTA channel links' },
  { resource: 'ota', action: 'update', description: 'Update OTA channel link' },
  { resource: 'ota', action: 'delete', description: 'Delete OTA channel link' },
  { resource: 'ota', action: 'sync', description: 'Trigger OTA channel sync' },

  // Automation & Workflows
  { resource: 'automation', action: 'create', description: 'Create automation rule' },
  { resource: 'automation', action: 'read', description: 'Read automation rule' },
  { resource: 'automation', action: 'update', description: 'Update automation rule' },
  { resource: 'automation', action: 'delete', description: 'Delete automation rule' },

  // Compliance & Security
  { resource: 'compliance', action: 'create', description: 'Create compliance request' },
  { resource: 'compliance', action: 'read', description: 'Read compliance status' },
  { resource: 'compliance', action: 'update', description: 'Update compliance policy' },
  { resource: 'compliance', action: 'delete', description: 'Delete compliance request' },
  { resource: 'compliance', action: 'export', description: 'Export compliance data' },
  { resource: 'security', action: 'create', description: 'Create security grant' },
  { resource: 'security', action: 'read', description: 'Read security logs' },
  { resource: 'security', action: 'update', description: 'Update security policy' },
  { resource: 'security', action: 'revoke', description: 'Revoke security sessions' },

  // Disaster Recovery
  { resource: 'disaster-recovery', action: 'create', description: 'Trigger backup' },
  { resource: 'disaster-recovery', action: 'read', description: 'Read backup status' },
  { resource: 'disaster-recovery', action: 'update', description: 'Update backup config' },
  { resource: 'disaster_recovery', action: 'create', description: 'Trigger backup (alias)' },
  { resource: 'disaster_recovery', action: 'read', description: 'Read backup status (alias)' },
  { resource: 'disaster_recovery', action: 'update', description: 'Update backup config (alias)' },

  // Jobs & Tasks
  { resource: 'jobs', action: 'create', description: 'Create background job' },
  { resource: 'jobs', action: 'read', description: 'Read background jobs' },
  { resource: 'jobs', action: 'update', description: 'Update background job' },
  { resource: 'jobs', action: 'delete', description: 'Cancel background job' },
  { resource: 'job', action: 'create', description: 'Create job (alias)' },
  { resource: 'job', action: 'read', description: 'Read job (alias)' },
  { resource: 'job', action: 'update', description: 'Update job (alias)' },

  // Maintenance
  { resource: 'maintenance', action: 'create', description: 'Create maintenance ticket' },
  { resource: 'maintenance', action: 'read', description: 'Read maintenance tickets' },
  { resource: 'maintenance', action: 'update', description: 'Update maintenance ticket' },
  { resource: 'maintenance', action: 'delete', description: 'Delete maintenance ticket' },

  // Operations
  { resource: 'operations', action: 'create', description: 'Create operations event' },
  { resource: 'operations', action: 'read', description: 'Read operations state' },
  { resource: 'operations', action: 'update', description: 'Update operations state' },
  { resource: 'operations', action: 'delete', description: 'Delete operations event' },

  // RBAC Roles & User Roles
  { resource: 'role', action: 'create', description: 'Create a custom role' },
  { resource: 'role', action: 'read', description: 'Read roles' },
  { resource: 'role', action: 'update', description: 'Update a role' },
  { resource: 'role', action: 'delete', description: 'Delete a custom role' },
  { resource: 'user_role', action: 'create', description: 'Assign role to user' },
  { resource: 'user_role', action: 'read', description: 'Read user roles' },
  { resource: 'user_role', action: 'update', description: 'Update user role' },
  { resource: 'user_role', action: 'delete', description: 'Revoke user role' },
  { resource: 'user_role', action: 'assign', description: 'Assign user role' },
  { resource: 'user_role', action: 'revoke', description: 'Revoke user role' },
]

// ─── System role definitions ───────────────────────────────────────────────────

type PermissionKey = `${string}:${string}`

const SYSTEM_ROLES: Array<{
  name: string
  roleType: UserRoleType
  description: string
  permissions: PermissionKey[]
}> = [
  {
    name: 'Super Admin',
    roleType: 'SUPER_ADMIN',
    description: 'Full platform access across all organizations and hotels',
    permissions: PERMISSIONS.map((p) => `${p.resource}:${p.action}` as PermissionKey),
  },
  {
    name: 'Organization Admin',
    roleType: 'ORG_ADMIN',
    description: 'Full access within their organization',
    permissions: [
      'user:create',
      'user:read',
      'user:update',
      'user:delete',
      'user:export',
      'organization:read',
      'organization:update',
      'organization:export',
      'hotel:create',
      'hotel:read',
      'hotel:update',
      'hotel:delete',
      'hotel:export',
      'room:create',
      'room:read',
      'room:update',
      'room:delete',
      'room_type:create',
      'room_type:read',
      'room_type:update',
      'room_type:delete',
      'booking:create',
      'booking:read',
      'booking:update',
      'booking:cancel',
      'booking:approve',
      'booking:export',
      'payment:create',
      'payment:read',
      'payment:refund',
      'payment:export',
      'inventory:create',
      'inventory:read',
      'inventory:update',
      'inventory:block',
      'inventory:delete',
      'rate_plan:create',
      'rate_plan:read',
      'rate_plan:update',
      'rate_plan:delete',
      'housekeeping_task:create',
      'housekeeping_task:read',
      'housekeeping_task:update',
      'housekeeping_task:assign',
      'housekeeping_task:delete',
      'housekeeping:create',
      'housekeeping:read',
      'housekeeping:update',
      'housekeeping:assign',
      'housekeeping:delete',
      'notification:create',
      'notification:read',
      'notification:send',
      'notification:update',
      'audit:read',
      'audit:export',
      'invoice:create',
      'invoice:read',
      'invoice:update',
      'invoice:delete',
      'invoice:export',
      'pricing:create',
      'pricing:read',
      'pricing:update',
      'pricing:delete',
      'ota:create',
      'ota:read',
      'ota:update',
      'ota:delete',
      'ota:sync',
      'automation:create',
      'automation:read',
      'automation:update',
      'automation:delete',
      'compliance:create',
      'compliance:read',
      'compliance:update',
      'compliance:export',
      'security:create',
      'security:read',
      'security:update',
      'security:revoke',
      'jobs:create',
      'jobs:read',
      'jobs:update',
      'maintenance:create',
      'maintenance:read',
      'maintenance:update',
      'maintenance:delete',
      'operations:create',
      'operations:read',
      'operations:update',
      'role:create',
      'role:read',
      'role:update',
      'role:delete',
      'user_role:create',
      'user_role:read',
      'user_role:update',
      'user_role:delete',
      'user_role:assign',
      'user_role:revoke',
    ],
  },
  {
    name: 'Hotel Manager',
    roleType: 'HOTEL_MANAGER',
    description: 'Manages daily hotel operations within their assigned hotel',
    permissions: [
      'user:read',
      'hotel:read',
      'hotel:update',
      'room:create',
      'room:read',
      'room:update',
      'room:delete',
      'room_type:create',
      'room_type:read',
      'room_type:update',
      'booking:create',
      'booking:read',
      'booking:update',
      'booking:cancel',
      'booking:approve',
      'booking:export',
      'payment:read',
      'payment:create',
      'inventory:create',
      'inventory:read',
      'inventory:update',
      'inventory:block',
      'rate_plan:create',
      'rate_plan:read',
      'rate_plan:update',
      'rate_plan:delete',
      'housekeeping_task:create',
      'housekeeping_task:read',
      'housekeeping_task:update',
      'housekeeping_task:assign',
      'housekeeping_task:delete',
      'housekeeping:create',
      'housekeeping:read',
      'housekeeping:update',
      'housekeeping:assign',
      'housekeeping:delete',
      'notification:read',
      'notification:send',
      'audit:read',
      'invoice:read',
      'pricing:read',
      'pricing:update',
      'ota:read',
      'ota:sync',
      'jobs:read',
      'maintenance:create',
      'maintenance:read',
      'maintenance:update',
      'operations:read',
      'operations:update',
    ],
  },
  {
    name: 'Front Desk',
    roleType: 'FRONT_DESK',
    description: 'Handles check-in, check-out, and guest-facing operations',
    permissions: [
      'room:read',
      'room_type:read',
      'booking:create',
      'booking:read',
      'booking:update',
      'booking:cancel',
      'payment:create',
      'payment:read',
      'inventory:read',
      'housekeeping_task:read',
      'housekeeping:read',
      'notification:read',
      'invoice:read',
      'invoice:create',
    ],
  },
  {
    name: 'Housekeeping',
    roleType: 'HOUSEKEEPING',
    description: 'Manages room cleaning and housekeeping tasks',
    permissions: [
      'room:read',
      'housekeeping_task:read',
      'housekeeping_task:update',
      'housekeeping:read',
      'housekeeping:update',
      'notification:read',
    ],
  },
  {
    name: 'Accountant',
    roleType: 'ACCOUNTANT',
    description: 'Read-only access to financial and booking data for reporting',
    permissions: [
      'booking:read',
      'booking:export',
      'payment:read',
      'payment:export',
      'invoice:read',
      'invoice:export',
      'audit:read',
      'audit:export',
    ],
  },
]

// ─── Seed functions ────────────────────────────────────────────────────────────

async function seedPermissions(): Promise<Map<PermissionKey, string>> {
  console.warn('[seed] Seeding permissions...')
  const permissionIdMap = new Map<PermissionKey, string>()

  for (const perm of PERMISSIONS) {
    const record = await prisma.permission.upsert({
      where: { resource_action: { resource: perm.resource, action: perm.action } },
      update: { description: perm.description },
      create: {
        resource: perm.resource,
        action: perm.action,
        description: perm.description,
      },
    })
    permissionIdMap.set(`${perm.resource}:${perm.action}`, record.id)
  }

  console.warn(`[seed] ${PERMISSIONS.length} permissions seeded.`)
  return permissionIdMap
}

async function seedSystemRoles(
  permissionIdMap: Map<PermissionKey, string>,
): Promise<Map<string, string>> {
  console.warn('[seed] Seeding system roles...')
  const roleIdMap = new Map<string, string>()

  for (const roleDef of SYSTEM_ROLES) {
    const roleId = await resolveRoleId(roleDef.name)
    const role = await prisma.role.upsert({
      where: {
        id: roleId,
      },
      update: { description: roleDef.description },
      create: {
        name: roleDef.name,
        description: roleDef.description,
        organizationId: null,
        isSystem: true,
      },
    })

    roleIdMap.set(roleDef.roleType, role.id)
    roleIdMap.set(roleDef.name, role.id)

    // Sync role permissions
    const permissionIds = roleDef.permissions
      .map((key) => permissionIdMap.get(key))
      .filter((id): id is string => id !== undefined)

    for (const permissionId of permissionIds) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId } },
        update: {},
        create: { roleId: role.id, permissionId },
      })
    }

    console.warn(`[seed] Role "${roleDef.name}" seeded with ${permissionIds.length} permissions.`)
  }

  return roleIdMap
}

async function resolveRoleId(name: string): Promise<string> {
  const existing = await prisma.role.findFirst({
    where: { name, organizationId: null, isSystem: true },
    select: { id: true },
  })
  return existing?.id ?? '00000000-0000-0000-0000-000000000000'
}

async function seedDemoStaffUsers(roleIdMap: Map<string, string>): Promise<void> {
  // Production guard: Never seed demo accounts in production environments
  if (process.env.NODE_ENV === 'production') {
    console.warn(
      '[seed] Production environment detected (NODE_ENV=production) — skipping demo staff accounts seeding.',
    )
    return
  }

  console.warn('[seed] Seeding 7 comprehensive demo role accounts...')

  // Standard development password hash for 'Stayflexi@2026!'
  const devPasswordHash = '$2b$10$EQN23Otvt4EsMwY751BOd.fh30uD59abxsSaciLyl2kSDenzetGhO'

  // 1. Ensure Demo Organization
  const demoOrg = await prisma.organization.upsert({
    where: { slug: 'stayflexi-global-resorts' },
    update: { status: 'ACTIVE' },
    create: {
      name: 'Stayflexi Global Resorts & Luxury Hotels',
      slug: 'stayflexi-global-resorts',
      status: 'ACTIVE',
      plan: 'ENTERPRISE',
      email: 'corporate@stayflexi.com',
      country: 'US',
      owner: {
        create: {
          email: 'super-admin@stayflexi.dev',
          passwordHash: devPasswordHash,
          firstName: 'Super',
          lastName: 'Admin',
          primaryRole: 'SUPER_ADMIN',
          status: 'ACTIVE',
        },
      },
    },
  })

  const demoStaff: Array<{
    email: string
    firstName: string
    lastName: string
    roleType: UserRoleType
  }> = [
    {
      email: 'super-admin@stayflexi.dev',
      firstName: 'Super',
      lastName: 'Admin',
      roleType: 'SUPER_ADMIN',
    },
    {
      email: 'org-admin@stayflexi.dev',
      firstName: 'Organization',
      lastName: 'Admin',
      roleType: 'ORG_ADMIN',
    },
    {
      email: 'manager@stayflexi.dev',
      firstName: 'Property',
      lastName: 'Manager',
      roleType: 'HOTEL_MANAGER',
    },
    {
      email: 'front-desk@stayflexi.dev',
      firstName: 'Front',
      lastName: 'Desk',
      roleType: 'FRONT_DESK',
    },
    {
      email: 'housekeeping@stayflexi.dev',
      firstName: 'Housekeeping',
      lastName: 'Staff',
      roleType: 'HOUSEKEEPING',
    },
    {
      email: 'accountant@stayflexi.dev',
      firstName: 'Finance',
      lastName: 'Accountant',
      roleType: 'ACCOUNTANT',
    },
    {
      email: 'admin@stayflexi.com',
      firstName: 'Stayflexi',
      lastName: 'Admin',
      roleType: 'SUPER_ADMIN',
    },
  ]

  for (const staff of demoStaff) {
    const user = await prisma.user.upsert({
      where: { email: staff.email },
      update: {
        passwordHash: devPasswordHash,
        status: 'ACTIVE',
        primaryRole: staff.roleType,
        organizationId: staff.roleType === 'SUPER_ADMIN' ? null : demoOrg.id,
      },
      create: {
        email: staff.email,
        passwordHash: devPasswordHash,
        firstName: staff.firstName,
        lastName: staff.lastName,
        primaryRole: staff.roleType,
        status: 'ACTIVE',
        organizationId: staff.roleType === 'SUPER_ADMIN' ? null : demoOrg.id,
      },
    })

    const roleId = roleIdMap.get(staff.roleType)
    if (roleId) {
      const orgId = staff.roleType === 'SUPER_ADMIN' ? null : demoOrg.id
      const existingUserRole = await prisma.userRole.findFirst({
        where: {
          userId: user.id,
          roleId: roleId,
        },
      })

      if (!existingUserRole) {
        await prisma.userRole.create({
          data: {
            userId: user.id,
            roleId: roleId,
            organizationId: orgId,
            hotelId: null, // Unscoped hotelId ensures permissions resolve in global context
          },
        })
      } else if (existingUserRole.hotelId !== null) {
        await prisma.userRole.update({
          where: { id: existingUserRole.id },
          data: { hotelId: null, organizationId: orgId },
        })
      }
    }
  }

  console.warn(`[seed] Successfully seeded ${demoStaff.length} demo staff role accounts.`)
}

async function main(): Promise<void> {
  console.warn('[seed] Starting database seed...')

  const permissionIdMap = await seedPermissions()
  const roleIdMap = await seedSystemRoles(permissionIdMap)
  await seedDemoStaffUsers(roleIdMap)

  console.warn('[seed] Database seed complete.')
}

main()
  .catch((error: unknown) => {
    console.error('[seed] Seeding failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
