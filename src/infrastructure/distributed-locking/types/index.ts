export interface IDistributedLock {
  acquire(key: string, ttlMs: number, owner: string): Promise<LockResult>;
  release(key: string, owner: string): Promise<boolean>;
  extend(key: string, additionalMs: number, owner: string): Promise<boolean>;
  isLocked(key: string): Promise<boolean>;
  getLockOwner(key: string): Promise<string | null>;
}

export interface LockResult {
  acquired: boolean;
  key: string;
  owner: string;
  expiresAt: Date | null;
}

export interface LockEntry {
  owner: string;
  expiresAt: number; // epoch ms
}
