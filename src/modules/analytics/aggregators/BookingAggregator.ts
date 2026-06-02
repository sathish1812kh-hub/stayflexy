// FILE: src/modules/analytics/aggregators/BookingAggregator.ts
import { prisma } from "@lib/prisma";
import type { BookingAnalytics } from "../types";

export class BookingAggregator {
  static async aggregate(
    hotelId: string,
    orgId: string,
    startDate: Date,
    endDate: Date
  ): Promise<BookingAnalytics> {
    const bookings = await prisma.booking.findMany({
      where: {
        hotelId,
        organizationId: orgId,
        createdAt: { gte: startDate, lte: endDate },
      },
      select: { id: true, status: true, source: true, finalAmount: true },
    });

    const total = bookings.length;
    const confirmed = bookings.filter((b) => b.status !== "CANCELLED").length;
    const cancelled = bookings.filter((b) => b.status === "CANCELLED").length;
    const cancellationRate =
      total > 0 ? Math.round((cancelled / total) * 10000) / 100 : 0;

    const bySource: Record<string, number> = {};
    let totalRevenue = 0;
    for (const b of bookings) {
      if (b.status !== "CANCELLED") {
        const src = b.source as string;
        bySource[src] = (bySource[src] ?? 0) + 1;
        totalRevenue += b.finalAmount.toNumber();
      }
    }

    const avgBookingValue =
      confirmed > 0 ? Math.round((totalRevenue / confirmed) * 100) / 100 : 0;

    return {
      hotelId,
      period: { start: startDate, end: endDate },
      totalBookings: total,
      confirmedBookings: confirmed,
      cancelledBookings: cancelled,
      cancellationRate,
      bookingsBySource: bySource,
      avgBookingValue,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
    };
  }
}
