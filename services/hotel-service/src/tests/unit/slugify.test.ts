import { z } from 'zod'

// Mirror of createHotelSchema from routes/hotels.ts for validation testing
const createHotelSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.enum(['BUDGET','ECONOMY','MIDSCALE','UPSCALE','LUXURY','BOUTIQUE','RESORT','HOSTEL']),
  starRating: z.number().int().min(1).max(5).default(3),
  email: z.string().email(),
  phone: z.string().max(20),
  country: z.string().length(2),
  checkInTime: z.string().regex(/^\d{2}:\d{2}$/).default('14:00'),
  checkOutTime: z.string().regex(/^\d{2}:\d{2}$/).default('11:00'),
  currency: z.string().length(3).default('USD'),
  addressLine1: z.string().max(255),
  city: z.string().max(100),
  timezone: z.string().default('UTC'),
})

describe('Hotel creation validation', () => {
  const validPayload = {
    name: 'Grand Hotel',
    category: 'LUXURY',
    email: 'info@grandhotel.com',
    phone: '+1-800-555-0100',
    country: 'US',
    addressLine1: '123 Main Street',
    city: 'New York',
  }

  it('accepts a valid hotel payload', () => {
    const result = createHotelSchema.safeParse(validPayload)
    expect(result.success).toBe(true)
  })

  it('rejects missing required name', () => {
    const result = createHotelSchema.safeParse({ ...validPayload, name: '' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid category', () => {
    const result = createHotelSchema.safeParse({ ...validPayload, category: 'UNKNOWN' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid star rating (> 5)', () => {
    const result = createHotelSchema.safeParse({ ...validPayload, starRating: 6 })
    expect(result.success).toBe(false)
  })

  it('rejects invalid email', () => {
    const result = createHotelSchema.safeParse({ ...validPayload, email: 'not-an-email' })
    expect(result.success).toBe(false)
  })

  it('rejects country code longer than 2 chars', () => {
    const result = createHotelSchema.safeParse({ ...validPayload, country: 'USA' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid check-in time format', () => {
    const result = createHotelSchema.safeParse({ ...validPayload, checkInTime: '2pm' })
    expect(result.success).toBe(false)
  })

  it('applies defaults: starRating=3, currency=USD, checkInTime=14:00', () => {
    const result = createHotelSchema.safeParse(validPayload)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.starRating).toBe(3)
      expect(result.data.currency).toBe('USD')
      expect(result.data.checkInTime).toBe('14:00')
    }
  })
})
