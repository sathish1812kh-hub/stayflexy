import { z } from 'zod'

export const connectOtaDtoSchema = z.object({
  hotelId: z.string().uuid(),
  providerId: z.string().uuid(),
  externalHotelId: z.string().min(1).max(200),
  roomTypeMappings: z
    .array(
      z.object({
        roomTypeId: z.string().uuid(),
        externalRoomTypeId: z.string().min(1),
      }),
    )
    .optional()
    .default([]),
  metadata: z.record(z.unknown()).optional(),
})

export const syncInventoryDtoSchema = z.object({
  hotelId: z.string().uuid(),
  providerId: z.string().uuid(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'dateFrom must be YYYY-MM-DD'),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'dateTo must be YYYY-MM-DD'),
  roomAvailability: z
    .array(
      z.object({
        externalRoomTypeId: z.string().min(1),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
        available: z.number().int().min(0),
        totalRooms: z.number().int().min(0),
      }),
    )
    .min(1),
})

export const syncRatesDtoSchema = z.object({
  hotelId: z.string().uuid(),
  providerId: z.string().uuid(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'dateFrom must be YYYY-MM-DD'),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'dateTo must be YYYY-MM-DD'),
  rates: z
    .array(
      z.object({
        externalRoomTypeId: z.string().min(1),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
        rateAmount: z.number().positive(),
        currency: z.string().length(3),
        ratePlanId: z.string().optional(),
      }),
    )
    .min(1),
})

export const syncReservationsDtoSchema = z.object({
  hotelId: z.string().uuid(),
  providerId: z.string().uuid(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'dateFrom must be YYYY-MM-DD'),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'dateTo must be YYYY-MM-DD'),
})

export const createProviderDtoSchema = z.object({
  providerName: z.string().min(1).max(100),
  providerCode: z.string().min(1).max(50),
  description: z.string().optional(),
  webhookUrl: z.string().url().optional(),
  metadata: z.record(z.unknown()).optional(),
})

export const updateProviderStatusDtoSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE', 'MAINTENANCE']),
})

export const importReservationDtoSchema = z.object({
  bookingId: z.string().uuid().optional(),
})

export const reconciliationQuerySchema = z.object({
  hotelId: z.string().uuid(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

export type ConnectOtaDto = z.infer<typeof connectOtaDtoSchema>
export type SyncInventoryDto = z.infer<typeof syncInventoryDtoSchema>
export type SyncRatesDto = z.infer<typeof syncRatesDtoSchema>
export type SyncReservationsDto = z.infer<typeof syncReservationsDtoSchema>
export type CreateProviderDto = z.infer<typeof createProviderDtoSchema>
export type UpdateProviderStatusDto = z.infer<typeof updateProviderStatusDtoSchema>
export type ImportReservationDto = z.infer<typeof importReservationDtoSchema>
export type ReconciliationQuery = z.infer<typeof reconciliationQuerySchema>
