import { getPrismaClient, Prisma } from '@stayflexi/shared-database'
import { fromPrismaError } from '@stayflexi/shared-errors'
import type { PrismaClient, OTAProviderStatus } from '@prisma/client'
import { OtaProvider } from '../../domain/entities/OtaProvider'
import type { OtaProviderProps } from '../../domain/entities/OtaProvider'
import type {
  IOtaProviderRepository,
  CreateOtaProviderData,
} from '../../domain/repositories/IOtaProviderRepository'

type PrismaOTAProvider = {
  id: string
  providerName: string
  providerCode: string
  status: string
  description: string | null
  webhookUrl: string | null
  metadata: unknown
  createdAt: Date
  updatedAt: Date
}

function mapToEntity(r: PrismaOTAProvider): OtaProvider {
  const props: OtaProviderProps = {
    id: r.id,
    providerCode: r.providerCode,
    providerName: r.providerName,
    status: r.status as OtaProviderProps['status'],
    description: r.description,
    webhookUrl: r.webhookUrl,
    metadata: r.metadata,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }
  return new OtaProvider(props)
}

export class PrismaOtaProviderRepository implements IOtaProviderRepository {
  constructor(private readonly db: PrismaClient = getPrismaClient()) {}

  async findById(id: string): Promise<OtaProvider | null> {
    try {
      const r = await this.db.oTAProvider.findUnique({ where: { id } })
      return r ? mapToEntity(r) : null
    } catch (err) {
      const e = fromPrismaError(err)
      if (e) throw e
      throw err
    }
  }

  async findByCode(code: string): Promise<OtaProvider | null> {
    try {
      const r = await this.db.oTAProvider.findUnique({ where: { providerCode: code } })
      return r ? mapToEntity(r) : null
    } catch (err) {
      const e = fromPrismaError(err)
      if (e) throw e
      throw err
    }
  }

  async findAll(status?: string): Promise<OtaProvider[]> {
    try {
      const records = await this.db.oTAProvider.findMany({
        where: status !== undefined ? { status: status as OTAProviderStatus } : undefined,
        orderBy: { providerName: 'asc' },
      })
      return records.map(mapToEntity)
    } catch (err) {
      const e = fromPrismaError(err)
      if (e) throw e
      throw err
    }
  }

  async create(data: CreateOtaProviderData): Promise<OtaProvider> {
    try {
      const r = await this.db.oTAProvider.create({
        data: {
          providerName: data.providerName,
          providerCode: data.providerCode,
          description: data.description ?? null,
          webhookUrl: data.webhookUrl ?? null,
          metadata: data.metadata !== undefined ? (data.metadata as Prisma.InputJsonValue) : undefined,
        },
      })
      return mapToEntity(r)
    } catch (err) {
      const e = fromPrismaError(err)
      if (e) throw e
      throw err
    }
  }

  async update(id: string, data: Partial<CreateOtaProviderData>): Promise<OtaProvider> {
    try {
      const r = await this.db.oTAProvider.update({
        where: { id },
        data: {
          ...(data.providerName !== undefined && { providerName: data.providerName }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.webhookUrl !== undefined && { webhookUrl: data.webhookUrl }),
          ...(data.metadata !== undefined && {
            metadata: data.metadata as Prisma.InputJsonValue,
          }),
        },
      })
      return mapToEntity(r)
    } catch (err) {
      const e = fromPrismaError(err)
      if (e) throw e
      throw err
    }
  }

  async updateStatus(id: string, status: string): Promise<OtaProvider> {
    try {
      const r = await this.db.oTAProvider.update({
        where: { id },
        data: { status: status as OTAProviderStatus },
      })
      return mapToEntity(r)
    } catch (err) {
      const e = fromPrismaError(err)
      if (e) throw e
      throw err
    }
  }
}
