export type { IDistributedLock, LockResult, LockEntry } from "./types";
export { LOCK_TTL, LOCK_ERRORS, LOCK_PREFIX } from "./constants";
export { InMemoryLockProvider } from "./providers/InMemoryLockProvider";
export { RedisLockProvider } from "./providers/RedisLockProvider";
export { withLock, LockAcquisitionError } from "./utils/withLock";

import { InMemoryLockProvider } from "./providers/InMemoryLockProvider";
export const lockProvider = new InMemoryLockProvider();
