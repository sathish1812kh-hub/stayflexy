import type {
  HousekeepingTask,
  HousekeepingTaskStatus,
  HousekeepingTaskType,
  HousekeepingPriority,
} from '../entities/HousekeepingTask'
import type { PaginatedResult } from '@stayflexi/shared-types'

export interface CreateHousekeepingTaskData {
  organizationId: string
  hotelId: string
  roomId: string
  assignedTo?: string | null
  taskType: HousekeepingTaskType
  priority?: HousekeepingPriority
  scheduledAt?: Date | null
  notes?: string | null
  createdById: string
}

export interface UpdateHousekeepingTaskData {
  taskStatus?: HousekeepingTaskStatus
  assignedTo?: string | null
  priority?: HousekeepingPriority
  notes?: string | null
  scheduledAt?: Date | null
  startedAt?: Date | null
  completedAt?: Date | null
}

export interface HousekeepingTaskFilter {
  hotelId?: string
  roomId?: string
  assignedTo?: string
  taskStatus?: HousekeepingTaskStatus
  priority?: HousekeepingPriority
  page: number
  limit: number
}

export interface IHousekeepingTaskRepository {
  findById(id: string): Promise<HousekeepingTask | null>
  create(data: CreateHousekeepingTaskData): Promise<HousekeepingTask>
  update(id: string, data: UpdateHousekeepingTaskData): Promise<HousekeepingTask>
  delete(id: string): Promise<void>
  findMany(
    organizationId: string,
    filter: HousekeepingTaskFilter,
  ): Promise<PaginatedResult<HousekeepingTask>>
}
