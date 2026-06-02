import type { OtaReservation } from '../entities/OtaReservation'

export interface ReservationFilters {
  providerId?: string
  syncStatus?: string
  page?: number
  limit?: number
}

export interface CreateOtaReservationData {
  organizationId: string
  hotelId: string
  providerId: string
  externalReservationId: string
  rawPayload: unknown
  syncStatus?: string
}

export interface UpdateReservationData {
  bookingId?: string
  importedAt?: Date
  errorMessage?: string
}

export interface IOtaReservationRepository {
  findById(id: string): Promise<OtaReservation | null>
  findByExternalId(providerId: string, externalId: string): Promise<OtaReservation | null>
  findByHotel(hotelId: string, filters?: ReservationFilters): Promise<{ data: OtaReservation[]; total: number }>
  findPendingForHotel(hotelId: string): Promise<OtaReservation[]>
  create(data: CreateOtaReservationData): Promise<OtaReservation>
  updateStatus(id: string, status: string, data?: UpdateReservationData): Promise<OtaReservation>
}
