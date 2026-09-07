import { NotFoundError } from '@stayflexi/shared-errors'
import type { IInventoryRepository } from '../../domain/repositories/IInventoryRepository'
import type { Logger } from '@stayflexi/shared-logger'

export class DeleteInventory {
  constructor(
    private readonly inventoryRepo: IInventoryRepository,
    private readonly logger: Logger,
  ) {}

  async execute(id: string): Promise<void> {
    const existing = await this.inventoryRepo.findById(id)
    if (!existing) throw new NotFoundError('Inventory not found')
    await this.inventoryRepo.delete(id)
    this.logger.info({ inventoryId: id }, 'Inventory deleted')
  }
}
