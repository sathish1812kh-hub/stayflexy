import { KpiCalculator } from '../../aggregators/KpiCalculator'
import type { Logger } from '@stayflexi/shared-logger'
import type { PrismaClient } from '@prisma/client'

const mockLogger: Logger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
} as unknown as Logger

function makeDb(overrides: Partial<{
  hotel: unknown
  bookingAggregate: unknown
  paymentAggregate: unknown
  cancellationCount: number
  channelRevenue: unknown[]
  checkedOutBookings: unknown[]
  roomTypeRevenue: unknown[]
  bookingCount: unknown
}> = {}): PrismaClient {
  const {
    hotel = { totalRooms: 10 },
    bookingAggregate = { _count: { id: 5 }, _avg: { finalAmount: { toNumber: () => 200 } } },
    paymentAggregate = { _sum: { amount: { toNumber: () => 1000 } } },
    cancellationCount = 1,
    channelRevenue = [],
    checkedOutBookings = [],
    roomTypeRevenue = [],
  } = overrides

  return {
    hotel: {
      findUnique: jest.fn().mockResolvedValue(hotel),
    },
    booking: {
      aggregate: jest.fn().mockResolvedValue(bookingAggregate),
      count: jest.fn().mockResolvedValue(cancellationCount),
      groupBy: jest.fn().mockResolvedValue(channelRevenue),
      findMany: jest.fn().mockResolvedValue(checkedOutBookings),
    },
    payment: {
      aggregate: jest.fn().mockResolvedValue(paymentAggregate),
    },
    bookingRoom: {
      groupBy: jest.fn().mockResolvedValue(roomTypeRevenue),
    },
  } as unknown as PrismaClient
}

describe('KpiCalculator', () => {
  const from = new Date('2024-01-01')
  const to = new Date('2024-01-07')

  it('calculates ADR correctly from payment + booking data', async () => {
    // totalRevenue = 700 (7 payments of 100), totalBookings = 7
    const db = makeDb({
      hotel: { totalRooms: 10 },
      bookingAggregate: { _count: { id: 7 }, _avg: { finalAmount: null } },
      paymentAggregate: { _sum: { amount: { toNumber: () => 700 } } },
      cancellationCount: 0,
    })
    const calc = new KpiCalculator(db, mockLogger)
    const result = await calc.calculateKpis('hotel-1', 'org-1', from, to)
    // ADR = totalRevenue / totalBookings = 700 / 7 = 100
    expect(result.adr).toBe(100)
  })

  it('calculates RevPAR = ADR × (occupancyRate / 100)', async () => {
    const db = makeDb({
      hotel: { totalRooms: 10 },
      bookingAggregate: { _count: { id: 5 }, _avg: { finalAmount: null } },
      paymentAggregate: { _sum: { amount: { toNumber: () => 1000 } } },
      cancellationCount: 0,
    })
    const calc = new KpiCalculator(db, mockLogger)
    const result = await calc.calculateKpis('hotel-1', 'org-1', from, to)
    // adr = 1000 / 5 = 200
    // dayCount = 7, availableRoomNights = 70, occupancyRate = (5/70)*100 = 7.14%
    // revpar = adr * (occupancyRate/100) = 200 * 0.0714 = ~14.29
    expect(result.revpar).toBeCloseTo(result.adr * (result.occupancyRate / 100), 1)
  })

  it('occupancyRate caps at 100% when overbooking', async () => {
    // totalBookings > availableRoomNights
    const db = makeDb({
      hotel: { totalRooms: 1 },
      bookingAggregate: { _count: { id: 999 }, _avg: { finalAmount: null } },
      paymentAggregate: { _sum: { amount: { toNumber: () => 9990 } } },
      cancellationCount: 0,
    })
    const calc = new KpiCalculator(db, mockLogger)
    const result = await calc.calculateKpis('hotel-1', 'org-1', from, to)
    expect(result.occupancyRate).toBe(100)
  })

  it('cancellationRate = cancellations / total bookings × 100', async () => {
    const db = makeDb({
      hotel: { totalRooms: 10 },
      bookingAggregate: { _count: { id: 10 }, _avg: { finalAmount: null } },
      paymentAggregate: { _sum: { amount: { toNumber: () => 1000 } } },
      cancellationCount: 2,
    })
    const calc = new KpiCalculator(db, mockLogger)
    const result = await calc.calculateKpis('hotel-1', 'org-1', from, to)
    // cancellationRate = (2 / 10) * 100 = 20
    expect(result.cancellationRate).toBe(20)
  })

  it('returns zeros for hotel with no bookings', async () => {
    const db = makeDb({
      hotel: { totalRooms: 10 },
      bookingAggregate: { _count: { id: 0 }, _avg: { finalAmount: null } },
      paymentAggregate: { _sum: { amount: null } },
      cancellationCount: 0,
    })
    const calc = new KpiCalculator(db, mockLogger)
    const result = await calc.calculateKpis('hotel-1', 'org-1', from, to)
    expect(result.totalRevenue).toBe(0)
    expect(result.adr).toBe(0)
    expect(result.revpar).toBe(0)
    expect(result.occupancyRate).toBe(0)
    expect(result.cancellationRate).toBe(0)
    expect(result.totalBookings).toBe(0)
  })

  it('handles empty date range gracefully (same day)', async () => {
    const sameDay = new Date('2024-01-01')
    const db = makeDb({
      hotel: { totalRooms: 5 },
      bookingAggregate: { _count: { id: 3 }, _avg: { finalAmount: null } },
      paymentAggregate: { _sum: { amount: { toNumber: () => 300 } } },
      cancellationCount: 0,
    })
    const calc = new KpiCalculator(db, mockLogger)
    const result = await calc.calculateKpis('hotel-1', 'org-1', sameDay, sameDay)
    // dayCount = 1, availableRoomNights = 5
    // occupancyRate = (3/5)*100 = 60
    expect(result.occupancyRate).toBe(60)
    expect(result.adr).toBe(100)
    expect(result.totalBookings).toBe(3)
  })
})
