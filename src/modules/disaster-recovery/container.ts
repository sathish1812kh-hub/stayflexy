import { PrismaRecoveryExecutionRepository } from "./repositories/PrismaRecoveryExecutionRepository";
import { DisasterRecoveryService } from "./services/DisasterRecoveryService";

const recoveryRepo = new PrismaRecoveryExecutionRepository();
export const disasterRecoveryService = new DisasterRecoveryService(recoveryRepo);
