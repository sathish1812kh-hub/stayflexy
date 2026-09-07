import type {
  IHousekeepingTaskRepository,
  HousekeepingTaskFilter,
} from '../../domain/repositories/IHousekeepingTaskRepository'

export class ListTasks {
  constructor(private readonly taskRepo: IHousekeepingTaskRepository) {}
  async execute(organizationId: string, filter: HousekeepingTaskFilter) {
    return this.taskRepo.findMany(organizationId, filter)
  }
}
