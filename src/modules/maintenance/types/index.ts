// FILE: src/modules/maintenance/types/index.ts

// ─── Enum type aliases ────────────────────────────────────────────────────────

export type MaintenanceSeverityType = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type MaintenanceTicketStatusType =
  | "OPEN"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "CLOSED";

// ─── Domain model ─────────────────────────────────────────────────────────────

export interface MaintenanceTicket {
  id: string;
  organizationId: string;
  hotelId: string;
  roomId: string;
  issueType: string;
  severity: MaintenanceSeverityType;
  ticketStatus: MaintenanceTicketStatusType;
  reportedBy: string;
  assignedTo: string | null;
  reportedAt: Date;
  resolvedAt: Date | null;
  resolutionNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Input / filter types ─────────────────────────────────────────────────────

export interface CreateMaintenanceTicketData {
  organizationId: string;
  hotelId: string;
  roomId: string;
  issueType: string;
  severity: MaintenanceSeverityType;
  reportedBy: string;
}

export interface UpdateMaintenanceTicketData {
  assignedTo?: string;
  ticketStatus?: MaintenanceTicketStatusType;
  resolvedAt?: Date;
  resolutionNotes?: string;
  severity?: MaintenanceSeverityType;
}

export interface MaintenanceTicketFilter {
  organizationId?: string;
  hotelId?: string;
  roomId?: string;
  severity?: MaintenanceSeverityType;
  ticketStatus?: MaintenanceTicketStatusType;
  assignedTo?: string;
  page?: number;
  limit?: number;
}

// ─── Summary projection ───────────────────────────────────────────────────────

export interface MaintenanceTicketSummary {
  id: string;
  roomId: string;
  issueType: string;
  severity: MaintenanceSeverityType;
  ticketStatus: MaintenanceTicketStatusType;
  reportedAt: Date;
  assignedTo?: string;
}
