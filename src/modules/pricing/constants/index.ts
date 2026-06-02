// FILE: src/modules/pricing/constants/index.ts

export const PRICING_ERRORS = {
  RULE_NOT_FOUND: "Pricing rule not found",
  HOTEL_NOT_FOUND: "Hotel not found or access denied",
  ROOM_TYPE_NOT_FOUND: "Room type not found",
  RATE_NOT_FOUND: "Dynamic rate not found",
  INVALID_PRICE_BOUNDS: "Minimum price cannot exceed maximum price",
  RULE_CONFLICT: "A higher priority rule already exists for this date range",
  ACCESS_DENIED: "Access denied to this pricing rule",
} as const;

export const DAY_NAMES = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;
export type DayName = (typeof DAY_NAMES)[number];

export const WEEKEND_DAYS: DayName[] = ["SAT", "SUN"];
export const WEEKDAY_DAYS: DayName[] = ["MON", "TUE", "WED", "THU", "FRI"];

export const DEFAULT_OCCUPANCY_THRESHOLDS = {
  LOW: 30,    // < 30% → discount
  MEDIUM: 60, // 30–60% → base rate
  HIGH: 80,   // 60–80% → moderate increase
  PEAK: 90,   // > 80% → maximum increase
} as const;

export const DEFAULT_OCCUPANCY_MULTIPLIERS = {
  LOW: 0.85,
  MEDIUM: 1.0,
  HIGH: 1.15,
  PEAK: 1.30,
} as const;
