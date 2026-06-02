import { z } from "zod";

const JobStatusEnum = z.enum(["PENDING", "RUNNING", "COMPLETED", "FAILED", "CANCELLED", "DEAD_LETTER"]);

export const CreateJobDto = z.object({
  jobType: z.string().min(1).max(100),
  payload: z.record(z.unknown()).optional(),
  maxRetries: z.number().int().min(1).max(10).optional(),
  idempotencyKey: z.string().max(255).optional(),
  scheduledAt: z.string().optional(),
});
export type CreateJobDtoType = z.infer<typeof CreateJobDto>;

export const JobFilterDto = z.object({
  jobType: z.string().optional(),
  jobStatus: JobStatusEnum.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type JobFilterDtoType = z.infer<typeof JobFilterDto>;
