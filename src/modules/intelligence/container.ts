import { PrismaOperationalInsightRepository } from "./repositories/PrismaOperationalInsightRepository";
import { PrismaAnomalyDetectionRepository } from "./repositories/PrismaAnomalyDetectionRepository";
import { IntelligenceService } from "./services/IntelligenceService";

const insightRepo = new PrismaOperationalInsightRepository();
const anomalyRepo = new PrismaAnomalyDetectionRepository();
export const intelligenceService = new IntelligenceService(insightRepo, anomalyRepo);
