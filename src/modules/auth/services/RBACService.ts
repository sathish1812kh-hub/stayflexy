import { BaseService } from "@lib/baseService";
import { prisma } from "@lib/prisma";
import {
  NotFoundError,
  ConflictError,
  ForbiddenError,
} from "@errors/HttpError";
import type { CreateRoleDtoType, AssignRoleDtoType, CreatePermissionDtoType } from "../dto";

export interface RBACScope {
  organizationId?: string | null;
  hotelId?: string | null;
}

export interface RoleSummary {
  id: string;
  name: string;
  description: string | null;
  organizationId: string | null;
  isSystem: boolean;
}

export interface PermissionSummary {
  id: string;
  resource: string;
  action: string;
  key: string; // resource:action
}

export interface UserPermissionsResult {
  roles: RoleSummary[];
  permissions: PermissionSummary[];
  permissionKeys: string[];
}

export class RBACService extends BaseService {
  protected readonly moduleName = "RBACService";

  // ─── Role management ─────────────────────────────────────────────────────────

  async createRole(dto: CreateRoleDtoType): Promise<RoleSummary> {
    return this.execute("createRole", async () => {
      const existing = await prisma.role.findFirst({
        where: {
          name: dto.name,
          organizationId: dto.organizationId ?? null,
        },
      });
      if (existing) {
        throw new ConflictError(`Role "${dto.name}" already exists in this scope`);
      }

      const role = await prisma.role.create({
        data: {
          name: dto.name,
          description: dto.description ?? null,
          organizationId: dto.organizationId ?? null,
          isSystem: false,
        },
      });

      return this.toRoleSummary(role);
    });
  }

  async findRoleById(id: string): Promise<RoleSummary> {
    return this.execute("findRoleById", async () => {
      const role = await prisma.role.findUnique({ where: { id } });
      if (!role) throw new NotFoundError("Role not found");
      return this.toRoleSummary(role);
    });
  }

  async listRoles(organizationId?: string): Promise<RoleSummary[]> {
    return this.execute("listRoles", async () => {
      const roles = await prisma.role.findMany({
        where: {
          OR: [
            { isSystem: true, organizationId: null },
            ...(organizationId ? [{ organizationId }] : []),
          ],
        },
        orderBy: { name: "asc" },
      });
      return roles.map((r) => this.toRoleSummary(r));
    });
  }

  // ─── Permission management ────────────────────────────────────────────────────

  async createPermission(dto: CreatePermissionDtoType): Promise<PermissionSummary> {
    return this.execute("createPermission", async () => {
      const existing = await prisma.permission.findUnique({
        where: { resource_action: { resource: dto.resource, action: dto.action } },
      });
      if (existing) {
        throw new ConflictError(`Permission "${dto.resource}:${dto.action}" already exists`);
      }

      const perm = await prisma.permission.create({
        data: {
          resource: dto.resource,
          action: dto.action,
          description: dto.description ?? null,
        },
      });

      return this.toPermissionSummary(perm);
    });
  }

  async listPermissions(resource?: string): Promise<PermissionSummary[]> {
    return this.execute("listPermissions", async () => {
      const perms = await prisma.permission.findMany({
        where: resource ? { resource } : undefined,
        orderBy: [{ resource: "asc" }, { action: "asc" }],
      });
      return perms.map((p) => this.toPermissionSummary(p));
    });
  }

