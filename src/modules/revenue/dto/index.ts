// FILE: src/modules/revenue/dto/index.ts
import { z } from "zod";

const isoDateString = z.string().refine(
  (val) => {
    const d = new Date(val);
    return !isNaN(d.getTime());
  },
  { message: "Invalid ISO date format" }
);

// ─── RevenueMetricFilterDto ───────────────────────────────────────────────────

export const RevenueMetricFilterDto = z
  .object({
    hotelId: z.string().uuid("Invalid hotel ID"),
    startDate: isoDateString,
    endDate: isoDateString,
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(365).default(30),
  })
  .refine(
    (data) => new Date(data.endDate) >= new Date(data.startDate),
    { message: "End date must be after or equal to start date", path: ["endDate"] }
  );

// ─── OccupancyQueryDto ────────────────────────────────────────────────────────

export const OccupancyQueryDto = z.object({
  hotelId: z.string().uuid("Invalid hotel ID"),
  date: isoDateString,
});

// ─── ForecastQueryDto ─────────────────────────────────────────────────────────

export const ForecastQueryDto = z.object({
  hotelId: z.string().uuid("Invalid hotel ID"),
  forecastDays: z.coerce.number().int().min(1).max(90).default(30),
});

// ─── Inferred types ───────────────────────────────────────────────────────────

export type RevenueMetricFilterDtoType = z.infer<typeof RevenueMetricFilterDto>;
export type OccupancyQueryDtoType = z.infer<typeof OccupancyQueryDto>;
export type ForecastQueryDtoType = z.infer<typeof ForecastQueryDto>;
