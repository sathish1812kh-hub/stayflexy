import { z } from 'zod'

const datePattern = /^\d{4}-\d{2}-\d{2}$/
const dateField = (label: string) =>
  z.string().regex(datePattern, `${label} must be YYYY-MM-DD`)

export const reserveInventoryDtoSchema = z.object({
  roomTypeId: z.string().uuid(),
  hotelId: z.string().uuid(),
  bookingRef: z.string().min(1).max(100),
  checkInDate: dateField('checkInDate'),
  checkOutDate: dateField('checkOutDate'),
  quantity: z.number().int().min(1).max(10).default(1),
  totalRoomsHint: z.number().int().min(1).optional(),
})

export const releaseInventoryDtoSchema = z.object({
  bookingRef: z.string().min(1).max(100),
  hotelId: z.string().uuid(),
})

const blockReasonsEnum = z.enum([
  'MAINTENANCE',
  'OTA_BLOCK',
  'MANUAL_BLOCK',
  'HOTEL_USE',
  'RENOVATION',
  'VIP_HOLD',
  'CONTINGENCY',
])

export const blockInventoryDtoSchema = z.object({
  roomTypeId: z.string().uuid(),
  hotelId: z.string().uuid(),
  startDate: dateField('startDate'),
  endDate: dateField('endDate'),
  quantity: z.number().int().min(1).default(1),
  reason: blockReasonsEnum,
  notes: z.string().max(500).optional(),
  totalRoomsHint: z.number().int().min(1).optional(),
})

export const unblockInventoryDtoSchema = z.object({
  roomTypeId: z.string().uuid(),
  hotelId: z.string().uuid(),
  startDate: dateField('startDate'),
  endDate: dateField('endDate'),
  quantity: z.number().int().min(1).default(1),
})

export const checkAvailabilityDtoSchema = z.object({
  roomTypeId: z.string().uuid().optional(),
  hotelId: z.string().uuid(),
  checkInDate: dateField('checkInDate'),
  checkOutDate: dateField('checkOutDate'),
  quantity: z
    .string()
    .optional()
    .default('1')
    .transform(Number)
    .pipe(z.number().int().min(1)),
})

export const getCalendarDtoSchema = z.object({
  hotelId: z.string().uuid(),
  roomTypeId: z.string().uuid().optional(),
  year: z
    .string()
    .transform(Number)
    .pipe(z.number().int().min(2020).max(2100)),
  month: z
    .string()
    .transform(Number)
    .pipe(z.number().int().min(1).max(12)),
})

export type ReserveInventoryDto = z.infer<typeof reserveInventoryDtoSchema>
export type ReleaseInventoryDto = z.infer<typeof releaseInventoryDtoSchema>
export type BlockInventoryDto = z.infer<typeof blockInventoryDtoSchema>
export type UnblockInventoryDto = z.infer<typeof unblockInventoryDtoSchema>
export type CheckAvailabilityDto = z.infer<typeof checkAvailabilityDtoSchema>
export type GetCalendarDto = z.infer<typeof getCalendarDtoSchema>
