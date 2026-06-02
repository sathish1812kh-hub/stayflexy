// FILE: src/modules/maintenance/index.ts

// ─── Public API ───────────────────────────────────────────────────────────────

export { maintenanceService } from "./container";
export { MaintenanceService } from "./services/MaintenanceService";
export { PrismaMaintenanceTicketRepository } from "./repositories/PrismaMaintenanceTicketRepository";
export * from "./types";
export * from "./constants";
export * from "./dto";
export * from "./validators";
