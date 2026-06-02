// FILE: src/modules/synchronization/strategies/SyncStrategyRegistry.ts
import type { ISyncStrategy } from "./SyncStrategy";
import { InventoryPushStrategy } from "./InventoryPushStrategy";
import { RatePushStrategy } from "./RatePushStrategy";
import { ReservationPullStrategy } from "./ReservationPullStrategy";
import { ReservationImportStrategy } from "./ReservationImportStrategy";
import { ReconciliationStrategy } from "./ReconciliationStrategy";

class SyncStrategyRegistry {
  private readonly strategies = new Map<string, ISyncStrategy>();

  constructor() {
    this.register(new InventoryPushStrategy());
    this.register(new RatePushStrategy());
    this.register(new ReservationPullStrategy());
    this.register(new ReservationImportStrategy());
    this.register(new ReconciliationStrategy());
  }

  private register(strategy: ISyncStrategy): void {
    this.strategies.set(strategy.syncType, strategy);
  }

  getStrategy(syncType: string): ISyncStrategy {
    const strategy = this.strategies.get(syncType);
    if (!strategy) throw new Error(`No strategy registered for sync type: ${syncType}`);
    return strategy;
  }

  getSupportedTypes(): string[] {
    return Array.from(this.strategies.keys());
  }
}

export const syncStrategyRegistry = new SyncStrategyRegistry();
