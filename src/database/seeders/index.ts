import { PrismaClient, type UserRoleType } from "@prisma/client";

const prisma = new PrismaClient({
  log: ["warn", "error"],
});

// ─── Permission matrix ─────────────────────────────────────────────────────────
// resource:action pairs that define the full permission surface of the system.
// These are seeded once and never modified at runtime.

const PERMISSIONS: Array<{ resource: string; action: string; description: string }> = [
  // User
  { resource: "user", action: "create", description: "Create a new user" },
  { resource: "user", action: "read", description: "Read user details" },
  { resource: "user", action: "update", description: "Update user details" },
  { resource: "user", action: "delete", description: "Delete a user" },
  { resource: "user", action: "export", description: "Export user data" },

  // Organization
  { resource: "organization", action: "create", description: "Create a new organization" },
  { resource: "organization", action: "read", description: "Read organization details" },
  { resource: "organization", action: "update", description: "Update organization settings" },
  { resource: "organization", action: "delete", description: "Delete an organization" },
  { resource: "organization", action: "export", description: "Export organization data" },

  // Hotel
  { resource: "hotel", action: "create", description: "Create a new hotel" },
  { resource: "hotel", action: "read", description: "Read hotel details" },
  { resource: "hotel", action: "update", description: "Update hotel settings" },
  { resource: "hotel", action: "delete", description: "Delete a hotel" },
  { resource: "hotel", action: "export", description: "Export hotel data" },

  // Room
  { resource: "room", action: "create", description: "Create a new room" },
  { resource: "room", action: "read", description: "Read room details" },
  { resource: "room", action: "update", description: "Update room details" },
  { resource: "room", action: "delete", description: "Delete a room" },

  // Booking
  { resource: "booking", action: "create", description: "Create a new booking" },
  { resource: "booking", action: "read", description: "Read booking details" },
  { resource: "booking", action: "update", description: "Update a booking" },
  { resource: "booking", action: "cancel", description: "Cancel a booking" },
  { resource: "booking", action: "approve", description: "Approve a pending booking" },
  { resource: "booking", action: "export", description: "Export booking data" },

  // Payment
  { resource: "payment", action: "create", description: "Record a payment" },
  { resource: "payment", action: "read", description: "Read payment details" },
  { resource: "payment", action: "refund", description: "Issue a refund" },
  { resource: "payment", action: "export", description: "Export payment/financial data" },

  // Inventory
  { resource: "inventory", action: "read", description: "Read inventory/availability" },
  { resource: "inventory", action: "update", description: "Update inventory availability" },
  { resource: "inventory", action: "block", description: "Block inventory dates" },

  // Rate Plan
  { resource: "rate_plan", action: "create", description: "Create a rate plan" },
  { resource: "rate_plan", action: "read", description: "Read rate plans" },
  { resource: "rate_plan", action: "update", description: "Update a rate plan" },
  { resource: "rate_plan", action: "delete", description: "Delete a rate plan" },

  // Housekeeping
  { resource: "housekeeping_task", action: "create", description: "Create a housekeeping task" },
  { resource: "housekeeping_task", action: "read", description: "Read housekeeping tasks" },
  { resource: "housekeeping_task", action: "update", description: "Update/complete a task" },
  { resource: "housekeeping_task", action: "assign", description: "Assign a task to staff" },
  { resource: "housekeeping_task", action: "delete", description: "Delete a task" },

  // Notification
  { resource: "notification", action: "read", description: "Read notifications" },
  { resource: "notification", action: "send", description: "Send notifications" },

  // Audit
  { resource: "audit", action: "read", description: "Read audit logs" },
  { resource: "audit", action: "export", description: "Export audit logs" },
];

// ─── System role definitions ───────────────────────────────────────────────────

type PermissionKey = `${string}:${string}`;

