import { NotFoundError, ForbiddenError } from '@stayflexi/shared-errors'
import type { IRoomTypeRepository } from '../../domain/repositories/IRoomTypeRepository'
import type { RoomTypeCache } from '../services/RoomTypeCache'
import type { RoomType } from '../../domain/entities/RoomType'

export class GetRoomType {
  constructor(
    private readonly roomTypeRepo: IRoomTypeRepository,
    private readonly cache: RoomTypeCache
  ) {}

  async execute(id: string, requestingOrgId: string): Promise<RoomType> {
    const cached = await this.cache.get(id)
    if (cached) {
      if (!cached.belongsTo(requestingOrgId)) {
        throw new ForbiddenError('Access denied to this room type', 'ROOM_TYPE_ACCESS_DENIED')
      }
      return cached
    }

    const roomType = await this.roomTypeRepo.findById(id)
    if (!roomType) {
      throw new NotFoundError('Room type not found')
    }

    if (!roomType.belongsTo(requestingOrgId)) {
      throw new ForbiddenError('Access denied to this room type', 'ROOM_TYPE_ACCESS_DENIED')
    }

    await this.cache.set(roomType)
    return roomType
  }
}