  async assignPermissionToRole(roleId: string, permissionId: string): Promise<void> {
    return this.execute("assignPermissionToRole", async () => {
      const [role, perm] = await Promise.all([
        prisma.role.findUnique({ where: { id: roleId }, select: { id: true, isSystem: true } }),
        prisma.permission.findUnique({ where: { id: permissionId }, select: { id: true } }),
      ]);

      if (!role) throw new NotFoundError("Role not found");
      if (!perm) throw new NotFoundError("Permission not found");
      if (role.isSystem) throw new ForbiddenError("System roles cannot be modified");

      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId, permissionId } },
        update: {},
        create: { roleId, permissionId },
      });
    });
  }

  // ─── Role assignment ──────────────────────────────────────────────────────────

  async assignRole(dto: AssignRoleDtoType, assignedById: string): Promise<void> {
    return this.execute("assignRole", async () => {
      const [user, role] = await Promise.all([
        prisma.user.findFirst({
          where: { id: dto.userId, deletedAt: null },
          select: { id: true },
        }),
        prisma.role.findUnique({ where: { id: dto.roleId }, select: { id: true } }),
      ]);

      if (!user) throw new NotFoundError("User not found");
      if (!role) throw new NotFoundError("Role not found");

      // Check for duplicate (application-layer uniqueness — see DB_ARCHITECTURE.md)
      const existing = await prisma.userRole.findFirst({
        where: {
          userId: dto.userId,
          roleId: dto.roleId,
          organizationId: dto.organizationId ?? null,
          hotelId: dto.hotelId ?? null,
        },
      });
      if (existing) {
        throw new ConflictError("Role is already assigned to this user in this scope");
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
      });
    });
  }

  async revokeRole(userRoleId: string): Promise<void> {
    return this.execute("revokeRole", async () => {
      const record = await prisma.userRole.findUnique({ where: { id: userRoleId } });
      if (!record) throw new NotFoundError("Role assignment not found");
      await prisma.userRole.delete({ where: { id: userRoleId } });
    });
  }

  // ─── Permission checks ────────────────────────────────────────────────────────

  async checkPermission(
    userId: string,
    resource: string,
    action: string,
    scope: RBACScope = {}
  ): Promise<boolean> {
    return this.execute("checkPermission", async () => {
      const keys = await this.getUserPermissionKeys(userId, scope);
      return keys.includes(`${resource}:${action}`);
    });
  }

  async enforcePermission(
    userId: string,
    resource: string,
    action: string,
    scope: RBACScope = {}
  ): Promise<void> {
    const allowed = await this.checkPermission(userId, resource, action, scope);
    if (!allowed) {
      throw new ForbiddenError(
        `You do not have permission to perform "${action}" on "${resource}"`
      );
    }
  }

  async getUserPermissions(
    userId: string,
    scope: RBACScope = {}
  ): Promise<UserPermissionsResult> {
    return this.execute("getUserPermissions", async () => {
      const userRoles = await this.fetchUserRoles(userId, scope);

      const roles = userRoles.map((ur) => this.toRoleSummary(ur.role));
      const permissionSet = new Map<string, PermissionSummary>();

      for (const ur of userRoles) {
        for (const rp of ur.role.rolePermissions) {
          const key = `${rp.permission.resource}:${rp.permission.action}`;
          permissionSet.set(key, this.toPermissionSummary(rp.permission));
        }
      }

      const permissions = Array.from(permissionSet.values());
      const permissionKeys = permissions.map((p) => p.key);

      return { roles, permissions, permissionKeys };
    });
  }

  async getUserPermissionKeys(userId: string, scope: RBACScope = {}): Promise<string[]> {
    const result = await this.getUserPermissions(userId, scope);
    return result.permissionKeys;
  }

  // ─── Private helpers ──────────────────────────────────────────────────────────

  private async fetchUserRoles(userId: string, scope: RBACScope) {
    const now = new Date();
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
            OR: [
              { hotelId: null },
              ...(scope.hotelId ? [{ hotelId: scope.hotelId }] : []),
            ],
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
    });
  }

  private toRoleSummary(
    r: { id: string; name: string; description: string | null; organizationId: string | null; isSystem: boolean }
  ): RoleSummary {
    return { id: r.id, name: r.name, description: r.description, organizationId: r.organizationId, isSystem: r.isSystem };
  }

  private toPermissionSummary(
    p: { id: string; resource: string; action: string }
  ): PermissionSummary {
    return { id: p.id, resource: p.resource, action: p.action, key: `${p.resource}:${p.action}` };
  }
}
