// FILE: src/modules/synchronization/queues/index.ts
export * from "./SyncQueue";
export * from "./RetryQueue";
export * from "./DeadLetterQueue";

import { InMemorySyncQueue } from "./SyncQueue";
import { InMemoryRetryQueue } from "./RetryQueue";
import { InMemoryDeadLetterQueue } from "./DeadLetterQueue";

export const syncQueue = new InMemorySyncQueue();
export const retryQueue = new InMemoryRetryQueue();
export const deadLetterQueue = new InMemoryDeadLetterQueue();
