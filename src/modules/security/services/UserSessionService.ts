import { BaseService } from "@lib/baseService";
import { NotFoundError, UnauthorizedError } from "@errors/HttpError";
import type { PrismaUserSessionRepository } from "../repositories/PrismaUserSessionRepository";
import type { PrismaSecurityEventRepository } from "../repositories/PrismaSecurityEventRepository";
import type { UserSession, CreateUserSessionData, SessionFilter } from "../types";
import { SECURITY_ERRORS, SESSION_DEFAULTS } from "../constants";
import type { SessionFilterDtoType } from "../dto";
import type { PaginatedResult } from "@shared-types";

export class UserSessionService extends BaseService {
  protected readonly moduleName = "UserSessionService";

  constructor(
    private readonly sessionRepo: PrismaUserSessionRepository,
    private readonly eventRepo: PrismaSecurityEventRepository
  ) {
    super();
  }

  async createSession(data: CreateUserSessionData): Promise<UserSession> {
    return this.execute("createSession", async () => {
      const active = await this.sessionRepo.findActiveByUser(data.userId);

      if (active.length >= SESSION_DEFAULTS.MAX_CONCURRENT_SESSIONS) {
        const oldest = active[active.length - 1];
        if (oldest) await this.sessionRepo.updateStatus(oldest.id, "REVOKED");
      }

      return this.sessionRepo.create(data);
    });
  }

  async validateSession(sessionId: string): Promise<UserSession> {
    return this.execute("validateSession", async () => {
      const session = await this.sessionRepo.findById(sessionId);
      if (!session) throw new NotFoundError(SECURITY_ERRORS.SESSION_NOT_FOUND);
      if (session.sessionStatus === "REVOKED") throw new UnauthorizedError(SECURITY_ERRORS.SESSION_REVOKED);
      if (session.sessionStatus === "EXPIRED" || session.expiresAt < new Date()) {
        await this.sessionRepo.updateStatus(sessionId, "EXPIRED");
        throw new UnauthorizedError(SECURITY_ERRORS.SESSION_EXPIRED);
      }
      await this.sessionRepo.update(sessionId, { lastActivityAt: new Date() });
      return session;
    });
  }

  async revokeSession(id: string, userId?: string): Promise<void> {
    return this.execute("revokeSession", async () => {
      const session = await this.sessionRepo.findById(id);
      if (!session) throw new NotFoundError(SECURITY_ERRORS.SESSION_NOT_FOUND);
      if (userId && session.userId !== userId) throw new UnauthorizedError("Cannot revoke another user's session");
      await this.sessionRepo.updateStatus(id, "REVOKED");
      await this.eventRepo.create({
        userId: session.userId,
        organizationId: session.organizationId ?? undefined,
        eventType: "TOKEN_REVOKED",
        severity: "LOW",
        metadata: { sessionId: id },
      });
    });
  }

  async revokeAllUserSessions(userId: string): Promise<number> {
    return this.execute("revokeAllUserSessions", async () => this.sessionRepo.revokeAllForUser(userId));
  }

  async listSessions(filter: SessionFilterDtoType): Promise<PaginatedResult<UserSession>> {
    return this.execute("listSessions", async () => {
      const sessionFilter: SessionFilter = {
        userId: filter.userId,
        organizationId: filter.organizationId,
        sessionStatus: filter.sessionStatus,
        page: filter.page,
        limit: filter.limit,
      };
      return this.sessionRepo.findManyFiltered(sessionFilter);
    });
  }

  async expireStale(): Promise<number> {
    return this.execute("expireStale", async () => this.sessionRepo.expireStale());
  }
}
