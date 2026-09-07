import { NotFoundError } from '@stayflexi/shared-errors'
import type { IHousekeepingTaskRepository } from '../../domain/repositories/IHousekeepingTaskRepository'

export class AssignTask {
  constructor(private readonly taskRepo: IHousekeepingTaskRepository) {}

  async execute(id: string, assignedTo: string, organizationId: string) {
    const task = await this.taskRepo.findById(id)
    if (!task) throw new NotFoundError('Housekeeping task not found')
    if (!task.belongsToOrganization(organizationId))
      throw new NotFoundError('Housekeeping task not found')
    const updateData: Record<string, unknown> = { assignedTo }
    // Auto-transition PENDING -> ASSIGNED if needed
    if (task.taskStatus === 'PENDING') updateData['taskStatus'] = 'ASSIGNED'
    return this.taskRepo.update(
      id,
      updateData as Parameters<IHousekeepingTaskRepository['update']>[1],
    )
  }
}
