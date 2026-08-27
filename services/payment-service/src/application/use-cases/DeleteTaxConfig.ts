import type { ITaxConfigRepository } from '../../domain/repositories/ITaxConfigRepository'

export class DeleteTaxConfig {
  constructor(private readonly taxRepo: ITaxConfigRepository) {}

  async execute(id: string, organizationId: string): Promise<void> {
    await this.taxRepo.delete(id, organizationId)
  }
}
