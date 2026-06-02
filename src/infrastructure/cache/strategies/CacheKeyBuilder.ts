import { CACHE_PREFIX, CACHE_NAMESPACE_SEPARATOR as SEP } from "../constants";

export class CacheKeyBuilder {
  // Build a namespaced key: prefix:orgId:entity:id
  static build(prefix: string, ...parts: string[]): string {
    return [prefix, ...parts].filter(Boolean).join(SEP);
  }

  static inventory(orgId: string, roomTypeId: string, date: string): string {
    return CacheKeyBuilder.build(CACHE_PREFIX.INVENTORY, orgId, roomTypeId, date);
  }

  static inventoryRange(orgId: string, hotelId: string): string {
    return CacheKeyBuilder.build(CACHE_PREFIX.INVENTORY, orgId, hotelId) + SEP + "*";
  }

  static hotel(orgId: string, hotelId: string): string {
    return CacheKeyBuilder.build(CACHE_PREFIX.HOTEL, orgId, hotelId);
  }

  static pricing(orgId: string, hotelId: string): string {
    return CacheKeyBuilder.build(CACHE_PREFIX.PRICING, orgId, hotelId);
  }

  static booking(orgId: string, bookingId: string): string {
    return CacheKeyBuilder.build(CACHE_PREFIX.BOOKING, orgId, bookingId);
  }

  static orgPattern(orgId: string): string {
    return `*${SEP}${orgId}${SEP}*`;
  }
}
