import { ForecastEngine } from '../../algorithms/ForecastEngine'
import type { HistoricalMetric } from '../../algorithms/ForecastEngine'

const makeMetric = (date: string, occupancyRate = 0.70, adr = 150, bookingCount = 10): HistoricalMetric => ({
  date,
  occupancyRate,
  adr,
  revpar: adr * occupancyRate,
  bookingCount,
})

const makeHistoricalData = (count: number, baseOccupancy = 0.70): HistoricalMetric[] => {
  const metrics: HistoricalMetric[] = []
  for (let i = count; i >= 1; i--) {
    const d = new Date('2026-04-01')
    d.setDate(d.getDate() - i)
    metrics.push(makeMetric(d.toISOString().split('T')[0]!, baseOccupancy))
  }
  return metrics
}

describe('ForecastEngine', () => {
  let engine: ForecastEngine

  beforeEach(() => {
    engine = new ForecastEngine()
  })

  describe('generate', () => {
    it('produces one forecast per target date', () => {
      const historical = makeHistoricalData(30)
      const output = engine.generate({
        hotelId: 'hotel-1',
        organizationId: 'org-1',
        targetDates: ['2026-05-01', '2026-05-02', '2026-05-03'],
        historicalMetrics: historical,
        totalRooms: 100,
      })
      expect(output.forecasts).toHaveLength(3)
      expect(output.forecasts[0]!.forecastDate).toBe('2026-05-01')
      expect(output.forecasts[2]!.forecastDate).toBe('2026-05-03')
    })

    it('sets hotelId and organizationId on each forecast', () => {
      const historical = makeHistoricalData(30)
      const output = engine.generate({
        hotelId: 'hotel-99',
        organizationId: 'org-42',
        targetDates: ['2026-05-01'],
        historicalMetrics: historical,
        totalRooms: 50,
      })
      expect(output.forecasts[0]!.hotelId).toBe('hotel-99')
      expect(output.forecasts[0]!.organizationId).toBe('org-42')
    })

    it('applies weekend occupancy boost on Saturday (day 6)', () => {
      // 2026-08-01 is a Saturday
      const historical = makeHistoricalData(60, 0.60)
      const output = engine.generate({
        hotelId: 'hotel-1',
        organizationId: 'org-1',
        targetDates: ['2026-08-01', '2026-08-03'], // Sat and Mon
        historicalMetrics: historical,
        totalRooms: 100,
      })
      const satForecast = output.forecasts[0]!
      const monForecast = output.forecasts[1]!
      // Saturday should have higher projected occupancy than Monday
      expect(satForecast.projectedOccupancy).toBeGreaterThan(monForecast.projectedOccupancy)
    })

    it('assigns HIGH confidence with 60+ historical days', () => {
      const historical = makeHistoricalData(65)
      const output = engine.generate({
        hotelId: 'hotel-1',
        organizationId: 'org-1',
        targetDates: ['2026-05-01'],
        historicalMetrics: historical,
        totalRooms: 100,
      })
      expect(output.forecasts[0]!.confidence).toBe('HIGH')
    })

    it('assigns MEDIUM confidence with 30–59 historical days', () => {
      const historical = makeHistoricalData(45)
      const output = engine.generate({
        hotelId: 'hotel-1',
        organizationId: 'org-1',
        targetDates: ['2026-05-01'],
        historicalMetrics: historical,
        totalRooms: 100,
      })
      expect(output.forecasts[0]!.confidence).toBe('MEDIUM')
    })

    it('assigns LOW confidence with fewer than 30 historical days', () => {
      const historical = makeHistoricalData(15)
      const output = engine.generate({
        hotelId: 'hotel-1',
        organizationId: 'org-1',
        targetDates: ['2026-05-01'],
        historicalMetrics: historical,
        totalRooms: 100,
      })
      expect(output.forecasts[0]!.confidence).toBe('LOW')
    })

    it('clamps projected occupancy between 0.05 and 0.99', () => {
      // Extreme occupancy data
      const highHistorical = makeHistoricalData(30, 0.99)
      const output = engine.generate({
        hotelId: 'hotel-1',
        organizationId: 'org-1',
        targetDates: ['2026-08-01'], // Saturday — weekend boost
        historicalMetrics: highHistorical,
        totalRooms: 100,
      })
      expect(output.forecasts[0]!.projectedOccupancy).toBeLessThanOrEqual(0.99)

      const lowHistorical = makeHistoricalData(30, 0.01)
      const lowOutput = engine.generate({
        hotelId: 'hotel-1',
        organizationId: 'org-1',
        targetDates: ['2026-08-03'],
        historicalMetrics: lowHistorical,
        totalRooms: 100,
      })
      expect(lowOutput.forecasts[0]!.projectedOccupancy).toBeGreaterThanOrEqual(0.05)
    })

    it('sets forecastedBy to ALGORITHM', () => {
      const historical = makeHistoricalData(30)
      const output = engine.generate({
        hotelId: 'hotel-1',
        organizationId: 'org-1',
        targetDates: ['2026-05-01'],
        historicalMetrics: historical,
        totalRooms: 100,
      })
      expect(output.forecasts[0]!.forecastedBy).toBe('ALGORITHM')
    })

    it('computes booking velocity from last 7 days', () => {
      const historical = [
        ...makeHistoricalData(7, 0.70),
      ].map((m, i) => ({ ...m, bookingCount: 14 })) // 14 bookings/day = velocity 14
      const output = engine.generate({
        hotelId: 'hotel-1',
        organizationId: 'org-1',
        targetDates: ['2026-05-01'],
        historicalMetrics: historical,
        totalRooms: 100,
      })
      expect(output.forecasts[0]!.bookingVelocity).toBe(14)
    })

    it('handles empty historical metrics with defaults', () => {
      const output = engine.generate({
        hotelId: 'hotel-1',
        organizationId: 'org-1',
        targetDates: ['2026-05-01'],
        historicalMetrics: [],
        totalRooms: 100,
      })
      // Should not throw; returns forecast with default occupancy
      expect(output.forecasts).toHaveLength(1)
      expect(output.forecasts[0]!.projectedOccupancy).toBeGreaterThan(0)
    })
  })
})
