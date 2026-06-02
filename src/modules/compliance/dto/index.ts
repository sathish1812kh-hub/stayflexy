import { z } from "zod";

const RequestTypeEnum = z.enum(["DATA_EXPORT", "DATA_DELETION", "DATA_ANONYMIZATION", "AUDIT_REPORT", "CONSENT_WITHDRAWAL"]);
const RequestStatusEnum = z.enum(["PENDING", "PROCESSING", "COMPLETED", "FAILED", "CANCELLED"]);

export const CreateComplianceRequestDto = z.object({
  requestType: RequestTypeEnum,
  subjectUserId: z.string().uuid(),
  notes: z.string().max(2000).optional(),
});
export type CreateComplianceRequestDtoType = z.infer<typeof CreateComplianceRequestDto>;

export const ComplianceFilterDto = z.object({
  requestType: RequestTypeEnum.optional(),
  requestStatus: RequestStatusEnum.optional(),
  requestedBy: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ComplianceFilterDtoType = z.infer<typeof ComplianceFilterDto>;
