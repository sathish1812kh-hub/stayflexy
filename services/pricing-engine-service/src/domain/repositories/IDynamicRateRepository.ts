import type { DynamicRate } from '../entities/DynamicRate'
import type { DynamicRateProps } from '../entities/DynamicRate'

export interface IDynamicRateRepository {
  findByRoomTypeAndDate(roomTypeId: string, inventoryDate: Date): Promise<DynamicRate | null>
  findByHotelAndDateRange(hotelId: string, from: Date, to: Date): Promise<DynamicRate[]>
  upsert(data: Omit<DynamicRateProps, 'id' | 'createdAt' | 'updatedAt'>): Promise<DynamicRate>
  batchUpsert(rates: Omit<DynamicRateProps, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<number>
  findDirtyRates(hotelId: string, since: Date): Promise<DynamicRate[]>
}
