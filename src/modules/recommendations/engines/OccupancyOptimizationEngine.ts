// FILE: src/modules/recommendations/engines/OccupancyOptimizationEngine.ts
import { prisma } from "@lib/prisma";
import type { ScoredRecommendation } from "../types";

export class OccupancyOptimizationEngine {
  static async score(hotelId: string, orgId: string): Promise<ScoredRecommendation | null> {
    const hotel = await prisma.hotel.findFirst({
      where: { id: hotelId, organizationId: orgId, deletedAt: null },
      select: { totalRooms: true },
    });
    if (!hotel || hotel.totalRooms === 0) return null;

    // Look at next 7 days booking count
    const now = new Date();
    const sevenDaysOut = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const upcomingBookings = await prisma.booking.count({
      where: {
        hotelId,
        status: { in: ["CONFIRMED", "CHECKED_IN"] },
        rooms: {
          some: {
            checkInDate: { gte: now },
            checkOutDate: { lte: sevenDaysOut },
          },
        },
      },
    });

    const forecastedOccupancy = upcomingBookings / (hotel.totalRooms * 7);

    if (forecastedOccupancy >= 0.70) return null; // above 70% — no action needed

    const confidence = Math.min(0.90, (0.70 - forecastedOccupancy) * 2);

    return {
      type: "OCCUPANCY_OPTIMIZATION",
      score: Math.round(confidence * 1000) / 1000,
      explanation: `Forecasted 7-day occupancy is ${Math.round(forecastedOccupancy * 100)}%. Consider promotional packages or OTA rate adjustments to increase bookings.`,
      payload: {
        forecastedOccupancyRate: Math.round(forecastedOccupancy * 100) / 100,
        upcomingBookings,
        targetOccupancyRate: 0.70,
        actionSuggestions: [
          "Reduce OTA rates for low-demand dates",
          "Create promotional packages",
          "Target corporate accounts",
        ],
      },
    };
  }
}
