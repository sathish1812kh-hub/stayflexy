import { PrismaUserSessionRepository } from "./repositories/PrismaUserSessionRepository";
import { PrismaSecurityEventRepository } from "./repositories/PrismaSecurityEventRepository";
import { UserSessionService } from "./services/UserSessionService";
import { SecurityEventService } from "./services/SecurityEventService";

const sessionRepo = new PrismaUserSessionRepository();
const eventRepo = new PrismaSecurityEventRepository();
export const userSessionService = new UserSessionService(sessionRepo, eventRepo);
export const securityEventService = new SecurityEventService(eventRepo);
