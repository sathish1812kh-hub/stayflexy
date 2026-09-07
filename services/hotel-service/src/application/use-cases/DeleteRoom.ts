import { NotFoundError, ForbiddenError } from '@stayflexi/shared-errors'
import { HOTEL_EVENTS } from '@stayflexi/shared-events'
import type { IEventPublisher } from '@stayflexi/shared-events'
import type { IRoomRepository } from '../../domain/repositories/IRoomRepository'
import type { RoomCache } from '../services/RoomCache'
import type { Logger } from '@stayflexi/shared-logger'

export class DeleteRoom {
  constructor(
    private readonly roomRepo: IRoomRepository,
    private readonly cache: RoomCache,
    private readonly eventPublisher: IEventPublisher,
    private readonly logger: Logger,
  ) {}

  async execute(id: string, requestingOrgId: string, correlationId?: string): Promise<void> {
    const room = await this.roomRepo.findById(id)
    if (!room) throw new NotFoundError('Room not found')
    if ((room as any).organizationId && (room as any).organizationId !== requestingOrgId) {
      // fallback check using toJSON
      const json = (room as any).toJSON ? (room as any).toJSON() : room
      if (json.organizationId && json.organizationId !== requestingOrgId) {
        throw new ForbiddenError('Access denied to this room', 'ROOM_ACCESS_DENIED')
      }
    }
    await this.roomRepo.softDelete(id)
    await this.cache.invalidate(id)
    this.eventPublisher
      .publish('hotel.events', {
        eventType: HOTEL_EVENTS.ROOM_UPDATED,
        aggregateId: id,
        aggregateType: 'Room',
        organizationId: requestingOrgId,
        correlationId,
        payload: { roomId: id, deleted: true },
      })
      .catch((err: unknown) => this.logger.warn({ err }, 'Failed to publish room.deleted'))
    this.logger.info({ roomId: id, correlationId }, 'Room soft-deleted')
  }
}
