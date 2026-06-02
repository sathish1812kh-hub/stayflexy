import type { InventoryReservation } from '../entities/InventoryReservation'

export interface IInventoryReservationRepository {
  findByBookingRef(bookingRef: string, organizationId: string): Promise<InventoryReservation[]>
  /** Decrement reservedCount on each inventory, mark reservations RELEASED. Returns count released. */
  releaseByBookingRef(bookingRef: string, organizationId: string): Promise<number>
  countActiveByBookingRef(bookingRef: string): Promise<number>
}
