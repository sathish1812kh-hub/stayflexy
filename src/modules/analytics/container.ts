// FILE: src/modules/analytics/container.ts
import { PrismaAnalyticsSnapshotRepository } from "./repositories/PrismaAnalyticsSnapshotRepository";
import { AnalyticsService } from "./services/AnalyticsService";

const snapshotRepo = new PrismaAnalyticsSnapshotRepository();
export const analyticsService = new AnalyticsService(snapshotRepo);
