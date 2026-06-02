import { PrismaOperationalTaskRepository } from "./repositories/PrismaOperationalTaskRepository";
import { OperationsService } from "./services/OperationsService";

const taskRepo = new PrismaOperationalTaskRepository();
export const operationsService = new OperationsService(taskRepo);
