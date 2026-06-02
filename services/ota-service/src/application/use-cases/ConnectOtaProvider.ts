import { ConflictError, NotFoundError } from '@stayflexi/shared-errors'
import type { IOtaProviderRepository } from '../../domain/repositories/IOtaProviderRepository'
import type { IOtaMappingRepository } from '../../domain/repositories/IOtaMappingRepository'
import type { OtaMapping } from '../../domain/entities/OtaMapping'
import type { OtaEventPublisher } from '../../infrastructure/events/OtaEventPublisher'
import type { ConnectOtaDto } from '../dtos/ota.dto'
import type { Logger } from '@stayflexi/shared-logger'

export class ConnectOtaProvider {
  constructor(
    private readonly providerRepo: IOtaProviderRepository,
    private readonly mappingRepo: IOtaMappingRepository,
    private readonly eventPublisher: OtaEventPublisher,
    private readonly logger: Logger,
  ) {}

  async execute(
    dto: ConnectOtaDto,
    organizationId: string,
    _userId: string,
    correlationId?: string,
  ): Promise<OtaMapping> {
    const provider = await this.providerRepo.findById(dto.providerId)
    if (!provider) {
      throw new NotFoundError(`OTA provider not found: ${dto.providerId}`)
    }
    if (!provider.isActive()) {
      throw new ConflictError(`OTA provider is not active: ${provider.providerCode}`)
    }

    // Check for duplicate mapping
    const existing = await this.mappingRepo.findByHotelAndProvider(dto.hotelId, dto.providerId)
    const duplicateMapping = existing.find(
      m => m.externalHotelId === dto.externalHotelId && m.isActive,
    )
    if (duplicateMapping) {
      throw new ConflictError(
        `OTA mapping already exists for hotel ${dto.hotelId} with provider ${provider.providerCode} and external hotel ${dto.externalHotelId}`,
      )
    }

    const mapping = await this.mappingRepo.create({
      organizationId,
      hotelId: dto.hotelId,
      providerId: dto.providerId,
      externalHotelId: dto.externalHotelId,
      syncStatus: 'PENDING',
      isActive: true,
      metadata: dto.metadata,
    })

    this.logger.info(
      {
        mappingId: mapping.id,
        hotelId: dto.hotelId,
        providerCode: provider.providerCode,
        organizationId,
        correlationId,
      },
      'OTA connection created',
    )

    this.eventPublisher.publishConnectionCreated({
      mappingId: mapping.id,
      organizationId,
      hotelId: dto.hotelId,
      providerCode: provider.providerCode,
      correlationId,
    })

    return mapping
  }
}
