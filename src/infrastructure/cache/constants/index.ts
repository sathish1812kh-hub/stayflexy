export const CACHE_TTL = {
  INVENTORY: 60,        // 1 minute — high-churn
  ROOM_TYPE: 300,       // 5 minutes
  HOTEL: 600,           // 10 minutes
  PRICING_RULE: 120,    // 2 minutes
  USER_SESSION: 900,    // 15 minutes
  ANALYTICS: 1800,      // 30 minutes
  STATIC: 86400,        // 1 day
} as const;

export const CACHE_PREFIX = {
  INVENTORY: "inv",
  BOOKING: "bk",
  HOTEL: "htl",
  ROOM: "rm",
  PRICING: "price",
  USER: "usr",
  SESSION: "sess",
  ANALYTICS: "analytics",
} as const;

export const CACHE_NAMESPACE_SEPARATOR = ":";
