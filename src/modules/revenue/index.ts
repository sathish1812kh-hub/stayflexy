// FILE: src/modules/revenue/index.ts

// ─── Types ────────────────────────────────────────────────────────────────────
export type {
  RevenueMetric,
  CreateRevenueMetricData,
  UpdateRevenueMetricData,
  RevenueMetricFilter,
  OccupancyResult,
  ForecastPeriod,
  RevenueForecast,
  SnapshotTypeType,
} from "./types";

// ─── Constants ────────────────────────────────────────────────────────────────
export {
  REVENUE_ERRORS,
  FORECAST_METHODOLOGY,
  MAX_FORECAST_DAYS,
  DEFAULT_CONFIDENCE,
} from "./constants";

// ─── DTOs ─────────────────────────────────────────────────────────────────────
export {
  RevenueMetricFilterDto,
  OccupancyQueryDto,
  ForecastQueryDto,
} from "./dto";
export type {
  RevenueMetricFilterDtoType,
  OccupancyQueryDtoType,
  ForecastQueryDtoType,
} from "./dto";

// ─── Validators ───────────────────────────────────────────────────────────────
export {
  validateRevenueMetricFilter,
  validateOccupancyQuery,
  validateForecastQuery,
} from "./validators";

// ─── Repository ───────────────────────────────────────────────────────────────
export { PrismaRevenueMetricRepository } from "./repositories/PrismaRevenueMetricRepository";

// ─── Calculators ──────────────────────────────────────────────────────────────
export { RevenueCalculator } from "./calculators";

// ─── Services ─────────────────────────────────────────────────────────────────
export { RevenueService } from "./services";

// ─── Container ───────────────────────────────────────────────────────────────
export { revenueService } from "./container";
