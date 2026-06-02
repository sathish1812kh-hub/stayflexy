import type { OtaMapping } from '../entities/OtaMapping'

export interface CreateOtaMappingData {
  organizationId: string
  hotelId: string
  roomTypeId?: string
  providerId: string
  externalHotelId: string
  externalRoomTypeId?: string
  syncStatus?: string
  isActive?: boolean
  metadata?: unknown
}

export interface IOtaMappingRepository {
  findById(id: string): Promise<OtaMapping | null>
  findByHotelAndProvider(hotelId: string, providerId: string): Promise<OtaMapping[]>
  findByOrganization(organizationId: string, hotelId?: string): Promise<OtaMapping[]>
  findActiveForHotel(hotelId: string): Promise<OtaMapping[]>
  create(data: CreateOtaMappingData): Promise<OtaMapping>
  update(id: string, data: Partial<CreateOtaMappingData>): Promise<OtaMapping>
  deactivate(id: string): Promise<OtaMapping>
  updateSyncStatus(id: string, status: string): Promise<OtaMapping>
}
