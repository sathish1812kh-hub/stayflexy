// Public API for the CentralAuditLog-based audit module.

// Types
export type {
  CentralAuditLog,
  CreateAuditLogData,
  AuditLogFilter,
  AuditLogSummary,
  AuditActionTypeType,
} from "./types/centralAuditLog";

// Constants
export {
  AUDIT_ERRORS,
  SENSITIVE_FIELDS,
  AUDITABLE_ENTITIES,
} from "./constants/centralAuditLog";

// DTOs
export {
  AuditLogFilterDto,
  EntityAuditFilterDto,
} from "./dto/centralAuditLog";
export type {
  AuditLogFilterDtoType,
  EntityAuditFilterDtoType,
} from "./dto/centralAuditLog";

// Validators
export {
  validateAuditLogFilter,
  validateEntityAuditFilter,
} from "./validators/centralAuditLog";

// Utils
export { AuditMasker } from "./utils/AuditMasker";

// Repository
export { PrismaCentralAuditLogRepository } from "./repositories/PrismaCentralAuditLogRepository";

// Middleware
export { recordAudit } from "./middleware/auditMiddleware";
export type { AuditContext } from "./middleware/auditMiddleware";

// Service
export { AuditService } from "./services/AuditService";

// Container (singleton)
export { auditService } from "./container";
