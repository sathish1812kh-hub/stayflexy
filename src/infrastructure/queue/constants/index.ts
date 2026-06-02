import type { JobOptions, BackoffOptions } from "../types";

export const QUEUE_NAMES = {
  BOOKING: "booking",
  PAYMENT: "payment",
  INVENTORY_SYNC: "inventory-sync",
  OTA_SYNC: "ota-sync",
  NOTIFICATION: "notification",
  HOUSEKEEPING: "housekeeping",
  REPORT_GENERATION: "report-generation",
  DEAD_LETTER: "dead-letter",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export const DEFAULT_JOB_OPTIONS: Required<Pick<JobOptions, "attempts">> & {
  backoff: Required<BackoffOptions>;
} = {
  attempts: 3,
  backoff: { type: "exponential", delay: 1000 },
};

export const MAX_DEAD_LETTER_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
