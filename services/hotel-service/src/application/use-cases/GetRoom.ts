import { NotFoundError, ForbiddenError } from '@stayflexi/shared-errors'
import type { IRoomRepository } from '../../domain/repositories/IRoomRepository'
import type { RoomCache } from '../services/RoomCache'
import type { Room } from '../../domain/entities/Room'

export class GetRoom {
  constructor(
    private readonly roomRepo: IRoomRepository,
    private readonly cache: RoomCache
  ) {}

  async execute(id: string, requestingOrgId: string): Promise<Room> {
    const cached = await this.cache.get(id)
    if (cached) {
      if (!cached.belongsTo(requestingOrgId)) {
        throw new ForbiddenError('Access denied to this room', 'ROOM_ACCESS_DENIED')
      }
      return cached
    }

    const room = await this.roomRepo.findById(id)
    if (!room) {
      throw new NotFoundError('Room not found')
    }

    if (!room.belongsTo(requestingOrgId)) {
      throw new ForbiddenError('Access denied to this room', 'ROOM_ACCESS_DENIED')
    }

    await this.cache.set(room)
    return room
  }
}
