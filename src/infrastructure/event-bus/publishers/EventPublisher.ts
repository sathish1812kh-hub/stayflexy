import type { IEventBus, DomainEvent } from "../types";
import { prisma } from "@lib/prisma";
import { type Prisma } from "@prisma/client";

export class EventPublisher {
  constructor(private readonly bus: IEventBus) {}

  async publish<T>(
    eventData: Omit<DomainEvent<T>, "id" | "occurredAt">,
    persist = true
  ): Promise<void> {
    // Persist to DB for durability and replay
    if (persist) {
      await prisma.eventQueueItem.create({
        data: {
          eventType: eventData.eventType,
          eventPayload: eventData.payload as Prisma.InputJsonValue,
          organizationId: eventData.organizationId,
          source: eventData.source,
          queueStatus: "PROCESSING",
        },
      });
    }

    // Publish to in-memory bus
    await this.bus.publish(eventData);
  }
}
