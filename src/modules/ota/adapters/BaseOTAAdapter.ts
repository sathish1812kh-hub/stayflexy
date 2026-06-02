export interface OTAInventoryPayload {
  externalHotelId: string;
  externalRoomTypeId: string;
  date: string;
  availableCount: number;
}

export interface OTARatePayload {
  externalHotelId: string;
  externalRoomTypeId: string;
  date: string;
  rate: number;
  currency: string;
}

export interface OTARawReservation {
  externalReservationId: string;
  externalHotelId: string;
  guestName: string;
  checkInDate: string;
  checkOutDate: string;
  roomCount: number;
  totalAmount: number;
  currency: string;
  rawPayload: Record<string, unknown>;
}

export abstract class BaseOTAAdapter {
  abstract readonly providerCode: string;

  abstract pushInventory(payload: OTAInventoryPayload[]): Promise<{ pushed: number; errors: string[] }>;

  abstract pushRates(payload: OTARatePayload[]): Promise<{ pushed: number; errors: string[] }>;

  abstract pullReservations(externalHotelId: string, since: Date): Promise<OTARawReservation[]>;

  abstract validateMapping(externalHotelId: string, externalRoomTypeId?: string): Promise<boolean>;
}
