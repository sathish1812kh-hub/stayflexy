import { RETENTION_DAYS } from "../constants";

export interface RetentionSchedule {
  category: string;
  retentionDays: number;
  deleteBefore: Date;
}

export class RetentionPolicy {
  static getSchedules(): RetentionSchedule[] {
    const now = new Date();
    return Object.entries(RETENTION_DAYS).map(([category, days]) => ({
      category,
      retentionDays: days,
      deleteBefore: new Date(now.getTime() - days * 24 * 60 * 60 * 1000),
    }));
  }

  static getDeleteBefore(category: keyof typeof RETENTION_DAYS): Date {
    const days = RETENTION_DAYS[category];
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  }

  static isExpired(createdAt: Date, category: keyof typeof RETENTION_DAYS): boolean {
    return createdAt < this.getDeleteBefore(category);
  }
}
