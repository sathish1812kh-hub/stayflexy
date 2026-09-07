import { NotFoundError, ForbiddenError } from '@stayflexi/shared-errors'
import { HOTEL_EVENTS } from '@stayflexi/shared-events'
import type { IEventPublisher } from '@stayflexi/shared-events'
import type { IRoomTypeRepository } from '../../domain/repositories/IRoomTypeRepository'
import type { RoomTypeCache } from '../services/RoomTypeCache'
import type { Logger } from '@stayflexi/shared-logger'

export class DeleteRoomType {
  constructor(
    private readonly roomTypeRepo: IRoomTypeRepository,
    private readonly cache: RoomTypeCache,
    private readonly eventPublisher: IEventPublisher,
    private readonly logger: Logger,
  ) {}

  async execute(id: string, requestingOrgId: string, correlationId?: string): Promise<void> {
    const roomType = await this.roomTypeRepo.findById(id)
    if (!roomType) throw new NotFoundError('Room type not found')
    if (!roomType.belongsTo(requestingOrgId)) {
      throw new ForbiddenError('Access denied to this room type', 'ROOM_TYPE_ACCESS_DENIED')
    }
    await this.roomTypeRepo.softDelete(id)
    await this.cache.invalidate(id)
    this.eventPublisher
      .publish('hotel.events', {
        eventType: HOTEL_EVENTS.ROOM_TYPE_UPDATED,
        aggregateId: id,
        aggregateType: 'RoomType',
        organizationId: requestingOrgId,
        correlationId,
        payload: { roomTypeId: id, deleted: true },
      })
      .catch((err: unknown) => this.logger.warn({ err }, 'Failed to publish room_type.deleted'))
    this.logger.info({ roomTypeId: id, correlationId }, 'Room type soft-deleted')
  }
}
