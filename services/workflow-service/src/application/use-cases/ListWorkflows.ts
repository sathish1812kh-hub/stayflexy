import { buildPaginationMeta } from '@stayflexi/shared-types'
import type { IWorkflowExecutionRepository } from '../../domain/repositories/IWorkflowExecutionRepository'
import type { WorkflowFilters } from '../../domain/repositories/IWorkflowExecutionRepository'
import type { WorkflowExecutionProps } from '../../domain/entities/WorkflowExecution'
import type { PaginationMeta } from '@stayflexi/shared-types'

export interface ListWorkflowsResult {
  data: WorkflowExecutionProps[]
  meta: PaginationMeta
}

export class ListWorkflows {
  constructor(
    private readonly executionRepo: IWorkflowExecutionRepository,
  ) {}

  async execute(
    organizationId: string,
    filters?: WorkflowFilters,
  ): Promise<ListWorkflowsResult> {
    const page = filters?.page ?? 1
    const limit = filters?.limit ?? 20

    const { data, total } = await this.executionRepo.findByOrganization(
      organizationId,
      { ...filters, page, limit },
    )

    const meta = buildPaginationMeta(total, page, limit)

    return {
      data: data.map(e => e.toJSON()),
      meta,
    }
  }
}
