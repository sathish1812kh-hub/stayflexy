// FILE: src/modules/hotel/index.ts
export type {
  Hotel, HotelStatus, HotelOperationalStatus, HotelCategory,
  HotelAmenity, HotelAddress, HotelSettings, CreateHotelData, UpdateHotelData,
} from "./types";
export {
  HOTEL_ERRORS, HOTEL_CATEGORIES, HOTEL_STATUSES, OPERATIONAL_STATUS_VALUES,
  VALID_CURRENCIES, DEFAULT_CURRENCY, DEFAULT_TIMEZONE,
} from "./constants";
export {
  CreateHotelDto, UpdateHotelDto, HotelFilterDto,
  HotelSettingsDto, UpdateHotelStatusDto, UpdateHotelOperationalStatusDto,
} from "./dto";
export type { CreateHotelDtoType, UpdateHotelDtoType, HotelFilterDtoType } from "./dto";
export {
  validateCreateHotel, validateUpdateHotel, validateHotelFilter,
  validateHotelStatus, validateHotelSettings, validateTimezone,
} from "./validators";
export { HotelService } from "./services/HotelService";
export { PrismaHotelRepository } from "./repositories/PrismaHotelRepository";
export { withHotelParam, withOrgHotelAccess } from "./middleware";
export { hotelService, hotelRepo } from "./container";
