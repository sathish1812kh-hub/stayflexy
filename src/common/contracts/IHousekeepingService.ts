import type { Nullable, PaginatedResult, PaginationParams } from "@shared-types";

export interface HousekeepingTaskSummary {
  id: string;
  roomId: string;
  assignedToId: Nullable<string>;
  status: string;
  priority: string;
  type: string;
  scheduledAt: Date;
}

export interface IHousekeepingService {
  getTasksByRoom(roomId: string, params: PaginationParams): Promise<PaginatedResult<HousekeepingTaskSummary>>;
  getPendingTasksForRoom(roomId: string): Promise<HousekeepingTaskSummary[]>;
  isRoomReadyForCheckIn(roomId: string): Promise<boolean>;
  scheduleCheckoutCleaning(roomId: string, checkoutDate: Date): Promise<void>;
}
