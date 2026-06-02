import type { QueueJob } from "../types";
import { prisma } from "@lib/prisma";
import { type Prisma } from "@prisma/client";

export class DeadLetterStrategy {
  // Persists a dead-letter job to DB for durability and alerting.
  static async persist<T>(job: QueueJob<T>, queueName: string): Promise<void> {
    await prisma.eventQueueItem.create({
      data: {
        eventType: `dead_letter.${queueName}.${job.name}`,
        eventPayload: job.data as Prisma.InputJsonValue,
        queueStatus: "DEAD_LETTER",
        retryCount: job.attempts,
        failedReason: job.failedReason,
        source: queueName,
      },
    });
  }

  // Retrieves dead-letter items from DB for replay.
  static async getFromDb(queueName: string) {
    return prisma.eventQueueItem.findMany({
      where: { queueStatus: "DEAD_LETTER", source: queueName },
      orderBy: { createdAt: "asc" },
      take: 100,
    });
  }
}
