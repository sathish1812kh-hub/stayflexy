import type { IHousekeepingTaskRepository } from '../../domain/repositories/IHousekeepingTaskRepository'
import type { HousekeepingTask } from '../../domain/entities/HousekeepingTask'
import type { CreateHousekeepingTaskDto } from '../dtos/housekeeping.dto'

export class CreateHousekeepingTask {
  constructor(private readonly taskRepo: IHousekeepingTaskRepository) {}

  async execute(
    dto: CreateHousekeepingTaskDto,
    organizationId: string,
    userId: string,
  ): Promise<HousekeepingTask> {
    return this.taskRepo.create({
      organizationId,
      hotelId: dto.hotelId,
      roomId: dto.roomId,
      assignedTo: dto.assignedTo ?? null,
      taskType: dto.taskType,
      priority: dto.priority ?? 'NORMAL',
      scheduledAt: (dto as unknown as { scheduledAt: Date | null }).scheduledAt ?? null,
      notes: dto.notes ?? null,
      createdById: userId,
    })
  }
}
