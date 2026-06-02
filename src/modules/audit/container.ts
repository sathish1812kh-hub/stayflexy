import { PrismaCentralAuditLogRepository } from "./repositories/PrismaCentralAuditLogRepository";
import { AuditService } from "./services/AuditService";

const auditRepo = new PrismaCentralAuditLogRepository();
export const auditService = new AuditService(auditRepo);
