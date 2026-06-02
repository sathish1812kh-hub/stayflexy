import { PrismaComplianceRequestRepository } from "./repositories/PrismaComplianceRequestRepository";
import { ComplianceService } from "./services/ComplianceService";

const complianceRepo = new PrismaComplianceRequestRepository();
export const complianceService = new ComplianceService(complianceRepo);
