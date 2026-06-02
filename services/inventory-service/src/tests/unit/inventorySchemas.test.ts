import { z } from 'zod'

const GetInventoryQuerySchema = z.object({
  hotelId: z.string().min(1),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'startDate must be YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'endDate must be YYYY-MM-DD'),
  roomTypeId: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
})

const AvailabilityQuerySchema = z.object({
  hotelId: z.string().min(1),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  roomTypeId: z.string().optional(),
  adults: z.coerce.number().int().positive().default(1),
  children: z.coerce.number().int().min(0).default(0),
})

describe('GetInventoryQuerySchema', () => {
  it('accepts valid inventory query', () => {
    const result = GetInventoryQuerySchema.safeParse({
      hotelId: 'hotel-1', startDate: '2025-06-01', endDate: '2025-06-30',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid date format', () => {
    const result = GetInventoryQuerySchema.safeParse({
      hotelId: 'hotel-1', startDate: '06/01/2025', endDate: '2025-06-30',
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing hotelId', () => {
    const result = GetInventoryQuerySchema.safeParse({
      hotelId: '', startDate: '2025-06-01', endDate: '2025-06-30',
    })
    expect(result.success).toBe(false)
  })

  it('coerces page and limit to numbers', () => {
    const result = GetInventoryQuerySchema.safeParse({
      hotelId: 'hotel-1', startDate: '2025-06-01', endDate: '2025-06-30',
      page: '2', limit: '10',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.page).toBe(2)
      expect(result.data.limit).toBe(10)
    }
  })

  it('rejects limit > 100', () => {
    const result = GetInventoryQuerySchema.safeParse({
      hotelId: 'hotel-1', startDate: '2025-06-01', endDate: '2025-06-30',
      limit: '200',
    })
    expect(result.success).toBe(false)
  })
})

describe('AvailabilityQuerySchema', () => {
  it('accepts valid availability query', () => {
    const result = AvailabilityQuerySchema.safeParse({
      hotelId: 'hotel-1', checkIn: '2025-07-01', checkOut: '2025-07-03',
    })
    expect(result.success).toBe(true)
  })

  it('applies default adults=1, children=0', () => {
    const result = AvailabilityQuerySchema.safeParse({
      hotelId: 'hotel-1', checkIn: '2025-07-01', checkOut: '2025-07-03',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.adults).toBe(1)
      expect(result.data.children).toBe(0)
    }
  })

  it('rejects adults=0', () => {
    const result = AvailabilityQuerySchema.safeParse({
      hotelId: 'hotel-1', checkIn: '2025-07-01', checkOut: '2025-07-03', adults: '0',
    })
    expect(result.success).toBe(false)
  })
})
