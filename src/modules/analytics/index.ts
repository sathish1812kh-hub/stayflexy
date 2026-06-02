// FILE: src/modules/analytics/index.ts

// ─── Types ────────────────────────────────────────────────────────────────────
export type {
  SnapshotTypeType,
  AnalyticsSnapshot,
  CreateSnapshotData,
  SnapshotFilter,
  BookingAnalytics,
  PaymentAnalytics,
  OTAAnalytics,
  OperationsAnalytics,
} from "./types";

// ─── Constants ────────────────────────────────────────────────────────────────
export {
  ANALYTICS_ERRORS,
  DEFAULT_ANALYTICS_DAYS,
  MAX_DATE_RANGE_DAYS,
} from "./constants";

// ─── DTOs ─────────────────────────────────────────────────────────────────────
export {
  AnalyticsQueryDto,
  SnapshotFilterDto,
} from "./dto";
export type {
  AnalyticsQueryDtoType,
  SnapshotFilterDtoType,
} from "./dto";

// ─── Validators ───────────────────────────────────────────────────────────────
export {
  validateAnalyticsQuery,
  validateSnapshotFilter,
} from "./validators";

// ─── Repository ───────────────────────────────────────────────────────────────
export { PrismaAnalyticsSnapshotRepository } from "./repositories/PrismaAnalyticsSnapshotRepository";

// ─── Aggregators ──────────────────────────────────────────────────────────────
export {
  BookingAggregator,
  PaymentAggregator,
  OTAAggregator,
  OperationsAggregator,
} from "./aggregators";

// ─── Services ─────────────────────────────────────────────────────────────────
export { AnalyticsService } from "./services";

// ─── Container ───────────────────────────────────────────────────────────────
export { analyticsService } from "./container";
