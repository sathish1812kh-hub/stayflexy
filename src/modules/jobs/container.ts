import { PrismaBackgroundJobRepository } from "./repositories/PrismaBackgroundJobRepository";
import { JobService } from "./services/JobService";

const jobRepo = new PrismaBackgroundJobRepository();
export const jobService = new JobService(jobRepo);
