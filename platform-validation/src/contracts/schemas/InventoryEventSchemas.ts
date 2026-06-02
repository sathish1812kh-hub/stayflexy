import { z } from 'zod'
import { createEnvelopeSchema } from './EventEnvelopeSchema'

export const InventoryReservedPayloadSchema = z.object({
  hotelId: z.string().min(1),
  roomTypeId: z.string().min(1),
  checkIn: z.string().min(1),
  checkOut: z.string().min(1),
  quantity: z.number().int().positive(),
  bookingId: z.string().min(1).optional(),
})

export const InventoryReleasedPayloadSchema = z.object({
  hotelId: z.string().min(1),
  roomTypeId: z.string().min(1),
  checkIn: z.string().min(1),
  checkOut: z.string().min(1),
  quantity: z.number().int().positive(),
  bookingId: z.string().min(1).optional(),
})

export const InventoryUpdatedPayloadSchema = z.object({
  hotelId: z.string().min(1),
  roomTypeId: z.string().min(1),
  date: z.string().min(1),
  available: z.number().int().nonnegative(),
  updatedBy: z.string().min(1),
})

export type InventoryReservedPayload = z.infer<typeof InventoryReservedPayloadSchema>
export type InventoryReleasedPayload = z.infer<typeof InventoryReleasedPayloadSchema>
export type InventoryUpdatedPayload = z.infer<typeof InventoryUpdatedPayloadSchema>

export const InventoryReservedEnvelopeSchema = createEnvelopeSchema(InventoryReservedPayloadSchema)
export const InventoryReleasedEnvelopeSchema = createEnvelopeSchema(InventoryReleasedPayloadSchema)
export const InventoryUpdatedEnvelopeSchema = createEnvelopeSchema(InventoryUpdatedPayloadSchema)
