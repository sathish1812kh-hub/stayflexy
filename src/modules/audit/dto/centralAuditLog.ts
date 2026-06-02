import { z } from "zod";

const AUDIT_ACTION_TYPE_VALUES = [
  "CREATE",
  "READ",
  "UPDATE",
  "DELETE",
  "LOGIN",
  "LOGOUT",
  "EXPORT",
  "IMPORT",
  "APPROVE",
  "REJECT",
] as const;

export const AuditLogFilterDto = z
  .object({
    organizationId: z.string().uuid().optional(),
    hotelId: z.string().uuid().optional(),
    entityType: z.string().optional(),
    entityId: z.string().uuid().optional(),
    actionType: z.enum(AUDIT_ACTION_TYPE_VALUES).optional(),
    performedBy: z.string().uuid().optional(),
    startDate: z
      .string()
      .refine((v) => !isNaN(new Date(v).getTime()), { message: "Invalid ISO date" })
      .optional(),
    endDate: z
      .string()
      .refine((v) => !isNaN(new Date(v).getTime()), { message: "Invalid ISO date" })
      .optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(500).default(50),
  })
  .refine(
    (data) => {
      if (data.startDate !== undefined && data.endDate !== undefined) {
        return new Date(data.endDate) >= new Date(data.startDate);
      }
      return true;
    },
    { message: "End date must be after start date", path: ["endDate"] }
  );

export type AuditLogFilterDtoType = z.infer<typeof AuditLogFilterDto>;

export const EntityAuditFilterDto = z.object({
  entityType: z.string().min(1),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type EntityAuditFilterDtoType = z.infer<typeof EntityAuditFilterDto>;
