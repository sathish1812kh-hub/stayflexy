// FILE: src/modules/hotel/types/index.ts
import type { Nullable, SoftDeleteFields } from "@shared-types";

export type HotelStatus = "ACTIVE" | "INACTIVE" | "UNDER_MAINTENANCE" | "CLOSED";

export type HotelOperationalStatus =
  | "OPEN"
  | "CLOSED_TEMPORARILY"
  | "CLOSED_PERMANENTLY"
  | "UNDER_RENOVATION"
  | "PRE_OPENING";

export type HotelCategory =
  | "HOTEL"
  | "RESORT"
  | "BOUTIQUE"
  | "HOSTEL"
  | "MOTEL"
  | "BED_AND_BREAKFAST"
  | "SERVICED_APARTMENT"
  | "VILLA"
  | "LODGE"
  | "BUDGET"
  | "ECONOMY"
  | "MIDSCALE"
  | "UPSCALE"
  | "LUXURY";

export type HotelAmenity =
  | "WIFI"
  | "PARKING"
  | "SWIMMING_POOL"
  | "GYM"
  | "SPA"
  | "RESTAURANT"
  | "BAR"
  | "ROOM_SERVICE"
  | "LAUNDRY"
  | "CONCIERGE"
  | "BUSINESS_CENTER"
  | "CONFERENCE_ROOM"
  | "AIRPORT_SHUTTLE"
  | "PET_FRIENDLY"
  | "KIDS_CLUB"
  | "BEACH_ACCESS"
  | "GOLF_COURSE"
  | "TENNIS_COURT"
  | "EV_CHARGING"
  | "ACCESSIBLE_FACILITIES";

export interface HotelAddress {
  addressLine1: string;
  addressLine2: Nullable<string>;
  city: string;
  state: Nullable<string>;
  country: string;
  postalCode: Nullable<string>;
  latitude: Nullable<number>;
  longitude: Nullable<number>;
}

export interface HotelSettings {
  timezone: string;
  currency: string;
  checkInTime: string;
  checkOutTime: string;
  amenities: string[];
}

export interface Hotel extends SoftDeleteFields {
  id: string;
  name: string;
  slug: string;
  hotelCode: Nullable<string>;
  organizationId: string;
  status: HotelStatus;
  operationalStatus: HotelOperationalStatus;
  category: HotelCategory;
  starRating: number;
  email: string;
  phone: string;
  website: Nullable<string>;
  description: Nullable<string>;
  timezone: string;
  currency: string;
  address: HotelAddress;
  checkInTime: string;
  checkOutTime: string;
  totalRooms: number;
  amenities: string[];
}

export interface CreateHotelData {
  name: string;
  slug: string;
  hotelCode: Nullable<string>;
  organizationId: string;
  status: HotelStatus;
  operationalStatus: HotelOperationalStatus;
  category: HotelCategory;
  starRating: number;
  email: string;
  phone: string;
  website: Nullable<string>;
  description: Nullable<string>;
  timezone: string;
  currency: string;
  addressLine1: string;
  addressLine2: Nullable<string>;
  city: string;
  state: Nullable<string>;
  country: string;
  postalCode: Nullable<string>;
  latitude: Nullable<number>;
  longitude: Nullable<number>;
  checkInTime: string;
  checkOutTime: string;
  totalRooms: number;
  amenities: string[];
}

export type UpdateHotelData = Partial<Omit<CreateHotelData, "organizationId">>;
