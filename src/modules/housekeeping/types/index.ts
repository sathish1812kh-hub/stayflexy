// FILE: src/modules/housekeeping/types/index.ts
import type { Nullable, TimestampFields } from "@shared-types";

// ─── Enum string-union aliases ────────────────────────────────────────────────

export type HousekeepingTaskTypeType =
  | "STANDARD_CLEANING"
  | "DEEP_CLEANING"
  | "TURNDOWN"
  | "INSPECTION"
  | "LINEN_CHANGE"
  | "BATHROOM_CLEANING"
  | "CHECKOUT_CLEANING";

export type HousekeepingPriorityType = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export type HousekeepingTaskStatusType =
  | "PENDING"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "VERIFIED";

// ─── Domain model ─────────────────────────────────────────────────────────────

export interface HousekeepingTask extends TimestampFields {
  id: string;
  organizationId: string;
  hotelId: string;
  roomId: string;
  assignedTo: Nullable<string>;
  taskType: HousekeepingTaskTypeType;
  priority: HousekeepingPriorityType;
  taskStatus: HousekeepingTaskStatusType;
  scheduledAt: Nullable<Date>;
  startedAt: Nullable<Date>;
  completedAt: Nullable<Date>;
  notes: Nullable<string>;
  createdById: string;
}

// ─── Input / mutation types ───────────────────────────────────────────────────

export interface CreateHousekeepingTaskData {
  organizationId: string;
  hotelId: string;
  roomId: string;
  createdById: string;
  taskType: HousekeepingTaskTypeType;
  priority?: HousekeepingPriorityType;
  scheduledAt?: Nullable<Date>;
  notes?: Nullable<string>;
  assignedTo?: Nullable<string>;
}

export interface UpdateHousekeepingTaskData {
  assignedTo?: Nullable<string>;
  priority?: HousekeepingPriorityType;
  taskStatus?: HousekeepingTaskStatusType;
  scheduledAt?: Nullable<Date>;
  startedAt?: Nullable<Date>;
  completedAt?: Nullable<Date>;
  notes?: Nullable<string>;
}

// ─── Filter / query types ─────────────────────────────────────────────────────

export interface HousekeepingTaskFilter {
  organizationId?: string;
  hotelId?: string;
  roomId?: string;
  assignedTo?: string;
  taskType?: HousekeepingTaskTypeType;
  priority?: HousekeepingPriorityType;
  taskStatus?: HousekeepingTaskStatusType;
  scheduledAt?: string;
  page?: number;
  limit?: number;
}

// ─── Room status view ─────────────────────────────────────────────────────────

export interface HousekeepingRoomStatus {
  roomId: string;
  roomNumber: string;
  floor: number;
  housekeepingStatus: string;
  operationalStatus: string;
  currentTask: Nullable<HousekeepingTask>;
}
