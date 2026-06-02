import { type Prisma } from "@prisma/client";
import { BaseRepository } from "@lib/baseRepository";
import type { PaginatedResult, PaginationParams } from "@shared-types";
import type { UserSession, CreateUserSessionData, SessionFilter, SessionStatusType } from "../types";

type PrismaSession = Prisma.UserSessionGetPayload<Record<string, never>>;

function toSession(r: PrismaSession): UserSession {
  return {
    id: r.id,
    userId: r.userId,
    organizationId: r.organizationId ?? null,
    deviceId: r.deviceId,
    ipAddress: r.ipAddress,
    userAgent: r.userAgent,
    refreshTokenHash: r.refreshTokenHash,
    sessionStatus: r.sessionStatus as SessionStatusType,
    lastActivityAt: r.lastActivityAt,
    expiresAt: r.expiresAt,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export class PrismaUserSessionRepository extends BaseRepository<
  UserSession,
  CreateUserSessionData,
  { sessionStatus?: SessionStatusType; lastActivityAt?: Date }
> {
  async findById(id: string): Promise<UserSession | null> {
    const r = await this.db.userSession.findFirst({ where: { id } });
    return r ? toSession(r) : null;
  }

  async findMany(params: PaginationParams): Promise<PaginatedResult<UserSession>> {
    const skip = this.buildSkip(params);
    const [records, total] = await Promise.all([
      this.db.userSession.findMany({ skip, take: params.limit, orderBy: { createdAt: "desc" } }),
      this.db.userSession.count(),
    ]);
    return { data: records.map(toSession), meta: this.buildPaginationMeta(total, params) };
  }

  async findManyFiltered(filter: SessionFilter): Promise<PaginatedResult<UserSession>> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const params: PaginationParams = { page, limit };
    const skip = this.buildSkip(params);

    const where: Prisma.UserSessionWhereInput = {
      ...(filter.userId && { userId: filter.userId }),
      ...(filter.organizationId && { organizationId: filter.organizationId }),
      ...(filter.sessionStatus && { sessionStatus: filter.sessionStatus as PrismaSession["sessionStatus"] }),
    };

    const [records, total] = await Promise.all([
      this.db.userSession.findMany({ where, skip, take: limit, orderBy: { lastActivityAt: "desc" } }),
      this.db.userSession.count({ where }),
    ]);
    return { data: records.map(toSession), meta: this.buildPaginationMeta(total, params) };
  }

  async findActiveByUser(userId: string): Promise<UserSession[]> {
    const records = await this.db.userSession.findMany({
      where: { userId, sessionStatus: "ACTIVE" },
      orderBy: { lastActivityAt: "desc" },
    });
    return records.map(toSession);
  }

  async findByRefreshTokenHash(hash: string): Promise<UserSession | null> {
    const r = await this.db.userSession.findFirst({ where: { refreshTokenHash: hash } });
    return r ? toSession(r) : null;
  }

  async create(data: CreateUserSessionData): Promise<UserSession> {
    const r = await this.db.userSession.create({
      data: {
        userId: data.userId,
        organizationId: data.organizationId ?? null,
        deviceId: data.deviceId,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        refreshTokenHash: data.refreshTokenHash,
        expiresAt: data.expiresAt,
      },
    });
    return toSession(r);
  }

  async update(id: string, data: { sessionStatus?: SessionStatusType; lastActivityAt?: Date }): Promise<UserSession> {
    const payload: Prisma.UserSessionUpdateInput = {};
    if (data.sessionStatus) payload.sessionStatus = data.sessionStatus as PrismaSession["sessionStatus"];
    if (data.lastActivityAt) payload.lastActivityAt = data.lastActivityAt;
    const r = await this.db.userSession.update({ where: { id }, data: payload });
    return toSession(r);
  }

  async updateStatus(id: string, status: SessionStatusType): Promise<UserSession> {
    const r = await this.db.userSession.update({
      where: { id },
      data: { sessionStatus: status as PrismaSession["sessionStatus"] },
    });
    return toSession(r);
  }

  async revokeAllForUser(userId: string): Promise<number> {
    const result = await this.db.userSession.updateMany({
      where: { userId, sessionStatus: "ACTIVE" },
      data: { sessionStatus: "REVOKED" },
    });
    return result.count;
  }

  async expireStale(): Promise<number> {
    const result = await this.db.userSession.updateMany({
      where: { sessionStatus: "ACTIVE", expiresAt: { lt: new Date() } },
      data: { sessionStatus: "EXPIRED" },
    });
    return result.count;
  }

  async hardDelete(id: string): Promise<void> {
    await this.db.userSession.delete({ where: { id } });
  }
}
