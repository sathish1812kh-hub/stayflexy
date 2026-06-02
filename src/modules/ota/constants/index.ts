export const OTA_PROVIDER_CODES = {
  BOOKING_COM: "BOOKING_COM",
  AIRBNB: "AIRBNB",
  EXPEDIA: "EXPEDIA",
  AGODA: "AGODA",
} as const;
export type OTAProviderCode = (typeof OTA_PROVIDER_CODES)[keyof typeof OTA_PROVIDER_CODES];

export const OTA_ERRORS = {
  PROVIDER_NOT_FOUND: "OTA provider not found",
  PROVIDER_CODE_EXISTS: "Provider code already exists",
  PROVIDER_INACTIVE: "OTA provider is not active",
  MAPPING_NOT_FOUND: "OTA mapping not found",
  MAPPING_EXISTS: "Mapping already exists for this hotel/provider combination",
  ROOM_MAPPING_EXISTS: "Room type mapping already exists for this provider",
  MAPPING_INACTIVE: "OTA mapping is inactive",
  RESERVATION_NOT_FOUND: "OTA reservation not found",
  RESERVATION_DUPLICATE: "Reservation already imported (duplicate external ID)",
  HOTEL_NOT_FOUND: "Hotel not found or access denied",
  ROOM_TYPE_NOT_FOUND: "Room type not found",
} as const;

export const MAX_RETRY_COUNT = 3;
export const SYNC_BATCH_SIZE = 100;
