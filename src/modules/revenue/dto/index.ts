// FILE: src/modules/revenue/dto/index.ts
import { z } from 'zod'

const isoDateString = z.string().refine(
  (val) => {
    const d = new Date(val)
    return !isNaN(d.getTime())
  },
  { message: 'Invalid ISO date format' },
)

// ─── RevenueMetricFilterDto ───────────────────────────────────────────────────

export const RevenueMetricFilterDto = z
  .object({
    hotelId: z.string().uuid('Invalid hotel ID'),
    startDate: isoDateString,
    endDate: isoDateString,
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(365).default(30),
  })
  .refine((data) => new Date(data.endDate) >= new Date(data.startDate), {
    message: 'End date must be after or equal to start date',
    path: ['endDate'],
  })

// ─── OccupancyQueryDto ────────────────────────────────────────────────────────

export const OccupancyQueryDto = z.object({
  hotelId: z.string().uuid('Invalid hotel ID'),
  date: isoDateString,
})

// ─── ForecastQueryDto ─────────────────────────────────────────────────────────

export const ForecastQueryDto = z.object({
  hotelId: z.string().uuid('Invalid hotel ID'),
  forecastDays: z.coerce.number().int().min(1).max(90).default(30),
})

// ─── ComparisonQueryDto ───────────────────────────────────────────────────────

export const ComparisonQueryDto = z.object({
  hotelId: z.string().min(1, 'Invalid hotel ID'),
  roomTypeId: z.string().optional(),
  checkInDate: z.string().optional(),
})

// ─── CompetitorHotel DTOs ────────────────────────────────────────────────────

export const CreateCompetitorHotelDto = z.object({
  hotelId: z.string().min(1, 'Invalid hotel ID'),
  name: z.string().min(1, 'Name is required'),
  location: z.string().min(1, 'Location is required'),
  starRating: z.number().min(1).max(5).optional().nullable(),
  pricingSegment: z.string().default('MIDSCALE'),
  importance: z.string().default('PRIMARY'),
  isActive: z.boolean().default(true),
})

export const UpdateCompetitorHotelDto = z.object({
  name: z.string().min(1).optional(),
  location: z.string().min(1).optional(),
  starRating: z.number().min(1).max(5).optional().nullable(),
  pricingSegment: z.string().optional(),
  importance: z.string().optional(),
  isActive: z.boolean().optional(),
})

export const UploadCompetitorPricesDto = z.object({
  hotelId: z.string().min(1, 'Invalid hotel ID'),
  prices: z.array(
    z.object({
      competitorHotelId: z.string().min(1, 'Invalid competitor hotel ID'),
      roomType: z.string().min(1),
      listedPrice: z.number().positive(),
      taxesIncluded: z.boolean().default(true),
      availability: z.boolean().default(true),
      checkInDate: isoDateString,
      checkOutDate: isoDateString,
      sourcePlatform: z.string().default('DIRECT'),
    }),
  ),
})

// ─── Inferred types ───────────────────────────────────────────────────────────

export type RevenueMetricFilterDtoType = z.infer<typeof RevenueMetricFilterDto>
export type OccupancyQueryDtoType = z.infer<typeof OccupancyQueryDto>
export type ForecastQueryDtoType = z.infer<typeof ForecastQueryDto>
export type ComparisonQueryDtoType = z.infer<typeof ComparisonQueryDto>
export type CreateCompetitorHotelDtoType = z.infer<typeof CreateCompetitorHotelDto>
export type UpdateCompetitorHotelDtoType = z.infer<typeof UpdateCompetitorHotelDto>
export type UploadCompetitorPricesDtoType = z.infer<typeof UploadCompetitorPricesDto>
