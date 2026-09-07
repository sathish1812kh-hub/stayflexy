import { NotFoundError, BadRequestError } from '@stayflexi/shared-errors'
import type { IInventoryRepository } from '../../domain/repositories/IInventoryRepository'
import type { Inventory } from '../../domain/entities/Inventory'
import type { Logger } from '@stayflexi/shared-logger'

export interface UpdateInventoryDto {
  totalInventory?: number
  blockedInventory?: number
}

export class UpdateInventory {
  constructor(
    private readonly inventoryRepo: IInventoryRepository,
    private readonly logger: Logger,
  ) {}

  async execute(id: string, dto: UpdateInventoryDto, organizationId: string): Promise<Inventory> {
    const existing = await this.inventoryRepo.findById(id)
    if (!existing) throw new NotFoundError('Inventory not found')
    if (existing.organizationId !== organizationId)
      throw new BadRequestError('Organization mismatch')
    if (dto.totalInventory !== undefined && dto.totalInventory < 0)
      throw new BadRequestError('totalInventory must be >= 0')
    if (
      dto.totalInventory !== undefined &&
      existing.reservedCount + (dto.blockedInventory ?? existing.blockedCount) > dto.totalInventory
    ) {
      throw new BadRequestError('totalInventory cannot be less than reserved + blocked')
    }
    const updated = await this.inventoryRepo.update(id, dto as any)
    this.logger.info({ inventoryId: id, dto }, 'Inventory updated')
    return updated
  }
}
