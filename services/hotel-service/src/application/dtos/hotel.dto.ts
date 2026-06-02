import { z } from 'zod'

const timePattern = /^\d{2}:\d{2}$/

export const createHotelDtoSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9-]+$/, 'Slug may only contain lowercase letters, numbers, and hyphens')
    .optional(),
  address: z.string().max(500).optional(),
  city: z.string().min(1).max(100),
  state: z.string().max(100).optional(),
  country: z.string().min(2).max(3),
  postalCode: z.string().max(20).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email().optional(),
  website: z.string().url().optional(),
  starRating: z.number().int().min(1).max(5).optional(),
  timezone: z.string().max(50).optional(),
  checkInTime: z.string().regex(timePattern, 'Must be HH:MM').optional(),
  checkOutTime: z.string().regex(timePattern, 'Must be HH:MM').optional(),
})

export const updateHotelDtoSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    address: z.string().max(500).nullable().optional(),
    city: z.string().min(1).max(100).optional(),
    state: z.string().max(100).nullable().optional(),
    country: z.string().min(2).max(3).optional(),
    postalCode: z.string().max(20).nullable().optional(),
    phone: z.string().max(20).nullable().optional(),
    email: z.string().email().nullable().optional(),
    website: z.string().url().nullable().optional(),
    starRating: z.number().int().min(1).max(5).nullable().optional(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'UNDER_RENOVATION']).optional(),
    timezone: z.string().max(50).optional(),
    checkInTime: z.string().regex(timePattern, 'Must be HH:MM').optional(),
    checkOutTime: z.string().regex(timePattern, 'Must be HH:MM').optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, {
    message: 'At least one field must be provided',
  })

export const listHotelsDtoSchema = z.object({
  page: z
    .string()
    .optional()
    .default('1')
    .transform(Number)
    .pipe(z.number().int().min(1)),
  limit: z
    .string()
    .optional()
    .default('20')
    .transform(Number)
    .pipe(z.number().int().min(1).max(100)),
  status: z.enum(['ACTIVE', 'INACTIVE', 'UNDER_RENOVATION']).optional(),
  organizationId: z.string().uuid().optional(),
})

export const createRoomTypeDtoSchema = z.object({
  hotelId: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  basePrice: z.number().positive(),
  maxOccupancy: z.number().int().min(1).max(20),
  maxAdults: z.number().int().min(1).max(20).optional(),
  maxChildren: z.number().int().min(0).max(20).optional(),
  maxInfants: z.number().int().min(0).max(20).optional(),
  minChildAge: z.number().int().min(0).max(18).optional(),
  maxChildAge: z.number().int().min(0).max(18).optional(),
  minInfantAge: z.number().int().min(0).max(18).optional(),
  maxInfantAge: z.number().int().min(0).max(18).optional(),
  minOccupancy: z.number().int().min(1).max(20).optional(),
  absoluteMax: z.number().int().min(1).max(30).optional(),
  hourlyPrice: z.number().positive().optional(),
  extraBedPrice: z.number().nonnegative().optional(),
  extraGuestPrice: z.number().nonnegative().optional(),
  maxExtraBeds: z.number().int().nonnegative().optional(),
  amenities: z.array(z.string()).optional(),
})

export const updateRoomTypeDtoSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    description: z.string().max(1000).nullable().optional(),
    basePrice: z.number().positive().optional(),
    maxOccupancy: z.number().int().min(1).max(20).optional(),
    amenities: z.array(z.string()).nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, {
    message: 'At least one field must be provided',
  })

export const listRoomTypesDtoSchema = z.object({
  page: z
    .string()
    .optional()
    .default('1')
    .transform(Number)
    .pipe(z.number().int().min(1)),
  limit: z
    .string()
    .optional()
    .default('20')
    .transform(Number)
    .pipe(z.number().int().min(1).max(100)),
  isActive: z
    .string()
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
})

export const createRoomDtoSchema = z.object({
  hotelId: z.string().uuid(),
  roomTypeId: z.string().uuid(),
  roomNumber: z.string().min(1).max(20),
  floor: z.number().int().min(0).optional(),
  notes: z.string().max(1000).optional(),
  wing: z.string().max(100).optional(),
  zone: z.string().max(100).optional(),
  wifiSSID: z.string().max(100).optional(),
  wifiPassword: z.string().max(100).optional(),
  arrivalNotes: z.string().max(1000).optional(),
  lockVendor: z.string().max(50).optional(),
  lockDeviceId: z.string().max(100).optional(),
  lockSecret: z.string().max(500).optional(),
  connectingRoomId: z.string().uuid().optional(),
  parentRoomId: z.string().uuid().optional(),
})

export const updateRoomDtoSchema = z
  .object({
    roomTypeId: z.string().uuid().optional(),
    floor: z.number().int().min(0).nullable().optional(),
    notes: z.string().max(1000).nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, {
    message: 'At least one field must be provided',
  })

export const updateRoomStatusDtoSchema = z.object({
  status: z.enum([
    'AVAILABLE',
    'OCCUPIED',
    'OUT_OF_ORDER',
    'HOUSEKEEPING',
    'MAINTENANCE',
    'BLOCKED',
  ]),
  reason: z.string().max(500).optional(),
})

export const listRoomsDtoSchema = z.object({
  page: z
    .string()
    .optional()
    .default('1')
    .transform(Number)
    .pipe(z.number().int().min(1)),
  limit: z
    .string()
    .optional()
    .default('20')
    .transform(Number)
    .pipe(z.number().int().min(1).max(100)),
  status: z
    .enum(['AVAILABLE', 'OCCUPIED', 'OUT_OF_ORDER', 'HOUSEKEEPING', 'MAINTENANCE', 'BLOCKED'])
    .optional(),
  roomTypeId: z.string().uuid().optional(),
  isActive: z
    .string()
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
})

export type CreateHotelDto = z.infer<typeof createHotelDtoSchema>
export type UpdateHotelDto = z.infer<typeof updateHotelDtoSchema>
export type ListHotelsDto = z.infer<typeof listHotelsDtoSchema>
export type CreateRoomTypeDto = z.infer<typeof createRoomTypeDtoSchema>
export type UpdateRoomTypeDto = z.infer<typeof updateRoomTypeDtoSchema>
export type ListRoomTypesDto = z.infer<typeof listRoomTypesDtoSchema>
export type CreateRoomDto = z.infer<typeof createRoomDtoSchema>
export type UpdateRoomDto = z.infer<typeof updateRoomDtoSchema>
export type UpdateRoomStatusDto = z.infer<typeof updateRoomStatusDtoSchema>
export type ListRoomsDto = z.infer<typeof listRoomsDtoSchema>
