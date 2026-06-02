import { BaseOTAAdapter, type OTAInventoryPayload, type OTARatePayload, type OTARawReservation } from "./BaseOTAAdapter";

export class ExpediaAdapter extends BaseOTAAdapter {
  readonly providerCode = "EXPEDIA";

  async pushInventory(payload: OTAInventoryPayload[]): Promise<{ pushed: number; errors: string[] }> {
    return { pushed: payload.length, errors: [] };
  }

  async pushRates(payload: OTARatePayload[]): Promise<{ pushed: number; errors: string[] }> {
    return { pushed: payload.length, errors: [] };
  }

  async pullReservations(_externalHotelId: string, _since: Date): Promise<OTARawReservation[]> {
    return [];
  }

  async validateMapping(_externalHotelId: string, _externalRoomTypeId?: string): Promise<boolean> {
    return true;
  }
}
