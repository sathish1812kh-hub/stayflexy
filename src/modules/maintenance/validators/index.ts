// FILE: src/modules/maintenance/validators/index.ts
import { ZodError } from "zod";
import { ValidationError } from "@errors/HttpError";
import {
  CreateMaintenanceTicketDto,
  UpdateMaintenanceTicketDto,
  AssignTicketDto,
  UpdateTicketStatusDto,
  ResolveTicketDto,
  MaintenanceTicketFilterDto,
  type CreateMaintenanceTicketDtoType,
  type UpdateMaintenanceTicketDtoType,
  type AssignTicketDtoType,
  type UpdateTicketStatusDtoType,
  type ResolveTicketDtoType,
  type MaintenanceTicketFilterDtoType,
} from "../dto";

// ─── wrapZod helper ───────────────────────────────────────────────────────────

function wrapZod<T>(schema: { parse: (data: unknown) => T }, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof ZodError) {
      const details = error.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));
      throw new ValidationError("Validation failed", details);
    }
    throw error;
  }
}

// ─── Validators ───────────────────────────────────────────────────────────────

export function validateCreateMaintenanceTicket(
  data: unknown
): CreateMaintenanceTicketDtoType {
  return wrapZod(CreateMaintenanceTicketDto, data);
}

export function validateUpdateMaintenanceTicket(
  data: unknown
): UpdateMaintenanceTicketDtoType {
  return wrapZod(UpdateMaintenanceTicketDto, data);
}

export function validateAssignTicket(data: unknown): AssignTicketDtoType {
  return wrapZod(AssignTicketDto, data);
}

export function validateUpdateTicketStatus(
  data: unknown
): UpdateTicketStatusDtoType {
  return wrapZod(UpdateTicketStatusDto, data);
}

export function validateResolveTicket(data: unknown): ResolveTicketDtoType {
  return wrapZod(ResolveTicketDto, data);
}

export function validateMaintenanceTicketFilter(
  data: unknown
): MaintenanceTicketFilterDtoType {
  return wrapZod(MaintenanceTicketFilterDto, data);
}
