import { PrismaOTAProviderRepository } from "./repositories/PrismaOTAProviderRepository";
import { PrismaOTAMappingRepository } from "./repositories/PrismaOTAMappingRepository";
import { PrismaOTAReservationRepository } from "./repositories/PrismaOTAReservationRepository";
import { OTAProviderService } from "./services/OTAProviderService";
import { OTAMappingService } from "./services/OTAMappingService";
import { OTAReservationService } from "./services/OTAReservationService";

const providerRepo = new PrismaOTAProviderRepository();
const mappingRepo = new PrismaOTAMappingRepository();
const reservationRepo = new PrismaOTAReservationRepository();

export const otaProviderService = new OTAProviderService(providerRepo);
export const otaMappingService = new OTAMappingService(mappingRepo, providerRepo);
export const otaReservationService = new OTAReservationService(reservationRepo, providerRepo);
