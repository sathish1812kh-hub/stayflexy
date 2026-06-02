// FILE: src/modules/revenue/container.ts
import { PrismaRevenueMetricRepository } from "./repositories/PrismaRevenueMetricRepository";
import { RevenueService } from "./services/RevenueService";

const metricRepo = new PrismaRevenueMetricRepository();
export const revenueService = new RevenueService(metricRepo);
