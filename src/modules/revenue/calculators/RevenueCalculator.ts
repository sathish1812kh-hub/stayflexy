// FILE: src/modules/revenue/calculators/RevenueCalculator.ts
import type { ForecastPeriod } from "../types";

export class RevenueCalculator {
  static calculateADR(totalRoomRevenue: number, roomNightsBooked: number): number {
    if (roomNightsBooked === 0) return 0;
    return Math.round((totalRoomRevenue / roomNightsBooked) * 100) / 100;
  }

  static calculateRevPAR(adr: number, occupancyRate: number): number {
    // occupancyRate is 0–100
    return Math.round(adr * (occupancyRate / 100) * 100) / 100;
  }

  static calculateOccupancyRate(occupiedRooms: number, totalRooms: number): number {
    if (totalRooms === 0) return 0;
    return Math.round((occupiedRooms / totalRooms) * 10000) / 100; // 2 decimal places, 0–100
  }

  static calculateCancellationRate(cancelledCount: number, totalCount: number): number {
    if (totalCount === 0) return 0;
    return Math.round((cancelledCount / totalCount) * 10000) / 100;
  }

  // Linear extrapolation forecast from historical metrics.
  // Returns array of ForecastPeriod objects.
  static forecastRevenue(
    historicalMetrics: Array<{ metricDate: Date; occupancyRate: number; totalRevenue: number }>,
    forecastDays: number,
    confidence: number
  ): ForecastPeriod[] {
    if (historicalMetrics.length === 0) {
      const today = new Date();
      return Array.from({ length: forecastDays }, (_, i) => {
        const d = new Date(today);
        d.setUTCDate(d.getUTCDate() + i + 1);
        return { date: d, forecastedOccupancy: 0, forecastedRevenue: 0, confidence: 0 };
      });
    }

    const sorted = [...historicalMetrics].sort(
      (a, b) => a.metricDate.getTime() - b.metricDate.getTime()
    );
    const n = sorted.length;
    const avgOccupancy = sorted.reduce((s, m) => s + m.occupancyRate, 0) / n;
    const avgRevenue = sorted.reduce((s, m) => s + m.totalRevenue, 0) / n;

    // Simple linear trend: slope = (last - first) / n
    const occupancySlope =
      n > 1
        ? ((sorted[n - 1]?.occupancyRate ?? avgOccupancy) -
            (sorted[0]?.occupancyRate ?? avgOccupancy)) /
          n
        : 0;
    const revenueSlope =
      n > 1
        ? ((sorted[n - 1]?.totalRevenue ?? avgRevenue) -
            (sorted[0]?.totalRevenue ?? avgRevenue)) /
          n
        : 0;

    const lastDate = sorted[n - 1]?.metricDate ?? new Date();
    return Array.from({ length: forecastDays }, (_, i) => {
      const d = new Date(lastDate);
      d.setUTCDate(d.getUTCDate() + i + 1);
      const forecastedOccupancy = Math.min(
        100,
        Math.max(
          0,
          Math.round((avgOccupancy + occupancySlope * (n + i)) * 100) / 100
        )
      );
      const forecastedRevenue = Math.max(
        0,
        Math.round((avgRevenue + revenueSlope * (n + i)) * 100) / 100
      );
      return { date: d, forecastedOccupancy, forecastedRevenue, confidence };
    });
  }
}
