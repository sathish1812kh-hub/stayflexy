import { NotFoundError, BadRequestError } from '@stayflexi/shared-errors'
import type { IHousekeepingTaskRepository } from '../../domain/repositories/IHousekeepingTaskRepository'
import type { HousekeepingTaskStatus } from '../../domain/entities/HousekeepingTask'

export class UpdateTaskStatus {
  constructor(private readonly taskRepo: IHousekeepingTaskRepository) {}

  async execute(
    id: string,
    status: HousekeepingTaskStatus,
    organizationId: string,
  ): Promise<ReturnType<IHousekeepingTaskRepository['update']>> {
    const task = await this.taskRepo.findById(id)
    if (!task) throw new NotFoundError('Housekeeping task not found')
    if (!task.belongsToOrganization(organizationId))
      throw new NotFoundError('Housekeeping task not found')
    if (!task.canTransitionTo(status)) {
      throw new BadRequestError(`Cannot transition from ${task.taskStatus} to ${status}`)
    }
    const data: Record<string, unknown> = { taskStatus: status }
    if (status === 'IN_PROGRESS') data['startedAt'] = new Date()
    if (status === 'COMPLETED' || status === 'VERIFIED') data['completedAt'] = new Date()
    return this.taskRepo.update(id, data as Parameters<IHousekeepingTaskRepository['update']>[1])
  }
}
