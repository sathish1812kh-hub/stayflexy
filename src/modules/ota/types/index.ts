import type { Nullable } from "@shared-types";

export type OTAProviderStatusType = "ACTIVE" | "INACTIVE" | "MAINTENANCE";
export type SyncStatusType = "PENDING" | "RUNNING" | "SUCCESS" | "FAILED" | "CANCELLED" | "RETRYING";
export type ReservationImportStatusType = "PENDING" | "IMPORTED" | "FAILED" | "DUPLICATE" | "REJECTED";

export interface OTAProvider {
  id: string;
  providerName: string;
  providerCode: string;
  status: OTAProviderStatusType;
  description: Nullable<string>;
  webhookUrl: Nullable<string>;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OTAMapping {
  id: string;
  organizationId: string;
  hotelId: string;
  roomTypeId: Nullable<string>;
  providerId: string;
  externalHotelId: string;
  externalRoomTypeId: Nullable<string>;
  syncStatus: SyncStatusType;
  isActive: boolean;
  lastSyncedAt: Nullable<Date>;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OTAReservation {
  id: string;
  organizationId: string;
  hotelId: string;
  providerId: string;
  externalReservationId: string;
  bookingId: Nullable<string>;
  syncStatus: ReservationImportStatusType;
  rawPayload: Record<string, unknown>;
  importedAt: Nullable<Date>;
  errorMessage: Nullable<string>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateOTAProviderData {
  providerName: string;
  providerCode: string;
  description?: string;
  webhookUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateOTAProviderData {
  providerName?: string;
  providerCode?: string;
  status?: OTAProviderStatusType;
  description?: string;
  webhookUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateOTAMappingData {
  organizationId: string;
  hotelId: string;
  roomTypeId?: string;
  providerId: string;
  externalHotelId: string;
  externalRoomTypeId?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateOTAMappingData {
  isActive?: boolean;
  metadata?: Record<string, unknown>;
  externalRoomTypeId?: string;
}

export interface CreateOTAReservationData {
  organizationId: string;
  hotelId: string;
  providerId: string;
  externalReservationId: string;
  rawPayload: Record<string, unknown>;
}

export interface UpdateOTAReservationData {
  syncStatus?: ReservationImportStatusType;
  bookingId?: string;
  importedAt?: Date;
  errorMessage?: string;
}

export interface OTAProviderFilter {
  status?: OTAProviderStatusType;
  page?: number;
  limit?: number;
}

export interface OTAMappingFilter {
  organizationId?: string;
  hotelId?: string;
  providerId?: string;
  roomTypeId?: string;
  isActive?: boolean;
  syncStatus?: SyncStatusType;
  page?: number;
  limit?: number;
}

export interface OTAReservationFilter {
  organizationId?: string;
  hotelId?: string;
  providerId?: string;
  syncStatus?: ReservationImportStatusType;
  page?: number;
  limit?: number;
}
