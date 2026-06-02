import type { IEventBus, DomainEvent, EventHandler } from "./types";

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export class InMemoryEventBus implements IEventBus {
  private readonly handlers = new Map<string, Set<EventHandler>>();

  subscribe<T>(eventType: string, handler: EventHandler<T>): void {
    const set = this.handlers.get(eventType) ?? new Set<EventHandler>();
    set.add(handler as EventHandler);
    this.handlers.set(eventType, set);
  }

  unsubscribe(eventType: string, handler: EventHandler): void {
    this.handlers.get(eventType)?.delete(handler);
  }

  async publish<T>(eventData: Omit<DomainEvent<T>, "id" | "occurredAt">): Promise<void> {
    const event: DomainEvent<T> = {
      ...eventData,
      id: generateId(),
      occurredAt: new Date(),
    };

    const handlers = this.handlers.get(event.eventType);
    if (!handlers || handlers.size === 0) return;

    // Fan-out to all subscribers; errors in one handler don't block others
    await Promise.allSettled(
      Array.from(handlers).map((handler) => (handler as EventHandler<T>)(event))
    );
  }

  getHandlerCount(eventType: string): number {
    return this.handlers.get(eventType)?.size ?? 0;
  }
}
