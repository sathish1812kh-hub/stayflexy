import type { ICacheProvider } from "../types";

export class InvalidationStrategy {
  constructor(private readonly cache: ICacheProvider) {}

  // Invalidate all cache keys matching a hotel
  async invalidateHotel(orgId: string, hotelId: string): Promise<void> {
    await Promise.all([
      this.cache.delByPattern(`*:${orgId}:${hotelId}*`),
      this.cache.delByPattern(`inv:${orgId}:*`),
    ]);
  }

  // Invalidate inventory cache for a specific room type
  async invalidateInventory(orgId: string, hotelId: string): Promise<void> {
    await this.cache.delByPattern(`inv:${orgId}:*`);
    await this.cache.delByPattern(`price:${orgId}:${hotelId}*`);
  }

  // Invalidate all booking-related cache for an org
  async invalidateBookingCache(orgId: string): Promise<void> {
    await this.cache.delByPattern(`bk:${orgId}:*`);
  }

  // Full org cache flush (e.g., after bulk import)
  async invalidateOrg(orgId: string): Promise<void> {
    await this.cache.delByPattern(`*:${orgId}:*`);
  }
}
