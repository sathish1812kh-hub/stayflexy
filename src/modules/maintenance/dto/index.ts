// FILE: src/modules/maintenance/dto/index.ts
import { z } from "zod";

// ─── Shared enum schemas ──────────────────────────────────────────────────────

const MaintenanceSeverityEnum = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);

const MaintenanceTicketStatusEnum = z.enum([
  "OPEN",
  "ASSIGNED",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
]);

// Only the statuses that can be transitioned *to* via the status-update endpoint
const UpdatableTicketStatusEnum = z.enum([
  "ASSIGNED",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
]);

// ─── CreateMaintenanceTicketDto ───────────────────────────────────────────────

export const CreateMaintenanceTicketDto = z.object({
  hotelId: z.string().uuid("hotelId must be a valid UUID"),
  roomId: z.string().uuid("roomId must be a valid UUID"),
  issueType: z
    .string()
    .min(3, "issueType must be at least 3 characters")
    .max(100, "issueType must be at most 100 characters"),
  severity: MaintenanceSeverityEnum,
});

// ─── UpdateMaintenanceTicketDto ───────────────────────────────────────────────

export const UpdateMaintenanceTicketDto = z
  .object({
    assignedTo: z.string().uuid("assignedTo must be a valid UUID").optional(),
    severity: MaintenanceSeverityEnum.optional(),
    notes: z
      .string()
      .max(2000, "notes must be at most 2000 characters")
      .optional(),
  })
  .strict();

// ─── AssignTicketDto ──────────────────────────────────────────────────────────

export const AssignTicketDto = z.object({
  assignedTo: z.string().uuid("assignedTo must be a valid UUID"),
});

// ─── UpdateTicketStatusDto ────────────────────────────────────────────────────

export const UpdateTicketStatusDto = z.object({
  ticketStatus: UpdatableTicketStatusEnum,
  resolutionNotes: z
    .string()
    .max(2000, "resolutionNotes must be at most 2000 characters")
    .optional(),
});

// ─── ResolveTicketDto ─────────────────────────────────────────────────────────

export const ResolveTicketDto = z.object({
  resolutionNotes: z
    .string()
    .min(10, "resolutionNotes must be at least 10 characters")
    .max(2000, "resolutionNotes must be at most 2000 characters"),
});

// ─── MaintenanceTicketFilterDto ───────────────────────────────────────────────

export const MaintenanceTicketFilterDto = z.object({
  hotelId: z.string().uuid("hotelId must be a valid UUID"),
  roomId: z.string().uuid("roomId must be a valid UUID").optional(),
  severity: MaintenanceSeverityEnum.optional(),
  ticketStatus: MaintenanceTicketStatusEnum.optional(),
  assignedTo: z.string().uuid("assignedTo must be a valid UUID").optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ─── Inferred types ───────────────────────────────────────────────────────────

export type CreateMaintenanceTicketDtoType = z.infer<
  typeof CreateMaintenanceTicketDto
>;
export type UpdateMaintenanceTicketDtoType = z.infer<
  typeof UpdateMaintenanceTicketDto
>;
export type AssignTicketDtoType = z.infer<typeof AssignTicketDto>;
export type UpdateTicketStatusDtoType = z.infer<typeof UpdateTicketStatusDto>;
export type ResolveTicketDtoType = z.infer<typeof ResolveTicketDto>;
export type MaintenanceTicketFilterDtoType = z.infer<
  typeof MaintenanceTicketFilterDto
>;
