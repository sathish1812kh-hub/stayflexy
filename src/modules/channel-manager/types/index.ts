// Channel Manager orchestration types — high-level view across OTA + Sync modules

export interface ChannelSyncRequest {
  hotelId: string;
  providerId: string;
  syncType: string;
  payload?: Record<string, unknown>;
  maxRetries?: number;
}

export interface ChannelSyncResult {
  syncJobId: string;
  syncType: string;
  syncStatus: string;
  hotelId: string;
  providerId: string;
  enqueuedAt: Date;
}

export interface ChannelStatusSummary {
  hotelId: string;
  providerId: string;
  totalJobs: number;
  pendingJobs: number;
  runningJobs: number;
  successJobs: number;
  failedJobs: number;
  retryingJobs: number;
  lastSyncAt: Date | null;
}
