import { type PrismaClient, type Prisma } from "@prisma/client";
import { UserRepository, type CreateUserInput, type UpdateUserInput } from "./index";
import type { User } from "../types";
import type { Nullable, PaginatedResult, PaginationParams } from "@shared-types";

type PrismaUser = Prisma.UserGetPayload<Record<string, never>>;

function toUser(r: PrismaUser): User {
  return {
    id: r.id,
    email: r.email,
    passwordHash: r.passwordHash,
    firstName: r.firstName,
    lastName: r.lastName,
    role: r.primaryRole as User["role"],
    status: r.status as User["status"],
    organizationId: r.organizationId,
    lastLoginAt: r.lastLoginAt,
    emailVerifiedAt: r.emailVerifiedAt,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    deletedAt: r.deletedAt,
  };
}

export class PrismaUserRepository extends UserRepository {
  async findById(id: string): Promise<Nullable<User>> {
    const r = await this.db.user.findFirst({ where: { id, deletedAt: null } });
    return r ? toUser(r) : null;
  }

  async findByEmail(email: string): Promise<Nullable<User>> {
    const r = await this.db.user.findFirst({
      where: { email: email.toLowerCase(), deletedAt: null },
    });
    return r ? toUser(r) : null;
  }

  async findByOrganization(
    organizationId: string,
    params: PaginationParams
  ): Promise<PaginatedResult<User>> {
    const skip = this.buildSkip(params);
    const where = { organizationId, deletedAt: null };
    const [records, total] = await Promise.all([
      this.db.user.findMany({ where, skip, take: params.limit, orderBy: { createdAt: "desc" } }),
      this.db.user.count({ where }),
    ]);
    return { data: records.map(toUser), meta: this.buildPaginationMeta(total, params) };
  }

  async findMany(params: PaginationParams): Promise<PaginatedResult<User>> {
    const skip = this.buildSkip(params);
    const where = { deletedAt: null };
    const [records, total] = await Promise.all([
      this.db.user.findMany({ where, skip, take: params.limit, orderBy: { createdAt: "desc" } }),
      this.db.user.count({ where }),
    ]);
    return { data: records.map(toUser), meta: this.buildPaginationMeta(total, params) };
  }

  async create(data: CreateUserInput): Promise<User> {
    const r = await this.db.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash: data.passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        primaryRole: data.role as PrismaUser["primaryRole"],
        organizationId: data.organizationId,
        status: "PENDING_VERIFICATION",
      },
    });
    return toUser(r);
  }

  async update(id: string, data: UpdateUserInput): Promise<User> {
    const payload: Prisma.UserUpdateInput = {};
    if (data.firstName !== undefined) payload.firstName = data.firstName;
    if (data.lastName !== undefined) payload.lastName = data.lastName;
    if (data.role !== undefined) payload.primaryRole = data.role as PrismaUser["primaryRole"];
    if (data.status !== undefined) payload.status = data.status as PrismaUser["status"];
    if (data.lastLoginAt !== undefined) payload.lastLoginAt = data.lastLoginAt;
    if (data.emailVerifiedAt !== undefined) payload.emailVerifiedAt = data.emailVerifiedAt;

    const r = await this.db.user.update({ where: { id }, data: payload });
    return toUser(r);
  }

  async updateStatus(id: string, status: User["status"]): Promise<User> {
    const r = await this.db.user.update({
      where: { id },
      data: { status: status as PrismaUser["status"] },
    });
    return toUser(r);
  }

  async hardDelete(id: string): Promise<void> {
    await this.db.user.delete({ where: { id } });
  }

  // Soft delete — sets deletedAt, preserves audit trail
  async softDeleteUser(id: string): Promise<void> {
    await this.db.user.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  // Used by registration to check uniqueness across deleted accounts too
  async emailExistsIncludingDeleted(email: string): Promise<boolean> {
    const count = await this.db.user.count({ where: { email: email.toLowerCase() } });
    return count > 0;
  }

  // Transactional version — receives a tx client
  static async createWithTx(
    tx: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">,
    data: CreateUserInput & { status?: User["status"] }
  ): Promise<User> {
    const r = await tx.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash: data.passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        primaryRole: data.role as PrismaUser["primaryRole"],
        organizationId: data.organizationId,
        status: (data.status as PrismaUser["status"]) ?? "PENDING_VERIFICATION",
      },
    });
    return toUser(r);
  }
}
