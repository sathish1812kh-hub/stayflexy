// FILE: src/modules/synchronization/container.ts
import { PrismaSyncJobRepository } from "./repositories/PrismaSyncJobRepository";
import { PrismaSyncEventRepository } from "./repositories/PrismaSyncEventRepository";
import { SyncJobService } from "./services/SyncJobService";

const syncJobRepo = new PrismaSyncJobRepository();
const syncEventRepo = new PrismaSyncEventRepository();

export const syncJobService = new SyncJobService(syncJobRepo, syncEventRepo);
