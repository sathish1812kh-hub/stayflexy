// FILE: src/modules/audit/index.ts

// Types
export type {
  AuditLog,
  AuditAction,
  AuditResource,
  CreateAuditLogData,
  AuditFilter,
} from "./types";

// Constants
export {
  AUDIT_ACTIONS,
  AUDIT_RESOURCES,
  AUDIT_RETENTION_DAYS,
  MAX_AUDIT_QUERY_RANGE_DAYS,
  SENSITIVE_FIELDS_TO_REDACT,
  AUDIT_ERRORS,
} from "./constants";

// DTOs
export { AuditFilterDto } from "./dto";
export type { AuditFilterDtoType } from "./dto";

// Validators
export { validateAuditFilter, redactSensitiveFields } from "./validators";

// Repository
export { AuditLogRepository } from "./repositories";

// Service
export { AuditService } from "./services";

// Controller
export { AuditController } from "./controllers";

// Routes
export { createAuditRoutes } from "./routes";
