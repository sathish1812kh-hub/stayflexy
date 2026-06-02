export interface ScheduledJob {
  name: string;
  cronExpression?: string;   // future: cron support
  intervalMs?: number;       // current: interval-based
  handler: () => Promise<void>;
  enabled: boolean;
  lastRunAt: Date | null;
  nextRunAt: Date | null;
}
