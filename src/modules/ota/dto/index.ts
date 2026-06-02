import { z } from "zod";

const OTAProviderStatusEnum = z.enum(["ACTIVE", "INACTIVE", "MAINTENANCE"]);
const SyncStatusEnum = z.enum(["PENDING", "RUNNING", "SUCCESS", "FAILED", "CANCELLED", "RETRYING"]);

export const CreateOTAProviderDto = z.object({
  providerName: z.string().min(2, "Provider name must be at least 2 characters"),
  providerCode: z
    .string()
    .min(2, "Provider code must be at least 2 characters")
    .max(50, "Provider code must not exceed 50 characters")
    .toUpperCase(),
  description: z.string().optional(),
  webhookUrl: z.string().url("Invalid webhook URL").optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const UpdateOTAProviderDto = z.object({
  providerName: z.string().min(2, "Provider name must be at least 2 characters").optional(),
  providerCode: z
    .string()
    .min(2, "Provider code must be at least 2 characters")
    .max(50, "Provider code must not exceed 50 characters")
    .toUpperCase()
    .optional(),
  status: OTAProviderStatusEnum.optional(),
  description: z.string().optional(),
  webhookUrl: z.string().url("Invalid webhook URL").optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const OTAProviderFilterDto = z.object({
  status: OTAProviderStatusEnum.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const CreateOTAMappingDto = z.object({
  hotelId: z.string().uuid("Invalid hotel ID"),
  roomTypeId: z.string().uuid("Invalid room type ID").optional(),
  providerId: z.string().uuid("Invalid provider ID"),
  externalHotelId: z.string().min(1, "External hotel ID is required"),
  externalRoomTypeId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const UpdateOTAMappingDto = z.object({
  isActive: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional(),
  externalRoomTypeId: z.string().optional(),
});

export const OTAMappingFilterDto = z.object({
  hotelId: z.string().uuid("Invalid hotel ID"),
  providerId: z.string().uuid("Invalid provider ID").optional(),
  roomTypeId: z.string().uuid("Invalid room type ID").optional(),
  isActive: z
    .string()
    .transform((v) => v === "true")
    .optional(),
  syncStatus: SyncStatusEnum.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const OTAReservationFilterDto = z.object({
  hotelId: z.string().uuid("Invalid hotel ID").optional(),
  providerId: z.string().uuid("Invalid provider ID").optional(),
  syncStatus: z
    .enum(["PENDING", "IMPORTED", "FAILED", "DUPLICATE", "REJECTED"])
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const IngestReservationDto = z.object({
  providerId: z.string().uuid("Invalid provider ID"),
  hotelId: z.string().uuid("Invalid hotel ID"),
  externalReservationId: z.string().min(1, "External reservation ID is required"),
  rawPayload: z.record(z.unknown()),
});

export type OTAReservationFilterDtoType = z.infer<typeof OTAReservationFilterDto>;
export type CreateOTAProviderDtoType = z.infer<typeof CreateOTAProviderDto>;
export type UpdateOTAProviderDtoType = z.infer<typeof UpdateOTAProviderDto>;
export type OTAProviderFilterDtoType = z.infer<typeof OTAProviderFilterDto>;
export type CreateOTAMappingDtoType = z.infer<typeof CreateOTAMappingDto>;
export type UpdateOTAMappingDtoType = z.infer<typeof UpdateOTAMappingDto>;
export type OTAMappingFilterDtoType = z.infer<typeof OTAMappingFilterDto>;
export type IngestReservationDtoType = z.infer<typeof IngestReservationDto>;
