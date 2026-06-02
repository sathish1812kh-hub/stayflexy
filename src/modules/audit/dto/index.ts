// FILE: src/modules/audit/dto/index.ts
import { z } from "zod";
import { AUDIT_ACTIONS, AUDIT_RESOURCES } from "../constants";
import type { AuditAction, AuditResource } from "../types";

export const AuditFilterDto = z.object({
  userId: z.string().uuid("Invalid user ID").optional(),
  organizationId: z.string().uuid("Invalid organization ID").optional(),
  resource: z
    .enum(AUDIT_RESOURCES as [AuditResource, ...AuditResource[]])
    .optional(),
  action: z
    .enum(AUDIT_ACTIONS as [AuditAction, ...AuditAction[]])
    .optional(),
  resourceId: z.string().min(1).optional(),
  success: z
    .string()
    .transform((v) => v === "true")
    .optional(),
  dateFrom: z
    .string()
    .refine((v) => !isNaN(new Date(v).getTime()), { message: "Invalid date" })
    .optional(),
  dateTo: z
    .string()
    .refine((v) => !isNaN(new Date(v).getTime()), { message: "Invalid date" })
    .optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type AuditFilterDtoType = z.infer<typeof AuditFilterDto>;
