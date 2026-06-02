// FILE: src/modules/housekeeping/container.ts
import { PrismaHousekeepingTaskRepository } from "./repositories/PrismaHousekeepingTaskRepository";
import { HousekeepingService } from "./services/HousekeepingService";

const taskRepo = new PrismaHousekeepingTaskRepository();
export const housekeepingService = new HousekeepingService(taskRepo);
