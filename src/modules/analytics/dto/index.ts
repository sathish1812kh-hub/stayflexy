// FILE: src/modules/analytics/dto/index.ts
import { z } from "zod";

const isoDateString = z.string().refine(
  (val) => {
    const d = new Date(val);
    return !isNaN(d.getTime());
  },
  { message: "Invalid ISO date format" }
);

const SnapshotTypeEnum = z.enum([
  "DAILY_BOOKING",
  "WEEKLY_BOOKING",
  "MONTHLY_BOOKING",
  "PAYMENT_SUMMARY",
  "OTA_PERFORMANCE",
  "HOUSEKEEPING_PERFORMANCE",
  "OPERATIONAL_SUMMARY",
]);

// ─── AnalyticsQueryDto ────────────────────────────────────────────────────────

export const AnalyticsQueryDto = z
  .object({
    hotelId: z.string().uuid("Invalid hotel ID"),
    startDate: isoDateString,
    endDate: isoDateString,
  })
  .refine(
    (data) => new Date(data.endDate) >= new Date(data.startDate),
    { message: "End date must be after or equal to start date", path: ["endDate"] }
  )
  .refine(
    (data) => {
      const diff =
        (new Date(data.endDate).getTime() - new Date(data.startDate).getTime()) /
        (1000 * 60 * 60 * 24);
      return diff <= 365;
    },
    { message: "Date range cannot exceed 365 days", path: ["endDate"] }
  );

// ─── SnapshotFilterDto ────────────────────────────────────────────────────────

export const SnapshotFilterDto = z.object({
  hotelId: z.string().uuid("Invalid hotel ID"),
  snapshotType: SnapshotTypeEnum.optional(),
  startDate: isoDateString.optional(),
  endDate: isoDateString.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ─── Inferred types ───────────────────────────────────────────────────────────

export type AnalyticsQueryDtoType = z.infer<typeof AnalyticsQueryDto>;
export type SnapshotFilterDtoType = z.infer<typeof SnapshotFilterDto>;
