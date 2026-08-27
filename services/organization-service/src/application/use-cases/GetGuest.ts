import type { IGuestRepository } from '../../domain/repositories/IGuestRepository'
import type { Guest } from '../../domain/entities/Guest'
import type { Logger } from '@stayflexi/shared-logger'
import { NotFoundError } from '@stayflexi/shared-errors'

export class GetGuest {
  constructor(
    private readonly guestRepo: IGuestRepository,
    private readonly logger: Logger,
  ) {}

  async execute(id: string, organizationId?: string | null): Promise<Guest> {
    const guest = await this.guestRepo.findById(id, organizationId)
    if (!guest) throw new NotFoundError('Guest not found')
    return guest
  }
}
