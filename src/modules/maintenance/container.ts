// FILE: src/modules/maintenance/container.ts
import { PrismaMaintenanceTicketRepository } from "./repositories/PrismaMaintenanceTicketRepository";
import { MaintenanceService } from "./services/MaintenanceService";

const ticketRepo = new PrismaMaintenanceTicketRepository();
export const maintenanceService = new MaintenanceService(ticketRepo);