const SYSTEM_ROLES: Array<{
  name: string;
  roleType: UserRoleType;
  description: string;
  permissions: PermissionKey[];
}> = [
  {
    name: "Super Admin",
    roleType: "SUPER_ADMIN",
    description: "Full platform access across all organizations and hotels",
    permissions: PERMISSIONS.map((p) => `${p.resource}:${p.action}` as PermissionKey),
  },
  {
    name: "Organization Admin",
    roleType: "ORG_ADMIN",
    description: "Full access within their organization",
    permissions: [
      "user:create", "user:read", "user:update", "user:delete", "user:export",
      "hotel:create", "hotel:read", "hotel:update", "hotel:delete", "hotel:export",
      "room:create", "room:read", "room:update", "room:delete",
      "booking:create", "booking:read", "booking:update", "booking:cancel", "booking:approve", "booking:export",
      "payment:create", "payment:read", "payment:refund", "payment:export",
      "inventory:read", "inventory:update", "inventory:block",
      "rate_plan:create", "rate_plan:read", "rate_plan:update", "rate_plan:delete",
      "housekeeping_task:create", "housekeeping_task:read", "housekeeping_task:update", "housekeeping_task:assign", "housekeeping_task:delete",
      "notification:read", "notification:send",
      "audit:read", "audit:export",
    ],
  },
  {
    name: "Hotel Manager",
    roleType: "HOTEL_MANAGER",
    description: "Manages daily hotel operations within their assigned hotel",
    permissions: [
      "user:read",
      "hotel:read", "hotel:update",
      "room:create", "room:read", "room:update", "room:delete",
      "booking:create", "booking:read", "booking:update", "booking:cancel", "booking:approve",
      "payment:read",
      "inventory:read", "inventory:update", "inventory:block",
      "rate_plan:create", "rate_plan:read", "rate_plan:update", "rate_plan:delete",
      "housekeeping_task:create", "housekeeping_task:read", "housekeeping_task:update", "housekeeping_task:assign", "housekeeping_task:delete",
      "notification:read", "notification:send",
      "audit:read",
    ],
  },
  {
    name: "Front Desk",
    roleType: "FRONT_DESK",
    description: "Handles check-in, check-out, and guest-facing operations",
    permissions: [
      "room:read",
      "booking:create", "booking:read", "booking:update", "booking:cancel",
      "payment:create", "payment:read",
      "inventory:read",
      "housekeeping_task:read",
      "notification:read",
    ],
  },
  {
    name: "Housekeeping",
    roleType: "HOUSEKEEPING",
    description: "Manages room cleaning and housekeeping tasks",
    permissions: [
      "room:read",
      "housekeeping_task:read", "housekeeping_task:update",
      "notification:read",
    ],
  },
  {
    name: "Accountant",
    roleType: "ACCOUNTANT",
    description: "Read-only access to financial and booking data for reporting",
    permissions: [
      "booking:read", "booking:export",
      "payment:read", "payment:export",
      "audit:read", "audit:export",
    ],
  },
];

// ─── Seed functions ────────────────────────────────────────────────────────────

async function seedPermissions(): Promise<Map<PermissionKey, string>> {
  console.warn("[seed] Seeding permissions...");
  const permissionIdMap = new Map<PermissionKey, string>();

  for (const perm of PERMISSIONS) {
    const record = await prisma.permission.upsert({
      where: { resource_action: { resource: perm.resource, action: perm.action } },
      update: { description: perm.description },
      create: {
        resource: perm.resource,
        action: perm.action,
        description: perm.description,
      },
    });
    permissionIdMap.set(`${perm.resource}:${perm.action}`, record.id);
  }

  console.warn(`[seed] ${PERMISSIONS.length} permissions seeded.`);
  return permissionIdMap;
}

async function seedSystemRoles(permissionIdMap: Map<PermissionKey, string>): Promise<void> {
  console.warn("[seed] Seeding system roles...");

  for (const roleDef of SYSTEM_ROLES) {
    const role = await prisma.role.upsert({
      where: {
        // system roles have no organization — uniqueness is name + null org
        // upsert uses a unique field; since (organizationId, name) isn't a @@unique,
        // we query first and upsert by id
        id: await resolveRoleId(roleDef.name),
      },
      update: { description: roleDef.description },
      create: {
        name: roleDef.name,
        description: roleDef.description,
        organizationId: null,
        isSystem: true,
      },
    });

    // Sync role permissions
    const permissionIds = roleDef.permissions
      .map((key) => permissionIdMap.get(key))
      .filter((id): id is string => id !== undefined);

    for (const permissionId of permissionIds) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId } },
        update: {},
        create: { roleId: role.id, permissionId },
      });
    }

    console.warn(`[seed] Role "${roleDef.name}" seeded with ${permissionIds.length} permissions.`);
  }
}

async function resolveRoleId(name: string): Promise<string> {
  const existing = await prisma.role.findFirst({
    where: { name, organizationId: null, isSystem: true },
    select: { id: true },
  });
  return existing?.id ?? "00000000-0000-0000-0000-000000000000";
}

async function main(): Promise<void> {
  console.warn("[seed] Starting database seed...");

  const permissionIdMap = await seedPermissions();
  await seedSystemRoles(permissionIdMap);

  console.warn("[seed] Database seed complete.");
}

main()
  .catch((error: unknown) => {
    console.error("[seed] Seeding failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
