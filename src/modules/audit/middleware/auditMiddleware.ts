// Audit middleware helper — called from route handlers to record entity changes.
import { type NextRequest } from "next/server";
import { prisma } from "@lib/prisma";
import type { Prisma, AuditActionType } from "@prisma/client";
import { AuditMasker } from "../utils/AuditMasker";

export interface AuditContext {
  organizationId: string;
  hotelId?: string;
  entityType: string;
  entityId: string;
  actionType: string;
  performedBy: string;
  previousState?: Record<string, unknown>;
  currentState?: Record<string, unknown>;
  req?: NextRequest;
}

export async function recordAudit(ctx: AuditContext): Promise<void> {
  const ipAddress = ctx.req
    ? AuditMasker.extractRequestMeta(ctx.req.headers).ipAddress
    : null;
  const userAgent = ctx.req
    ? AuditMasker.extractRequestMeta(ctx.req.headers).userAgent
    : null;

  await prisma.centralAuditLog.create({
    data: {
      organizationId: ctx.organizationId,
      hotelId: ctx.hotelId ?? null,
      entityType: ctx.entityType,
      entityId: ctx.entityId,
      actionType: ctx.actionType as AuditActionType,
      performedBy: ctx.performedBy,
      previousState: ctx.previousState
        ? (AuditMasker.maskState(ctx.previousState) as Prisma.InputJsonValue)
        : undefined,
      currentState: ctx.currentState
        ? (AuditMasker.maskState(ctx.currentState) as Prisma.InputJsonValue)
        : undefined,
      ipAddress,
      userAgent,
    },
  });
}
