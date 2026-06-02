// FILE: src/modules/organization/container.ts
/**
 * Lightweight service container for the organization module.
 * Composes and exposes singleton instances backed by Prisma repositories.
 *
 * Audit dependency: AuditService requires a concrete AuditLogRepository
 * (PrismaAuditLogRepository). Until that concrete class is implemented the
 * container wires a no-op IAuditService so the rest of the module functions
 * without an audit back-end. Replace `noopAuditService` with the real
 * AuditService instance once available.
 */

import { PrismaOrgRepository } from "./repositories/PrismaOrgRepository";
import { PrismaOrgMemberRepository } from "./repositories/PrismaOrgMemberRepository";
import { OrganizationService } from "./services/OrganizationService";
import type { IAuditService, AuditContext, AuditLogEntry } from "@common/contracts/IAuditService";
import type { PaginatedResult, PaginationParams } from "@shared-types";
import { logger } from "@utils/logger";

const log = logger.child("OrgContainer");

/** No-op audit service used until a concrete AuditLogRepository is wired. */
const noopAuditService: IAuditService = {
  record(
    action: string,
    resource: string,
    resourceId: string,
    _context: AuditContext,
    _before: unknown,
    _after: unknown
  ): Promise<void> {
    log.debug(`[audit-noop] ${action} on ${resource}:${resourceId}`);
    return Promise.resolve();
  },

  findByResource(
    _resource: string,
    _resourceId: string,
    params: PaginationParams
  ): Promise<PaginatedResult<AuditLogEntry>> {
    return Promise.resolve({
      data: [],
      meta: {
        page: params.page,
        limit: params.limit,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    });
  },

  findByUser(
    _userId: string,
    params: PaginationParams
  ): Promise<PaginatedResult<AuditLogEntry>> {
    return Promise.resolve({
      data: [],
      meta: {
        page: params.page,
        limit: params.limit,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    });
  },
};

export const orgRepo = new PrismaOrgRepository();
export const orgMemberRepo = new PrismaOrgMemberRepository();

export const organizationService = new OrganizationService(
  orgRepo,
  orgMemberRepo,
  noopAuditService
);
