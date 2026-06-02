// FILE: src/modules/organization/types/index.ts
import type { Nullable, TimestampFields } from "@shared-types";

// Mirror of auth module's UserRole — kept local to avoid cross-module import
export type UserRole =
  | "SUPER_ADMIN"
  | "ORG_ADMIN"
  | "HOTEL_MANAGER"
  | "FRONT_DESK"
  | "HOUSEKEEPING"
  | "ACCOUNTANT";

export type OrgPlan = "FREE" | "STARTER" | "PROFESSIONAL" | "ENTERPRISE";

export type OrgStatus =
  | "ACTIVE"
  | "SUSPENDED"
  | "CANCELLED"
  | "PENDING_SETUP";

export type OrgMemberRole =
  | "ORG_ADMIN"
  | "HOTEL_MANAGER"
  | "FRONT_DESK"
  | "HOUSEKEEPING"
  | "ACCOUNTANT";

export interface OrgAddress {
  street: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
}

export interface OrgSettings {
  timezone: string;
  currency: string;
  dateFormat: string;
  timeFormat: "12h" | "24h";
  language: string;
  checkInTime: string;
  checkOutTime: string;
}

export interface Organization extends TimestampFields {
  id: string;
  name: string;
  legalName: Nullable<string>;
  slug: string;
  plan: OrgPlan;
  status: OrgStatus;
  ownerId: string;
  email: string;
  phone: Nullable<string>;
  website: Nullable<string>;
  logoUrl: Nullable<string>;
  address: OrgAddress;
  maxHotels: number;
  metadata: Nullable<Record<string, unknown>>;
  createdById: Nullable<string>;
  deletedAt: Nullable<Date>;
}

export interface OrgMember extends TimestampFields {
  id: string;
  organizationId: string;
  userId: string;
  role: UserRole;
  isOwner: boolean;
  joinedAt: Date;
  removedAt: Nullable<Date>;
}

export interface CreateOrganizationData {
  name: string;
  legalName: Nullable<string>;
  slug: string;
  plan: OrgPlan;
  status: OrgStatus;
  ownerId: string;
  email: string;
  phone: Nullable<string>;
  website: Nullable<string>;
  logoUrl: Nullable<string>;
  address: OrgAddress;
  maxHotels: number;
  metadata: Nullable<Record<string, unknown>>;
  createdById: Nullable<string>;
}

export interface UpdateOrganizationData {
  name?: string;
  legalName?: Nullable<string>;
  slug?: string;
  plan?: OrgPlan;
  status?: OrgStatus;
  email?: string;
  phone?: Nullable<string>;
  website?: Nullable<string>;
  logoUrl?: Nullable<string>;
  address?: Partial<OrgAddress>;
  maxHotels?: number;
  metadata?: Nullable<Record<string, unknown>>;
}
