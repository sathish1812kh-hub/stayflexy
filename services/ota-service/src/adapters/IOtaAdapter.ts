export interface RoomAvailability {
  externalRoomTypeId: string
  date: string
  available: number
  totalRooms: number
}

export interface InventoryPushRequest {
  hotelId: string
  externalHotelId: string
  organizationId: string
  rooms: RoomAvailability[]
  dateFrom: string
  dateTo: string
  correlationId?: string
}

export interface InventoryPushResponse {
  success: boolean
  recordsProcessed: number
  recordsFailed: number
  errors: string[]
}

export interface RoomRate {
  externalRoomTypeId: string
  date: string
  rateAmount: number
  currency: string
  ratePlanId?: string
}

export interface RatePushRequest {
  hotelId: string
  externalHotelId: string
  organizationId: string
  rates: RoomRate[]
  dateFrom: string
  dateTo: string
}

export interface RatePushResponse {
  success: boolean
  recordsProcessed: number
  recordsFailed: number
  errors: string[]
}

export interface ReservationPullRequest {
  hotelId: string
  externalHotelId: string
  organizationId: string
  dateFrom: string
  dateTo: string
  correlationId?: string
}

export interface ExternalReservation {
  externalReservationId: string
  guestName: string
  guestEmail?: string
  checkInDate: string
  checkOutDate: string
  roomTypeId?: string
  totalAmount: number
  currency: string
  status: string
  rawPayload: Record<string, unknown>
}

export interface ReservationPullResponse {
  success: boolean
  reservations: ExternalReservation[]
  errors: string[]
}

export interface NormalizedWebhookPayload {
  eventType: string
  externalReservationId?: string
  hotelId?: string
  rawPayload: unknown
}

export interface IOtaAdapter {
  readonly providerCode: string
  pushInventory(request: InventoryPushRequest): Promise<InventoryPushResponse>
  pushRates(request: RatePushRequest): Promise<RatePushResponse>
  pullReservations(request: ReservationPullRequest): Promise<ReservationPullResponse>
  validateCredentials(credentials: Record<string, string>): Promise<boolean>
  normalizeWebhookPayload(rawPayload: unknown): NormalizedWebhookPayload
}
