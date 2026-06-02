import type { OtaProvider } from '../entities/OtaProvider'

export interface CreateOtaProviderData {
  providerName: string
  providerCode: string
  description?: string
  webhookUrl?: string
  metadata?: unknown
}

export interface IOtaProviderRepository {
  findById(id: string): Promise<OtaProvider | null>
  findByCode(code: string): Promise<OtaProvider | null>
  findAll(status?: string): Promise<OtaProvider[]>
  create(data: CreateOtaProviderData): Promise<OtaProvider>
  update(id: string, data: Partial<CreateOtaProviderData>): Promise<OtaProvider>
  updateStatus(id: string, status: string): Promise<OtaProvider>
}
