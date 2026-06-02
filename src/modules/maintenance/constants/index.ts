// FILE: src/modules/maintenance/constants/index.ts

export const MAINTENANCE_ERRORS = {
  TICKET_NOT_FOUND: "Maintenance ticket not found",
  ROOM_NOT_FOUND: "Room not found",
  HOTEL_NOT_FOUND: "Hotel not found or access denied",
  TICKET_ALREADY_CLOSED: "Ticket is already closed",
  TICKET_ALREADY_RESOLVED: "Ticket is already resolved",
  INVALID_TRANSITION: "Invalid ticket status transition",
  RESOLUTION_REQUIRED: "Resolution notes required when resolving a ticket",
} as const;

export const VALID_TICKET_TRANSITIONS: Record<string, string[]> = {
  OPEN: ["ASSIGNED", "IN_PROGRESS", "RESOLVED"],
  ASSIGNED: ["IN_PROGRESS", "OPEN"],
  IN_PROGRESS: ["RESOLVED"],
  RESOLVED: ["CLOSED", "IN_PROGRESS"], // can reopen
  CLOSED: [],
};
