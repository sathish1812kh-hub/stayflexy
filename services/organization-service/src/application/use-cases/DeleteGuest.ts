import type { IGuestRepository } from '../../domain/repositories/IGuestRepository'
import type { Logger } from '@stayflexi/shared-logger'
import { NotFoundError } from '@stayflexi/shared-errors'

export class DeleteGuest {
  constructor(
    private readonly guestRepo: IGuestRepository,
    private readonly logger: Logger,
  ) {}

  async execute(id: string, organizationId?: string | null): Promise<void> {
    await this.guestRepo.delete(id, organizationId)
    this.logger.info('Guest deleted (soft)', { guestId: id })
  }
}
