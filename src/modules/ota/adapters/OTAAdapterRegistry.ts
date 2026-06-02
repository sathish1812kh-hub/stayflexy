import type { BaseOTAAdapter } from "./BaseOTAAdapter";
import { BookingComAdapter } from "./BookingComAdapter";
import { AirbnbAdapter } from "./AirbnbAdapter";
import { ExpediaAdapter } from "./ExpediaAdapter";
import { AgodaAdapter } from "./AgodaAdapter";

class OTAAdapterRegistry {
  private readonly adapters = new Map<string, BaseOTAAdapter>();

  constructor() {
    this.register(new BookingComAdapter());
    this.register(new AirbnbAdapter());
    this.register(new ExpediaAdapter());
    this.register(new AgodaAdapter());
  }

  private register(adapter: BaseOTAAdapter): void {
    this.adapters.set(adapter.providerCode, adapter);
  }

  getAdapter(providerCode: string): BaseOTAAdapter {
    const adapter = this.adapters.get(providerCode);
    if (!adapter) throw new Error(`No adapter registered for provider: ${providerCode}`);
    return adapter;
  }

  getSupportedCodes(): string[] {
    return Array.from(this.adapters.keys());
  }
}

export const otaAdapterRegistry = new OTAAdapterRegistry();
