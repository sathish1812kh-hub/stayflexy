import type { Logger } from '@stayflexi/shared-logger'
import { BadRequestError } from '@stayflexi/shared-errors'
import type { IOtaAdapter } from './IOtaAdapter'
import { BookingComAdapter } from './BookingComAdapter'
import { AirbnbAdapter } from './AirbnbAdapter'
import { ExpediaAdapter } from './ExpediaAdapter'
import { AgodaAdapter } from './AgodaAdapter'
import { MakeMyTripAdapter } from './MakeMyTripAdapter'

export class AdapterFactory {
  private readonly adapters: Map<string, IOtaAdapter>

  constructor(logger: Logger) {
    this.adapters = new Map<string, IOtaAdapter>([
      ['BOOKING_COM', new BookingComAdapter(logger)],
      ['AIRBNB', new AirbnbAdapter(logger)],
      ['EXPEDIA', new ExpediaAdapter(logger)],
      ['AGODA', new AgodaAdapter(logger)],
      ['MAKE_MY_TRIP', new MakeMyTripAdapter(logger)],
    ])
  }

  getAdapter(providerCode: string): IOtaAdapter {
    const adapter = this.adapters.get(providerCode)
    if (!adapter) {
      throw new BadRequestError(
        `Unsupported OTA provider: ${providerCode}. Supported: ${this.getSupportedProviders().join(', ')}`,
      )
    }
    return adapter
  }

  getSupportedProviders(): string[] {
    return Array.from(this.adapters.keys())
  }

  hasAdapter(providerCode: string): boolean {
    return this.adapters.has(providerCode)
  }
}
