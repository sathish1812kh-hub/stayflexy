import type { IFeeConfigRepository } from '../../domain/repositories/IFeeConfigRepository'
export class DeleteFeeConfig {
  constructor(private readonly feeRepo: IFeeConfigRepository) {}
  async execute(id: string, organizationId: string): Promise<void> {
    await this.feeRepo.delete(id, organizationId)
  }
}
