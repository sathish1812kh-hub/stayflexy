export type ComplianceRequestTypeType = "DATA_EXPORT" | "DATA_DELETION" | "DATA_ANONYMIZATION" | "AUDIT_REPORT" | "CONSENT_WITHDRAWAL";
export type ComplianceRequestStatusType = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";

export interface ComplianceRequest {
  id: string;
  organizationId: string;
  requestType: ComplianceRequestTypeType;
  requestStatus: ComplianceRequestStatusType;
  requestedBy: string;
  subjectUserId: string;
  notes: string | null;
  resultPayload: Record<string, unknown> | null;
  processedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateComplianceRequestData {
  organizationId: string;
  requestType: ComplianceRequestTypeType;
  requestedBy: string;
  subjectUserId: string;
  notes?: string;
}

export interface ComplianceFilter {
  organizationId?: string;
  requestType?: ComplianceRequestTypeType;
  requestStatus?: ComplianceRequestStatusType;
  requestedBy?: string;
  page?: number;
  limit?: number;
}
